"use client";
import { AlertTriangle, Pencil, RefreshCw, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { ReplySuggestion } from "@/lib/types";

/**
 * Agent-only first draft. It is never sent automatically: the agent edits it,
 * then uses the normal reply composer and explicitly clicks Send.
 */
export function SuggestedReply({ ticketId, onUse }: { ticketId: string; onUse: (text: string) => void }) {
  const toast = useToast();
  const [suggestion, setSuggestion] = useState<ReplySuggestion | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api<ReplySuggestion>(`/tickets/${ticketId}/suggest-reply`, { method: "POST" });
      setSuggestion(next);
      setDraft(next.text);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate a suggested reply. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const use = () => {
    if (!draft.trim()) return;
    onUse(draft.trim());
    toast.success("Draft moved to the reply box. Review it, then click Send.");
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-pine-600" aria-hidden />AI suggested reply</span>}
        description="Drafted from this ticket and the knowledge base. Review and edit before sending."
        action={
          <Button size="sm" variant={suggestion ? "ghost" : "secondary"} onClick={generate} loading={loading} aria-label={suggestion ? "Regenerate suggested reply" : "Generate suggested reply"}>
            {!loading && <RefreshCw className="h-3.5 w-3.5" aria-hidden />}{suggestion ? "Regenerate" : "Generate"}
          </Button>
        }
      />
      <div className="px-4 py-3 sm:px-5">
        {error ? (
          <div role="alert" className="flex flex-col gap-2 rounded-xl border border-critical-line bg-critical-bg px-3 py-2.5 text-sm text-critical-fg sm:flex-row sm:items-center">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="secondary" onClick={generate}>Retry</Button>
          </div>
        ) : loading && !suggestion ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted" role="status">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />Drafting from the ticket and knowledge base…
          </p>
        ) : !suggestion ? (
          <p className="text-sm text-ink-muted">Generate a first draft, then edit it in your own words or send it as-is.</p>
        ) : (
          <>
            {editing ? (
              <>
                <label htmlFor={`suggested-reply-${ticketId}`} className="sr-only">Edit suggested reply</label>
                <Textarea
                  id={`suggested-reply-${ticketId}`}
                  rows={8}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[160px] text-sm"
                />
              </>
            ) : (
              <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-verve-soft/70 px-3.5 py-3 text-sm leading-relaxed text-ink-soft">{draft}</p>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              {suggestion.groundedIn.length
                ? `Grounded in: ${suggestion.groundedIn.join(", ")}.`
                : "No matching knowledge-base section was found, so this draft only acknowledges the request."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={use} disabled={!draft.trim()}><Send className="h-3.5 w-3.5" aria-hidden />Use reply</Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />{editing ? "Done editing" : "Edit"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-faint">Nothing is sent until you click Send in the reply box.</p>
          </>
        )}
      </div>
    </Card>
  );
}
