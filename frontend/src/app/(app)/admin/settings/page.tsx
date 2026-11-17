"use client";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, fetcher } from "@/lib/api";
import type { Settings } from "@/lib/types";

type Key = keyof Settings;
interface Def { key: Key; label: string; hint: string; percent?: boolean; min: number; max: number; step: number; unit?: string }

const GROUPS: { title: string; description: string; fields: Def[] }[] = [
  { title: "Ticket triage", description: "When the model is trusted to route on its own", fields: [
    { key: "confidenceThreshold", label: "Review threshold", hint: "Tickets with lower category confidence go to the human review queue.", percent: true, min: 0, max: 1, step: 0.01 },
    { key: "similarTicketThreshold", label: "Similar-ticket similarity", hint: "Minimum embedding similarity to count as a related ticket (also feeds the repeated-issue rule).", percent: true, min: 0, max: 1, step: 0.01 },
  ] },
  { title: "AI assistant (RAG)", description: "How strict retrieval is before the assistant answers", fields: [
    { key: "ragMinSimilarity", label: "Semantic match threshold", hint: "Minimum cosine similarity for a document section to count as relevant.", percent: true, min: 0, max: 1, step: 0.01 },
    { key: "ragMinKeywordCoverage", label: "Keyword coverage", hint: "Share of question terms a section must contain to count as a keyword match.", percent: true, min: 0, max: 1, step: 0.05 },
    { key: "ragTopK", label: "Sections per answer", hint: "Maximum number of document sections given to the answer generator.", min: 1, max: 10, step: 1 },
  ] },
  { title: "Incident detection", description: "When related tickets become a potential incident", fields: [
    { key: "incidentWindowMinutes", label: "Time window", hint: "Only tickets created within this window are grouped.", min: 5, max: 1440, step: 5, unit: "min" },
    { key: "incidentMinClusterSize", label: "Minimum tickets", hint: "Smallest group that becomes an incident.", min: 2, max: 50, step: 1 },
    { key: "incidentSimilarityThreshold", label: "Grouping similarity", hint: "Minimum similarity for two tickets to be linked.", percent: true, min: 0, max: 1, step: 0.01 },
    { key: "incidentSpikeRatio", label: "Spike ratio", hint: "Volume this many times above the weekly norm raises severity.", min: 1, max: 20, step: 0.5, unit: "×" },
  ] },
];

export default function SettingsPage() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{ settings: Settings; llm: string }>("/settings", fetcher);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setDraft(data.settings); }, [data]);

  if (error) return <Card><ErrorState message={error.message} onRetry={() => mutate()} /></Card>;
  if (isLoading || !draft || !data) return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-8 w-48" /><Skeleton className="h-56" /><Skeleton className="h-56" /></div>;

  const dirty = (Object.keys(draft) as Key[]).some((k) => draft[k] !== data.settings[k]);
  const save = async () => {
    setSaving(true);
    try {
      const r = await api<{ settings: Settings; llm: string }>("/settings", { method: "PATCH", body: draft });
      await mutate(r, { revalidate: false });
      toast.success("Settings saved. They apply to the next ticket and question.");
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 422 ? "One of the values is out of range." : e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="AI settings" description="Thresholds the ML pipeline reads at runtime. No redeploy needed." />
      <Card className="mb-6 flex items-start gap-3 px-4 py-3 text-sm sm:px-5">
        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" aria-hidden />
        <p className="text-ink-soft">Answer generator: <span className="font-medium text-ink">{data.llm}</span>. Set <code className="font-mono text-xs">LLM_PROVIDER</code> and <code className="font-mono text-xs">LLM_API_KEY</code> in the backend environment to change it.</p>
      </Card>
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <Card key={g.title}>
            <CardHeader title={g.title} description={g.description} />
            <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
              {g.fields.map((f) => {
                const value = draft[f.key];
                const shown = f.percent ? Math.round(value * 100) : value;
                return (
                  <Field key={f.key} label={`${f.label}${f.percent ? " (%)" : f.unit ? ` (${f.unit})` : ""}`} hint={f.hint}>
                    {(p) => (
                      <Input {...p} type="number" inputMode="decimal"
                        min={f.percent ? f.min * 100 : f.min} max={f.percent ? f.max * 100 : f.max} step={f.percent ? f.step * 100 : f.step}
                        value={shown}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isNaN(n)) setDraft({ ...draft, [f.key]: f.percent ? n / 100 : n });
                        }} />
                    )}
                  </Field>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      {dirty && (
        <div className="sticky bottom-4 z-10 mt-6 flex justify-end">
          <div className="flex gap-2 rounded-full border border-verve-line bg-verve-bg/90 p-1.5 shadow-pop backdrop-blur">
            <Button variant="secondary" onClick={() => setDraft(data.settings)}>Discard changes</Button>
            <Button onClick={save} loading={saving} disabled={!dirty}>Save settings</Button>
          </div>
        </div>
      )}
    </div>
  );
}
