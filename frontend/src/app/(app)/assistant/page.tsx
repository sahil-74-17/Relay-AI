"use client";
import { clsx } from "clsx";
import { ArrowUp, Eraser, History, MessageSquarePlus, MessageSquareText, MoreHorizontal, Ticket, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ChatMessage, TypingIndicator } from "@/components/app/chat-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, fetcher } from "@/lib/api";
import { ticketRef, timeAgo } from "@/lib/format";
import type { Conversation, ConversationSummary, Message, TicketListItem } from "@/lib/types";

const STARTERS = ["How do I reset my password?", "I was charged twice, when do I get a refund?", "What is the API rate limit?", "Where is my data stored?"];

function ConversationList({ items, activeId, onSelect, onNew }: { items?: ConversationSummary[]; activeId: string | null; onSelect: (id: string) => void; onNew: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3"><Button variant="secondary" className="w-full" onClick={onNew}><MessageSquarePlus className="h-4 w-4" />New conversation</Button></div>
      <nav aria-label="Conversation history" className="flex-1 overflow-y-auto px-2 pb-3">
        {!items ? <div className="space-y-2 px-1">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          : !items.length ? <p className="px-2 py-4 text-sm text-ink-muted">No conversations yet.</p>
          : (
            <ul className="space-y-0.5">
              {items.map((c) => (
                <li key={c.id}>
                  <button onClick={() => onSelect(c.id)} aria-current={c.id === activeId ? "true" : undefined}
                    className={clsx("w-full rounded-md px-2.5 py-2 text-left", c.id === activeId ? "bg-paper ring-1 ring-line" : "hover:bg-paper/70")}>
                    <span className="block truncate text-sm">{c.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                      {timeAgo(c.updatedAt)}
                      {c.ticket && <span className="inline-flex items-center gap-0.5 text-pine-700"><Ticket className="h-3 w-3" aria-hidden />{ticketRef(c.ticket.number)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </nav>
    </div>
  );
}

function AssistantView() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("c");
  const list = useSWR<ConversationSummary[]>("/conversations", fetcher);
  const convo = useSWR<Conversation>(activeId ? `/conversations/${activeId}` : null, fetcher);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Message | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [confirm, setConfirm] = useState<"clear" | "delete" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyClose = useRef<HTMLButtonElement>(null);

  const messages = [...(convo.data?.messages ?? []), ...(pending ? [pending] : [])];
  useEffect(() => {
  bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
}, [messages.length, sendError]);

  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHistoryOpen(false);
    document.addEventListener("keydown", onKey);
    historyClose.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [historyOpen]);

  const select = (id: string | null) => {
    setHistoryOpen(false);
    setSendError(null);
    router.replace(id ? `/assistant?c=${id}` : "/assistant", { scroll: false });
  };

  async function send(text = input) {
    const content = text.trim();
    if (!content || pending) return;
    setSendError(null);
    setInput("");
    let id = activeId;
    try {
      if (!id) {
        id = (await api<{ id: string }>("/conversations", { method: "POST", body: {} })).id;
        router.replace(`/assistant?c=${id}`, { scroll: false });
      }
      setPending({ id: "pending", role: "USER", content, sources: null, answerable: null, feedbackVote: null, feedbackReason: null, createdAt: new Date().toISOString() });
      await api(`/conversations/${id}/messages`, { method: "POST", body: { content } });
      await Promise.all([convo.mutate(), list.mutate()]);
    } catch (e) {
      setInput(content);
      setSendError(e instanceof ApiError && e.status === 429 ? "You're sending messages too quickly. Wait a moment and try again." : e instanceof Error ? e.message : "The assistant couldn't respond.");
    } finally {
      setPending(null);
      inputRef.current?.focus();
    }
  }

  async function escalate() {
    if (!activeId) return;
    setEscalating(true);
    try {
      const t = await api<TicketListItem>(`/conversations/${activeId}/escalate`, { method: "POST" });
      await Promise.all([convo.mutate(), list.mutate()]);
      toast.success(`Ticket ${ticketRef(t.number)} created from this conversation`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the ticket");
    } finally {
      setEscalating(false);
    }
  }

  async function rate(m: Message, vote: "HELPFUL" | "NOT_HELPFUL", reason?: "INCORRECT" | "NOT_RELEVANT" | "MISSING_INFORMATION" | "OTHER") {
    if (!activeId) return;
    await api(`/conversations/${activeId}/messages/${m.id}/feedback`, {
      method: "POST",
      body: { vote, ...(reason ? { reason } : {}) },
    });
    await convo.mutate();
    toast.success(vote === "HELPFUL" ? "Marked as helpful" : "Thanks, we'll use this to improve answers");
  }

  async function runConfirm() {    if (!activeId || !confirm) return;
    try {
      if (confirm === "clear") {
        await api(`/conversations/${activeId}/messages`, { method: "DELETE" });
        await convo.mutate();
        toast.success("Conversation cleared");
      } else {
        await api(`/conversations/${activeId}`, { method: "DELETE" });
        select(null);
        toast.success("Conversation deleted");
      }
      await list.mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    }
    setConfirm(null);
  }

  const ticket = convo.data?.ticket;
  // Keep the escalation offer for the last genuine support question, even if the
  // customer follows the "no answer" with "ok" or "thanks". A later answered
  // support question replaces it; small talk never removes it.
  const lastSupportReply = [...messages].reverse().find((m) => m.role === "ASSISTANT" && m.answerable !== null);
  const escalateFor = !ticket && lastSupportReply?.answerable === false ? lastSupportReply.id : null;
  const escalateAction = (m: Message) =>
    m.id === escalateFor ? (
      <Button size="sm" onClick={escalate} loading={escalating}><Ticket className="h-4 w-4" />Create support ticket</Button>
    ) : undefined;

  const history = <ConversationList items={list.data} activeId={activeId} onSelect={select} onNew={() => select(null)} />;

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-4rem)] sm:-mx-6 lg:-mx-10 lg:-my-10 lg:h-dvh">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface md:block">{history}</aside>
      {historyOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Conversation history">
          <div className="absolute inset-0 bg-overlay/50" onClick={() => setHistoryOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-rise-in bg-surface shadow-pop">
            <button ref={historyClose} onClick={() => setHistoryOpen(false)} className="absolute right-2 top-3 rounded p-1 hover:bg-ink/5" aria-label="Close history"><X className="h-4 w-4" /></button>
            <div className="pt-8 h-full">{history}</div>
          </div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col" aria-label="Conversation">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-paper/80 px-4 backdrop-blur">
          <button className="rounded-md p-1.5 hover:bg-ink/5 md:hidden" onClick={() => setHistoryOpen(true)} aria-label="Show conversation history"><History className="h-5 w-5" /></button>
          <MessageSquareText className="hidden h-4 w-4 text-pine-600 md:block" aria-hidden />
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{convo.data?.title ?? "AI assistant"}</h1>
          {ticket && <Link href={`/tickets/${ticket.id}`} className="inline-flex items-center gap-1 rounded bg-pine-50 px-2 py-1 text-xs font-medium text-pine-700 hover:bg-pine-100"><Ticket className="h-3.5 w-3.5" aria-hidden />{ticketRef(ticket.number)}</Link>}
          {activeId && convo.data && (
            <Menu label="Conversation options" trigger={<span className="flex rounded-md p-1.5 hover:bg-ink/5"><MoreHorizontal className="h-4 w-4" /></span>} items={[
              { label: "Clear messages", onSelect: () => setConfirm("clear"), icon: <Eraser className="h-4 w-4" aria-hidden /> },
              { label: "Delete conversation", onSelect: () => setConfirm("delete"), danger: true, icon: <Trash2 className="h-4 w-4" aria-hidden /> },
            ]} />
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6" aria-live="polite">
          <div className="mx-auto max-w-3xl space-y-5">
            {convo.error ? <ErrorState message="This conversation couldn't be loaded." onRetry={() => convo.mutate()} />
              : activeId && convo.isLoading ? <div className="space-y-4"><Skeleton className="ml-auto h-10 w-1/2" /><Skeleton className="h-24 w-3/4" /></div>
              : !messages.length ? (
                <EmptyState
                  icon={MessageSquareText}
                  title="Ask a question about the product"
                  description="Answers come only from the help documentation, with sources. If there's no answer, you can turn the chat into a ticket."
                  action={
                    <div className="flex max-w-lg flex-wrap justify-center gap-2">
                      {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink-soft hover:border-pine-200 hover:bg-pine-50">{s}</button>)}
                    </div>
                  }
                />
              ) : messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  m={m}
                  action={escalateAction(m)}
                  onFeedback={m.answerable === true ? (vote, reason) => rate(m, vote, reason) : undefined}
                />
              ))}
            {pending && <TypingIndicator />}
            {sendError && (
              <div role="alert" className="flex flex-col gap-2 rounded-lg border border-critical-line bg-critical-bg px-4 py-3 text-sm text-critical-fg sm:flex-row sm:items-center">
                <span className="flex-1">{sendError}</span>
                <Button size="sm" variant="secondary" onClick={() => send()}>Retry</Button>
              </div>
            )}
            <div ref={bottom} />
          </div>
        </div>

        <div className="shrink-0 border-t border-line bg-paper px-4 py-3">
          <form className="mx-auto flex max-w-3xl items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label htmlFor="chat-input" className="sr-only">Message the assistant</label>
            <textarea
              id="chat-input" ref={inputRef} rows={1} maxLength={2000} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about billing, your account, the API…"
              className="field-input max-h-40 min-h-[40px] flex-1 resize-none py-2.5"
            />
            <Button type="submit" className="h-10 w-10 shrink-0 px-0" disabled={!input.trim() || !!pending} aria-label="Send message"><ArrowUp className="h-4 w-4" /></Button>
          </form>
          <p className="mx-auto mt-1.5 max-w-3xl text-center text-xs text-ink-faint">Enter to send, Shift + Enter for a new line.</p>
        </div>
      </section>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} onConfirm={runConfirm} destructive
        title={confirm === "delete" ? "Delete this conversation?" : "Clear all messages?"}
        description={confirm === "delete" ? "The conversation is removed permanently. Tickets created from it are kept." : "The conversation stays in your history, but its messages are removed."}
        confirmLabel={confirm === "delete" ? "Delete conversation" : "Clear messages"}
      />
    </div>
  );
}

export default function AssistantPage() {
  return <Suspense><AssistantView /></Suspense>;
}
