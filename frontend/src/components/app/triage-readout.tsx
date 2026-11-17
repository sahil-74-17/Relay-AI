"use client";
import { clsx } from "clsx";
import { ArrowRight, Bot, Loader2, ShieldAlert, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { CATEGORY_LABEL, PRIORITY_LABEL, SENTIMENT_LABEL, ticketRef } from "@/lib/format";
import type { AiAnalysis, Category, TicketDetail } from "@/lib/types";
import { ConfidenceMeter, PriorityBadge, SentimentBadge } from "./badges";

const RULE_LABEL: Record<string, string> = {
  "critical-keywords": "Critical keyword rule",
  "negative-sentiment": "Sentiment rule",
  "repeated-issue": "Repeated issue rule",
};

function Step({ n, title, children, last }: { n: number; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <li className="relative pl-8">
      {!last && <span aria-hidden className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-line-strong" />}
      <span aria-hidden className="absolute left-0 top-0.5 flex h-[23px] w-[23px] items-center justify-center rounded-full border border-line-strong bg-surface font-mono text-[11px] text-ink-muted">{n}</span>
      <h4 className="text-[13px] font-semibold text-ink">{title}</h4>
      <div className="mt-2 pb-5">{children}</div>
    </li>
  );
}

/**
 * The AI triage readout: how the ML prediction became a routing decision.
 * Model output, each business rule that adjusted it, and the final assignment.
 */
export function TriageReadout({ ticket }: { ticket: Pick<TicketDetail, "triageStatus" | "aiAnalysis" | "reviewStatus" | "category" | "priority"> }) {
  const a: AiAnalysis = ticket.aiAnalysis ?? {};

  if (ticket.triageStatus === "PENDING") {
    return (
      <div className="flex items-center gap-3 px-1 py-6 text-sm text-ink-muted" role="status">
        <Loader2 className="h-4 w-4 animate-spin text-pine-600" aria-hidden />
        The ML pipeline is classifying this ticket…
      </div>
    );
  }
  if (ticket.triageStatus === "FAILED" || !a.ml) {
    return (
      <p className="py-4 text-sm text-ink-muted">
        Automatic analysis was unavailable, so this ticket went to the General Support queue for a person to triage.
      </p>
    );
  }

  const { ml, priority, routing, review } = a;
  const alternatives = (Object.entries(ml.category.scores) as [Category, number][])
    .filter(([k]) => k !== ml.category.label)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 2);
  const corrected = ticket.reviewStatus === "CORRECTED";

  return (
    <ol className="pt-1">
      <Step n={1} title="Model prediction">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink-muted">Category</p>
            <p className="mb-2 text-sm font-medium">{CATEGORY_LABEL[ml.category.label]}</p>
            <ConfidenceMeter value={ml.category.confidence} threshold={review?.threshold} />
            {alternatives.length > 0 && (
              <p className="mt-1.5 text-xs text-ink-muted">
                Next best: {alternatives.map(([k, v]) => `${CATEGORY_LABEL[k]} ${Math.round(v * 100)}%`).join(", ")}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-ink-muted">Predicted priority</p>
              <div className="mt-1 flex items-center gap-2">
                <PriorityBadge priority={ml.priority.label} />
                <span className="font-mono text-xs text-ink-muted">{Math.round(ml.priority.confidence * 100)}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Sentiment</p>
              <div className="mt-1 flex items-center gap-2">
                <SentimentBadge sentiment={ml.sentiment.label} />
                <span className="font-mono text-xs text-ink-muted">score {ml.sentiment.compound.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </Step>

      <Step n={2} title="Business rules">
        {priority && priority.trace.length > 0 ? (
          <ul className="space-y-2">
            {priority.trace.map((t) => (
              <li key={t.rule} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium">{RULE_LABEL[t.rule] ?? t.rule}</span>
                <span className="inline-flex items-center gap-1">
                  <PriorityBadge priority={t.from} /><ArrowRight className="h-3 w-3 text-ink-muted" aria-label="raised to" /><PriorityBadge priority={t.to} />
                </span>
                <span className="w-full text-xs text-ink-muted sm:w-auto">{t.reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No rule changed the model's priority of {PRIORITY_LABEL[ml.priority.label].toLowerCase()}.</p>
        )}
        {(a.recentSimilarCount ?? 0) > 0 && !priority?.trace.some((t) => t.rule === "repeated-issue") && (
          <p className="mt-2 text-xs text-ink-muted">{a.recentSimilarCount} similar open ticket{a.recentSimilarCount === 1 ? "" : "s"} in the last 24 hours.</p>
        )}
      </Step>

      <Step n={3} title="Decision" last>
        <div className="space-y-2 text-sm">
          {review?.required && (
            <p className={clsx("flex items-start gap-2 rounded-xl px-3 py-2", ticket.reviewStatus === "PENDING" ? "bg-high-bg text-high-fg" : "bg-paper text-ink-soft")}>
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {ticket.reviewStatus === "PENDING"
                ? `Confidence is below the ${Math.round(review.threshold * 100)}% threshold, so an agent must confirm the category before it's assigned.`
                : `Held for review, then ${corrected ? "corrected" : "confirmed"} by an agent.`}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted">Final</span>
            <PriorityBadge priority={ticket.priority} />
            {ticket.category && <span className="text-ink-soft">{CATEGORY_LABEL[ticket.category]}</span>}
            {corrected && <span className="rounded-full bg-pine-50 px-2 py-0.5 text-xs text-pine-700">corrected by agent</span>}
          </div>
          {routing?.team && (
            <p className="flex flex-wrap items-center gap-1.5 text-ink-soft">
              <Users className="h-4 w-4 text-ink-muted" aria-hidden />{routing.team.name}
              {routing.agent && (<><ArrowRight className="h-3 w-3 text-ink-muted" aria-hidden /><UserRound className="h-4 w-4 text-ink-muted" aria-hidden />{routing.agent.name}</>)}
            </p>
          )}
          {routing?.reason && <p className="text-xs text-ink-muted">{routing.reason}</p>}
        </div>
      </Step>
    </ol>
  );
}

/** Compact version shown right after a ticket is submitted. */
export function TriageSummary({ a, sentimentLabel }: { a: AiAnalysis; sentimentLabel?: string }) {
  if (!a.ml) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
      <div><dt className="text-xs text-ink-muted">Category</dt><dd className="font-medium">{CATEGORY_LABEL[a.ml.category.label]}</dd></div>
      <div><dt className="text-xs text-ink-muted">Priority</dt><dd className="mt-0.5"><PriorityBadge priority={a.priority?.final ?? a.ml.priority.label} /></dd></div>
      <div><dt className="text-xs text-ink-muted">Sentiment</dt><dd className="font-medium">{sentimentLabel ?? SENTIMENT_LABEL[a.ml.sentiment.label]}</dd></div>
      <div><dt className="text-xs text-ink-muted">Confidence</dt><dd className="font-mono font-medium">{Math.round(a.ml.category.confidence * 100)}%</dd></div>
      <div className="col-span-2"><dt className="text-xs text-ink-muted">Routed to</dt><dd className="font-medium">{a.routing?.team?.name ?? "General queue"}{a.routing?.agent ? `, ${a.routing.agent.name}` : ""}</dd></div>
    </dl>
  );
}

export function SimilarList({ items }: { items: { id: string; number: number; title: string; similarity: number }[] }) {
  if (!items.length) return <p className="text-sm text-ink-muted">No similar tickets found.</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((s) => (
        <li key={s.id}>
          <Link href={`/tickets/${s.id}`} className="flex items-center gap-3 py-2 text-sm hover:text-pine-700">
            <span className="font-mono text-xs text-ink-muted">{ticketRef(s.number)}</span>
            <span className="min-w-0 flex-1 truncate">{s.title}</span>
            <span className="font-mono text-xs text-ink-muted" title="Cosine similarity of embeddings">{Math.round(s.similarity * 100)}%</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AiBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-pine-50 px-2 py-0.5 text-2xs font-medium text-pine-700"><Bot className="h-3 w-3" aria-hidden />AI</span>;
}
