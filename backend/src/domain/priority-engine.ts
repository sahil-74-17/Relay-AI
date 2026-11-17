import { PRIORITY_ORDER } from "../config/constants";
import type { Priority, Sentiment } from "../generated/prisma/enums";

/** Everything a rule may look at. Rules never touch the database. */
export interface PriorityContext {
  text: string;
  mlPriority: Priority;
  mlPriorityConfidence: number;
  sentiment: Sentiment;
  sentimentCompound: number;
  recentSimilarCount: number;
}

export interface RuleOutcome {
  priority: Priority;
  reason: string;
}

export interface PriorityRule {
  readonly name: string;
  apply(ctx: PriorityContext, current: Priority): RuleOutcome | null;
}

export interface PriorityTraceStep {
  rule: string;
  from: Priority;
  to: Priority;
  reason: string;
}

export interface PriorityDecision {
  base: Priority;
  final: Priority;
  trace: PriorityTraceStep[];
}

const rank = (p: Priority) => PRIORITY_ORDER.indexOf(p);
const atLeast = (current: Priority, floor: Priority): Priority => (rank(current) >= rank(floor) ? current : floor);
/** Raise one level, up to `cap`. Never lowers a priority that is already above the cap. */
const bump = (p: Priority, cap: Priority = "CRITICAL"): Priority =>
  rank(p) >= rank(cap) ? p : PRIORITY_ORDER[rank(p) + 1];

/** Safety net: certain phrases must never be under-prioritised, regardless of the model. */
export class CriticalKeywordRule implements PriorityRule {
  readonly name = "critical-keywords";
  private static readonly CRITICAL = /\b(security breach|hacked|data (loss|leak)|unauthori[sz]ed (access|charges?)|fraud)\b/i;
  private static readonly HIGH = /\b(outage|production (is )?down|(site|service|app) (is )?down|all (users|customers)|nobody can)\b/i;

  apply(ctx: PriorityContext, current: Priority): RuleOutcome | null {
    const critical = ctx.text.match(CriticalKeywordRule.CRITICAL);
    if (critical && rank(current) < rank("CRITICAL")) {
      return { priority: "CRITICAL", reason: `Mentions "${critical[0].toLowerCase()}"` };
    }
    const high = ctx.text.match(CriticalKeywordRule.HIGH);
    if (high && rank(current) < rank("HIGH")) {
      return { priority: atLeast(current, "HIGH"), reason: `Mentions "${high[0].toLowerCase()}"` };
    }
    return null;
  }
}

/** Strongly negative customers get one level of escalation, but sentiment alone never makes a ticket CRITICAL. */
export class NegativeSentimentRule implements PriorityRule {
  readonly name = "negative-sentiment";
  constructor(private readonly threshold = -0.5) {}

  apply(ctx: PriorityContext, current: Priority): RuleOutcome | null {
    if (ctx.sentiment !== "NEGATIVE" || ctx.sentimentCompound > this.threshold) return null;
    const next = bump(current, "HIGH");
    return next === current ? null : { priority: next, reason: "Customer is strongly frustrated" };
  }
}

/** Several similar open tickets recently means a wider problem: escalate one level. */
export class RepeatedIssueRule implements PriorityRule {
  readonly name = "repeated-issue";
  constructor(private readonly minSimilar = 3) {}

  apply(ctx: PriorityContext, current: Priority): RuleOutcome | null {
    if (ctx.recentSimilarCount < this.minSimilar) return null;
    const next = bump(current);
    return next === current
      ? null
      : { priority: next, reason: `${ctx.recentSimilarCount} similar tickets reported in the last 24h` };
  }
}

/**
 * Hybrid priority: start from the ML prediction, then apply business rules in
 * order. New rules can be added without changing this class (Open/Closed).
 */
export class PriorityEngine {
  constructor(private readonly rules: PriorityRule[]) {}

  evaluate(ctx: PriorityContext): PriorityDecision {
    const trace: PriorityTraceStep[] = [];
    let current = ctx.mlPriority;
    for (const rule of this.rules) {
      const outcome = rule.apply(ctx, current);
      // Rules may only escalate; a buggy rule can never silently downgrade a ticket.
      if (outcome && rank(outcome.priority) > rank(current)) {
        trace.push({ rule: rule.name, from: current, to: outcome.priority, reason: outcome.reason });
        current = outcome.priority;
      }
    }
    return { base: ctx.mlPriority, final: current, trace };
  }
}

export const defaultPriorityEngine = () =>
  new PriorityEngine([new CriticalKeywordRule(), new NegativeSentimentRule(), new RepeatedIssueRule()]);
