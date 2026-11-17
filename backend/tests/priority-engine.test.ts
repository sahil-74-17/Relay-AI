import { describe, expect, it } from "vitest";
import { type PriorityContext, defaultPriorityEngine } from "../src/domain/priority-engine";

const ctx = (o: Partial<PriorityContext> = {}): PriorityContext => ({
  text: "My invoice is wrong", mlPriority: "MEDIUM", mlPriorityConfidence: 0.8,
  sentiment: "NEUTRAL", sentimentCompound: 0, recentSimilarCount: 0, ...o,
});
const engine = defaultPriorityEngine();

describe("PriorityEngine (hybrid ML + business rules)", () => {
  it("keeps the ML prediction when no rule applies", () => {
    const d = engine.evaluate(ctx());
    expect(d.final).toBe("MEDIUM");
    expect(d.trace).toEqual([]);
  });

  it("forces CRITICAL for security keywords regardless of the model", () => {
    const d = engine.evaluate(ctx({ text: "I think my account was hacked", mlPriority: "LOW" }));
    expect(d.final).toBe("CRITICAL");
    expect(d.trace[0].rule).toBe("critical-keywords");
  });

  it("raises outages to at least HIGH", () => {
    expect(engine.evaluate(ctx({ text: "Production is down for us" })).final).toBe("HIGH");
  });

  it("escalates strongly negative sentiment by one level, capped at HIGH", () => {
    expect(engine.evaluate(ctx({ sentiment: "NEGATIVE", sentimentCompound: -0.8 })).final).toBe("HIGH");
    expect(engine.evaluate(ctx({ mlPriority: "HIGH", sentiment: "NEGATIVE", sentimentCompound: -0.9 })).final).toBe("HIGH");
  });

  it("ignores mildly negative sentiment", () => {
    expect(engine.evaluate(ctx({ sentiment: "NEGATIVE", sentimentCompound: -0.2 })).final).toBe("MEDIUM");
  });

  it("escalates repeated issues", () => {
    const d = engine.evaluate(ctx({ recentSimilarCount: 4 }));
    expect(d.final).toBe("HIGH");
    expect(d.trace[0].reason).toContain("4 similar");
  });

  it("chains rules and records each step", () => {
    const d = engine.evaluate(ctx({ sentiment: "NEGATIVE", sentimentCompound: -0.9, recentSimilarCount: 5 }));
    expect(d.trace.map((t) => t.rule)).toEqual(["negative-sentiment", "repeated-issue"]);
    expect(d.final).toBe("CRITICAL");
  });

  it("never lowers a priority (regression: sentiment rule once downgraded CRITICAL)", () => {
    for (const mlPriority of ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const) {
      const d = engine.evaluate(ctx({ mlPriority, sentiment: "NEGATIVE", sentimentCompound: -1, recentSimilarCount: 10 }));
      const order = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
      expect(order.indexOf(d.final)).toBeGreaterThanOrEqual(order.indexOf(mlPriority));
      for (const step of d.trace) expect(order.indexOf(step.to)).toBeGreaterThan(order.indexOf(step.from));
    }
  });
});
