"use client";
import { clsx } from "clsx";
import { Bot, ChevronDown, FileText, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import type { FeedbackReason, FeedbackVote, Message, Source } from "@/lib/types";

/** Renders [n] citation markers as accessible chips that jump to and open the source. */
function withCitations(text: string, messageId: string): ReactNode[] {
  const openSource = (ref: string) => {
    const el = document.getElementById(`src-${messageId}-${ref}`);
    if (el instanceof HTMLDetailsElement) el.open = true;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <Fragment key={i}>{part.replace(/\*\*(.+?)\*\*/g, "$1")}</Fragment>;
    return (
      <a
        key={i}
        href={`#src-${messageId}-${m[1]}`}
        onClick={() => openSource(m[1])}
        className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded bg-pine-100 px-1 font-mono text-2xs font-medium text-pine-800 no-underline hover:bg-pine-200"
        aria-label={`Open source ${m[1]}`}
      >
        {m[1]}
      </a>
    );
  });
}

/** Minimal, safe formatting for LLM output: paragraphs and bullet/numbered lists. */
function Formatted({ text, id }: { text: string; id: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="prose-chat space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
        if (isList) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={bi} className={clsx("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
              {lines.map((l, li) => <li key={li}>{withCitations(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), id)}</li>)}
            </Tag>
          );
        }
        return <p key={bi} className="whitespace-pre-wrap">{withCitations(block, id)}</p>;
      })}
    </div>
  );
}

const MATCH_LABEL = { semantic: "meaning", keyword: "keywords", hybrid: "meaning and keywords" } as const;

/** Retrieved documents only: title, section and an excerpt, never filesystem paths. */
function Sources({ sources, id }: { sources: Source[]; id: string }) {
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="mb-2 text-xs font-medium text-ink-muted">
        Sources, retrieved from the knowledge base
      </p>
      <ul className="space-y-1.5">
        {sources.map((s) => (
          <li key={s.ref} id={`src-${id}-${s.ref}`} className="rounded-md border border-line bg-paper/60 target:border-pine-200 target:bg-pine-50">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start gap-2 px-2.5 py-2 text-xs [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-pine-100 px-1 font-mono text-2xs font-medium text-pine-800">{s.ref}</span>
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug text-ink-soft">{s.documentTitle}</span>
                  <span className="mt-0.5 block text-ink-faint">
                    Section {s.chunkIndex + 1} · {Math.round(s.similarity * 100)}% match
                    {s.matchedBy ? ` · found by ${MATCH_LABEL[s.matchedBy]}` : ""}
                  </span>
                </span>
                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-line px-2.5 py-2">
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-muted">{s.snippet}{s.snippet.length >= 600 ? "…" : ""}</p>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

const REASONS: { value: FeedbackReason; label: string }[] = [
  { value: "INCORRECT", label: "Incorrect answer" },
  { value: "NOT_RELEVANT", label: "Not relevant" },
  { value: "MISSING_INFORMATION", label: "Missing information" },
  { value: "OTHER", label: "Other" },
];

/**
 * 👍/👎 on a grounded answer. Negative feedback asks for a short reason first;
 * small talk and "no answer" messages never render this control.
 */
function AnswerFeedback({ m, onFeedback }: { m: Message; onFeedback: (vote: FeedbackVote, reason?: FeedbackReason) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (vote: FeedbackVote, reason?: FeedbackReason) => {
    setBusy(true);
    setError(null);
    try {
      await onFeedback(vote, reason);
      setReasonsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your feedback");
    } finally {
      setBusy(false);
    }
  };

  const vote = m.feedbackVote;
  return (
    <div className="mt-3 border-t border-line pt-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-muted">{vote ? "Thanks for the feedback." : "Was this answer helpful?"}</span>
        <button
          type="button"
          onClick={() => send("HELPFUL")}
          disabled={busy}
          aria-pressed={vote === "HELPFUL"}
          aria-label="Helpful answer"
          title="Helpful"
          className={clsx("flex h-7 w-7 items-center justify-center rounded border transition-colors disabled:opacity-60",
            vote === "HELPFUL" ? "border-pine-200 bg-pine-50 text-pine-700" : "border-line text-ink-muted hover:bg-paper hover:text-ink")}
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setReasonsOpen((o) => !o)}
          disabled={busy}
          aria-pressed={vote === "NOT_HELPFUL"}
          aria-expanded={reasonsOpen}
          aria-label="Not helpful answer"
          title="Not helpful"
          className={clsx("flex h-7 w-7 items-center justify-center rounded border transition-colors disabled:opacity-60",
            vote === "NOT_HELPFUL" ? "border-critical-line bg-critical-bg text-critical-fg" : "border-line text-ink-muted hover:bg-paper hover:text-ink")}
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
        </button>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-muted" aria-hidden />}
        {vote === "NOT_HELPFUL" && m.feedbackReason && !reasonsOpen && (
          <span className="text-xs text-ink-faint">Reason: {REASONS.find((r) => r.value === m.feedbackReason)?.label ?? m.feedbackReason}</span>
        )}
      </div>
      {reasonsOpen && (
        <div className="mt-2 rounded-md border border-line bg-paper/60 p-2" role="group" aria-label="What was wrong with this answer?">
          <p className="mb-1.5 text-xs font-medium text-ink-soft">What was wrong?</p>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                disabled={busy}
                onClick={() => send("NOT_HELPFUL", r.value)}
                className="rounded-full border border-line-strong bg-surface px-2 py-1 text-xs text-ink-soft hover:border-pine-200 hover:bg-pine-50 disabled:opacity-60"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 text-xs text-critical-fg">{error}</p>}
    </div>
  );
}

export function ChatMessage({ m, action, onFeedback }: {
  m: Message;
  action?: ReactNode;
  onFeedback?: (vote: FeedbackVote, reason?: FeedbackReason) => Promise<void>;
}) {
  if (m.role === "USER") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-verve-forest px-3.5 py-2 text-sm leading-relaxed text-verve-onForest dark:bg-verve-lime dark:text-verve-forest sm:max-w-[75%]">{m.content}</p>
      </div>
    );
  }
  const rateable = m.answerable === true && typeof onFeedback === "function";
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface" aria-hidden><Bot className="h-4 w-4 text-pine-600" /></span>
      <div className={clsx("min-w-0 max-w-[90%] rounded-xl rounded-tl-sm border px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[80%]", m.answerable === false ? "border-medium-line bg-medium-bg/50" : "border-line bg-surface")}>
        <span className="sr-only">Assistant: </span>
        <Formatted text={m.content} id={m.id} />
        {!!m.sources?.length && <Sources sources={m.sources} id={m.id} />}
        {rateable && <AnswerFeedback m={m} onFeedback={onFeedback} />}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-2.5" role="status" aria-label="Assistant is searching the knowledge base">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface" aria-hidden><Bot className="h-4 w-4 text-pine-600" /></span>
      <div className="flex items-center gap-2 rounded-xl rounded-tl-sm border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-muted">
        <span className="flex gap-1" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" style={{ animationDelay: `${i * 150}ms` }} />)}</span>
        Searching the knowledge base
      </div>
    </div>
  );
}
