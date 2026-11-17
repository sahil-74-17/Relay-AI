"use client";
import { ArrowLeft, Bot, ClipboardCheck, Radar, RefreshCw } from "lucide-react";
import Link from "next/link";
import { use, useRef, useState } from "react";
import useSWR from "swr";
import { CategoryTag, PriorityBadge, SentimentBadge, SlaBadge, StatusBadge } from "@/components/app/badges";
import { SuggestedReply } from "@/components/app/suggested-reply";
import { Timeline } from "@/components/app/timeline";
import { SimilarList, TriageReadout } from "@/components/app/triage-readout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/hooks/use-session";
import { api, fetcher } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABEL, PRIORITIES, PRIORITY_LABEL, STATUS_LABEL, dateTime, incidentRef, ticketRef } from "@/lib/format";
import type { Category, Priority, Ref, Role, TicketDetail, TicketStatus } from "@/lib/types";

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  WAITING_FOR_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
};

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2 py-2 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function ReviewModal({ ticket, open, onClose, onDone }: { ticket: TicketDetail; open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [category, setCategory] = useState<Category>(ticket.category ?? "GENERAL");
  const [priority, setPriority] = useState<Priority>(ticket.priority);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api(`/tickets/${ticket.id}/review`, { method: "POST", body: { action: "CORRECT", category, priority, note: note || undefined } });
      toast.success("Correction saved as training feedback");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the correction");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open} onClose={onClose} title="Correct the AI prediction"
      description="Your correction re-routes the ticket and is stored as labelled feedback for the next model."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save correction</Button></>}
    >
      <div className="space-y-4">
        <Field label="Category">{(p) => <Select {...p} value={category} onChange={(e) => setCategory(e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select>}</Field>
        <Field label="Priority">{(p) => <Select {...p} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((x) => <option key={x} value={x}>{PRIORITY_LABEL[x]}</option>)}</Select>}</Field>
        <Field label="Note" optional>{(p) => <Textarea {...p} rows={2} className="min-h-0" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why was the prediction wrong?" />}</Field>
      </div>
    </Modal>
  );
}

function ResolveModal({ open, onClose, onResolve }: { open: boolean; onClose: () => void; onResolve: (resolution: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      open={open} onClose={onClose} title="Resolve ticket" description="The customer sees this resolution note."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={text.trim().length < 3} loading={saving} onClick={async () => { setSaving(true); await onResolve(text.trim()); setSaving(false); onClose(); }}>Resolve ticket</Button></>}
    >
      <Field label="Resolution">{(p) => <Textarea {...p} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What fixed it?" />}</Field>
    </Modal>
  );
}

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isStaff } = useSession();
  const toast = useToast();
  const { data: t, error, isLoading, mutate } = useSWR<TicketDetail>(`/tickets/${id}`, fetcher, {
    refreshInterval: (d) => (d?.triageStatus === "PENDING" ? 1500 : 0),
  });
  const { data: agents } = useSWR<(Ref & { role: Role; teamId: string | null })[]>(isStaff ? "/agents" : null, fetcher);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  if (error) return <Card><ErrorState message={error.status === 404 ? "This ticket doesn't exist or you don't have access to it." : error.message} onRetry={() => mutate()} /></Card>;
  if (isLoading || !t) return <div className="space-y-4" role="status" aria-label="Loading ticket"><Skeleton className="h-6 w-40" /><Skeleton className="h-9 w-2/3" /><div className="grid gap-6 lg:grid-cols-[1fr_320px]"><Skeleton className="h-96" /><Skeleton className="h-72" /></div></div>;

  const update = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      await api(`/tickets/${t.id}`, { method: "PATCH", body });
      await mutate();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };
  const onStatus = (s: TicketStatus) => (s === "RESOLVED" ? setResolveOpen(true) : update({ status: s }, `Status changed to ${STATUS_LABEL[s].toLowerCase()}`));
  const acceptPrediction = async () => {
    setBusy(true);
    try {
      await api(`/tickets/${t.id}/review`, { method: "POST", body: { action: "ACCEPT" } });
      await mutate();
      toast.success("Prediction confirmed and ticket routed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't confirm");
    } finally {
      setBusy(false);
    }
  };
  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api(`/tickets/${t.id}/comments`, { method: "POST", body: { body: comment.trim(), isInternal: internal } });
      setComment("");
      await mutate();
      toast.success(internal ? "Internal note added" : "Reply sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't post the comment");
    } finally {
      setPosting(false);
    }
  };
  const reanalyze = async () => {
    setBusy(true);
    try {
      await api(`/tickets/${t.id}/reanalyze`, { method: "POST" });
      await mutate();
      toast.success("Re-running the ML pipeline");
    } catch (e) {
      // Show the real reason (e.g. a human review is final) instead of pretending it queued.
      toast.error(e instanceof Error ? e.message : "Couldn't re-run the analysis");
    } finally {
      setBusy(false);
    }
  };
  const useSuggestedReply = (text: string) => {
    setComment(text);
    setInternal(false);
    replyRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    replyRef.current?.focus();
  };

  return (
    <>
      <Link href="/tickets" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden />Tickets</Link>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-ink-muted">{ticketRef(t.number)}</span>
          <StatusBadge status={t.status} /><PriorityBadge priority={t.priority} />
          {t.source === "CHATBOT" && <span className="inline-flex items-center gap-1 text-xs text-pine-700"><Bot className="h-3.5 w-3.5" aria-hidden />From AI assistant</span>}
        </div>
        <h1 className="mt-2 text-[28px] font-semibold leading-[1.15] tracking-[-0.035em] sm:text-[32px]">{t.title}</h1>
      </div>

      {isStaff && t.reviewStatus === "PENDING" && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-high-line bg-high-bg px-4 py-3.5 sm:flex-row sm:items-center">
          <ClipboardCheck className="hidden h-5 w-5 shrink-0 text-high-fg sm:block" aria-hidden />
          <p className="flex-1 text-sm text-high-fg">
            The model is only {Math.round((t.mlConfidence ?? 0) * 100)}% sure this is <strong>{t.category ? CATEGORY_LABEL[t.category] : "uncategorised"}</strong>. Confirm or correct it to route the ticket.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setReviewOpen(true)}>Correct</Button>
            <Button size="sm" onClick={acceptPrediction} loading={busy}>Confirm</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="px-4 py-4 sm:px-5">
            <p className="text-[13px] text-ink-muted">{t.createdBy.name} wrote, {dateTime(t.createdAt)}</p>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">{t.description}</p>
            {t.resolution && (
              <div className="mt-4 rounded-md bg-positive-bg px-3 py-2 text-sm text-positive-fg"><span className="font-medium">Resolution: </span>{t.resolution}</div>
            )}
            {t.conversation && <p className="mt-3 text-xs text-ink-muted">Summarised by the AI from the chat "{t.conversation.title}".</p>}
          </Card>

          <Card>
            <CardHeader
              title="AI triage"
              description="How the ML prediction became this routing decision"
              action={isStaff && t.triageStatus !== "PENDING" ? (
                <div className="flex gap-1">
                  {t.reviewStatus !== "PENDING" && <Button size="sm" variant="ghost" onClick={() => setReviewOpen(true)}>Correct</Button>}
                  {t.reviewStatus !== "ACCEPTED" && t.reviewStatus !== "CORRECTED" && (
                    <Button size="sm" variant="ghost" onClick={reanalyze} loading={busy} aria-label="Re-run analysis" title="Re-run the ML analysis">
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                </div>
              ) : undefined}
            />
            <div className="px-4 pt-4 sm:px-5"><TriageReadout ticket={t} /></div>
          </Card>

          <section aria-labelledby="activity">
            <h2 id="activity" className="mb-3 text-[16px] font-semibold tracking-[-0.02em]">Activity</h2>
            <Timeline comments={t.comments} activities={t.activities} />
            {t.status !== "CLOSED" ? (
              <Card className="mt-4 p-3">
                <label htmlFor="reply" className="sr-only">Write a reply</label>
                <Textarea id="reply" ref={replyRef} rows={3} className="min-h-[88px] border-0 px-1 shadow-none focus-visible:ring-0" placeholder={isStaff ? "Reply to the customer or add an internal note" : "Add a reply"} value={comment} onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(); }} />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  {isStaff ? (
                    <label className="flex items-center gap-2 text-sm text-ink-soft">
                      <input type="checkbox" className="h-4 w-4 accent-pine-600" checked={internal} onChange={(e) => setInternal(e.target.checked)} />Internal note
                    </label>
                  ) : <span className="text-xs text-ink-muted">Ctrl + Enter to send</span>}
                  <Button size="sm" onClick={postComment} loading={posting} disabled={!comment.trim()}>{internal ? "Add note" : "Send reply"}</Button>
                </div>
              </Card>
            ) : <p className="mt-4 text-sm text-ink-muted">This ticket is closed. Create a new ticket if the problem comes back.</p>}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="px-4 py-2">
            <dl className="divide-y divide-line">
              <Prop label="Status">
                {isStaff && TRANSITIONS[t.status].length ? (
                  <Select aria-label="Change status" value={t.status} disabled={busy} onChange={(e) => onStatus(e.target.value as TicketStatus)}>
                    {[t.status, ...TRANSITIONS[t.status]].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </Select>
                ) : <StatusBadge status={t.status} />}
              </Prop>
              <Prop label="Priority">
                {isStaff && t.status !== "CLOSED" ? (
                  <Select aria-label="Change priority" value={t.priority} disabled={busy} onChange={(e) => update({ priority: e.target.value }, "Priority updated")}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                  </Select>
                ) : <PriorityBadge priority={t.priority} />}
              </Prop>
              <Prop label="Assignee">
                {isStaff && t.status !== "CLOSED" ? (
                  <Select aria-label="Assign agent" value={t.assignedAgent?.id ?? ""} disabled={busy} onChange={(e) => update({ assignedAgentId: e.target.value || null }, e.target.value ? "Ticket assigned" : "Ticket unassigned")}>
                    <option value="">Unassigned</option>
                    {agents?.map((a) => <option key={a.id} value={a.id}>{a.name}{a.id === user?.id ? " (you)" : ""}</option>)}
                  </Select>
                ) : <span className="text-ink-soft">{t.assignedAgent?.name ?? "Not assigned yet"}</span>}
              </Prop>
              <Prop label="Team"><span className="text-ink-soft">{t.assignedTeam?.name ?? "—"}</span></Prop>
              <Prop label="Category"><CategoryTag category={t.category} /></Prop>
              <Prop label="Sentiment"><SentimentBadge sentiment={t.sentiment} /></Prop>
              <Prop label="SLA">{t.sla === "met" ? <span className="text-sm text-positive-fg">Met</span> : t.sla ? <SlaBadge sla={t.sla} dueAt={t.dueAt} /> : <span className="text-ink-faint">—</span>}</Prop>
              {isStaff && <Prop label="Requester"><span className="block truncate text-ink-soft">{t.createdBy.name}</span></Prop>}
            </dl>
            {isStaff && t.status !== "RESOLVED" && t.status !== "CLOSED" && (
              <div className="border-t border-line py-3"><Button className="w-full" onClick={() => setResolveOpen(true)}>Resolve ticket</Button></div>
            )}
          </Card>

          {isStaff && t.status !== "CLOSED" && (
            <SuggestedReply ticketId={t.id} onUse={useSuggestedReply} />
          )}

          {t.incident && (
            <Link href={`/incidents/${t.incident.id}`} className="card flex items-start gap-3 border-critical-line bg-critical-bg/60 px-4 py-3 hover:bg-critical-bg">
              <Radar className="mt-0.5 h-4 w-4 shrink-0 text-critical-fg" aria-hidden />
              <span className="min-w-0 text-sm">
                <span className="block font-medium text-critical-fg">Part of {incidentRef(t.incident.number)}</span>
                <span className="block truncate text-ink-soft">{t.incident.title}</span>
              </span>
            </Link>
          )}

          {isStaff && (
            <Card>
              <CardHeader title="Similar tickets" description="Nearest neighbours by embedding similarity" />
              <div className="px-4 py-1 sm:px-5"><SimilarList items={t.similar} /></div>
            </Card>
          )}

          {isStaff && t.feedback.length > 0 && (
            <Card className="px-4 py-3 text-sm sm:px-5">
              <h2 className="mb-2 text-[13px] font-semibold">Review history</h2>
              <ul className="space-y-1.5 text-ink-soft">
                {t.feedback.map((f) => (
                  <li key={f.id}>{f.reviewer.name} {f.accepted ? "confirmed the prediction" : `corrected ${f.predictedCategory ? CATEGORY_LABEL[f.predictedCategory] : "—"} to ${f.correctedCategory ? CATEGORY_LABEL[f.correctedCategory] : "—"}`}{f.note ? `: "${f.note}"` : ""}</li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      {isStaff && <ReviewModal key={`${t.id}-${t.category}-${t.priority}`} ticket={t} open={reviewOpen} onClose={() => setReviewOpen(false)} onDone={() => mutate()} />}
      <ResolveModal open={resolveOpen} onClose={() => setResolveOpen(false)} onResolve={(resolution) => update({ status: "RESOLVED", resolution }, "Ticket resolved")} />
    </>
  );
}
