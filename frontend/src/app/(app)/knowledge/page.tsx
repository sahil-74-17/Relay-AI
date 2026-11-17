"use client";
import { clsx } from "clsx";
import { AlertCircle, BookOpen, CheckCircle2, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, fetcher } from "@/lib/api";
import { fileSize, timeAgo } from "@/lib/format";
import type { KbDocument } from "@/lib/types";

const ACCEPT = ".pdf,.md,.markdown,.txt";
const MAX_MB = 10;

function DocStatus({ d }: { d: KbDocument }) {
  if (d.status === "READY") return <span className="inline-flex items-center gap-1 text-xs text-positive-fg"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Ready, {d.chunkCount} chunks</span>;
  if (d.status === "FAILED") return <span className="inline-flex items-center gap-1 text-xs text-critical-fg" title={d.error ?? undefined}><AlertCircle className="h-3.5 w-3.5" aria-hidden />Failed{d.error ? `: ${d.error}` : ""}</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-ink-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />{d.status === "PENDING" ? "Queued" : "Extracting, chunking and embedding"}</span>;
}

export default function KnowledgePage() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<KbDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<KbDocument[]>("/documents", fetcher, {
    refreshInterval: (d) => (d?.some((x) => x.status === "PENDING" || x.status === "PROCESSING") ? 1500 : 0),
  });

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`That file is larger than ${MAX_MB} MB.`);
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      await api("/documents", { method: "POST", form });
      await mutate();
      toast.success(`${file.name} uploaded. Processing has started.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/documents/${toDelete.id}`, { method: "DELETE" });
      await mutate();
      toast.success(`${toDelete.title} deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <>
      <PageHeader title="Knowledge base" description="Documents the AI assistant answers from. Each upload is split into sections, embedded and indexed for hybrid (semantic + keyword) search." />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files[0]); }}
        className={clsx("mb-6 flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors", dragging ? "border-verve-forest/50 bg-verve-lime/15" : "border-verve-line bg-verve-surface hover:border-verve-forest/30")}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-verve-lime text-verve-forest" aria-hidden>
          <Upload className="h-5 w-5" />
        </span>
        <p className="mt-3 text-[14px] font-semibold">Drop a file here, or choose one</p>
        <p className="mt-1 text-[12px] text-ink-muted">PDF, Markdown or plain text, up to {MAX_MB} MB</p>
        <input ref={input} type="file" accept={ACCEPT} className="sr-only" id="kb-upload" onChange={(e) => upload(e.target.files?.[0])} />
        <Button className="mt-5" variant="secondary" loading={uploading} onClick={() => input.current?.click()}>Choose file</Button>
      </div>

      <Card>
        <CardHeader title="Documents" description={data ? `${data.length} document${data.length === 1 ? "" : "s"}, ${data.reduce((n, d) => n + d.chunkCount, 0)} searchable chunks` : undefined} />
        {error ? <ErrorState message={error.message} onRetry={() => mutate()} />
          : isLoading || !data ? <SkeletonRows rows={4} />
          : !data.length ? <EmptyState icon={BookOpen} title="No documents yet" description="Upload FAQs, policies or manuals so the assistant can answer questions." />
          : (
            <ul className="divide-y divide-line">
              {data.map((d) => (
                <li key={d.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{d.fileName}, {fileSize(d.sizeBytes)}, uploaded by {d.uploadedBy.name} {timeAgo(d.createdAt)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <DocStatus d={d} />
                    <div className="flex">
                      {d.status === "FAILED" && <Button size="sm" variant="ghost" aria-label={`Retry processing ${d.title}`} onClick={async () => { await api(`/documents/${d.id}/reprocess`, { method: "POST" }); mutate(); }}><RefreshCw className="h-4 w-4" /></Button>}
                      <Button size="sm" variant="ghost" aria-label={`Delete ${d.title}`} onClick={() => setToDelete(d)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Card>
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} loading={deleting} destructive
        title={`Delete "${toDelete?.title}"?`} description="The assistant will stop using this document immediately. This can't be undone." confirmLabel="Delete document"
      />
    </>
  );
}
