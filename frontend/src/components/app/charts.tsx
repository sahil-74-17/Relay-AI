"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORY_LABEL, PRIORITY_LABEL, SENTIMENT_LABEL } from "@/lib/format";
import type { Overview } from "@/lib/types";

// Colours come from CSS variables so charts follow the light/dark theme.
const AXIS = { fontSize: 11, fill: "var(--chart-axis)" };
const tooltip = {
  contentStyle: {
    background: "var(--chart-tooltip-bg)",
    borderRadius: 8,
    border: "1px solid var(--chart-tooltip-border)",
    fontSize: 12,
    color: "var(--chart-tooltip-text)",
    boxShadow: "0 8px 24px -8px rgba(0,0,0,.35)",
  },
  labelStyle: { color: "var(--chart-tooltip-text)" },
  itemStyle: { color: "var(--chart-tooltip-text)" },
};

export function VolumeChart({ data }: { data: Overview["ticketsOverTime"] }) {
  const rows = data.map((d) => ({ ...d, label: new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) }));
  return (
    <div className="h-56" role="img" aria-label={`Tickets created and resolved per day over the selected ${data.length} days`}>
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltip} />
          <Area type="monotoneX" dataKey="created" name="Created" stroke="var(--chart-created)" fill="var(--chart-created-fill)" strokeWidth={1.8} />
          <Area type="monotoneX" dataKey="resolved" name="Resolved" stroke="var(--chart-resolved)" fill="transparent" strokeDasharray="4 3" strokeWidth={1.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function HBar({ data, colors, label }: { data: { name: string; count: number }[]; colors: string[]; label: string }) {
  return (
    <div style={{ height: Math.max(120, data.length * 34) }} role="img" aria-label={`${label}: ${data.map((d) => `${d.name} ${d.count}`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={118} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--chart-cursor)" }} />
          <Bar dataKey="count" name="Tickets" radius={[0, 4, 4, 0]} barSize={14} label={{ position: "right", fontSize: 11, fill: "var(--chart-label)" }}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ data }: { data: Overview["byCategory"] }) {
  const rows = [...data].sort((a, b) => b.count - a.count).map((d) => ({ name: CATEGORY_LABEL[d.key], count: d.count }));
  return <HBar data={rows} colors={["var(--chart-created)"]} label="Tickets by category" />;
}

export function PriorityChart({ data }: { data: Overview["byPriority"] }) {
  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
  const colors = { CRITICAL: "var(--chart-critical)", HIGH: "var(--chart-high)", MEDIUM: "var(--chart-medium)", LOW: "var(--chart-low)" };
  const rows = order.map((k) => ({ name: PRIORITY_LABEL[k], count: data.find((d) => d.key === k)?.count ?? 0 }));
  return <HBar data={rows} colors={order.map((k) => colors[k])} label="Tickets by priority" />;
}

export function SentimentChart({ data }: { data: Overview["bySentiment"] }) {
  const order = ["NEGATIVE", "NEUTRAL", "POSITIVE"] as const;
  const colors = { NEGATIVE: "var(--chart-critical)", NEUTRAL: "var(--chart-neutral)", POSITIVE: "var(--chart-positive)" };
  const rows = order.map((k) => ({ name: SENTIMENT_LABEL[k], count: data.find((d) => d.key === k)?.count ?? 0 }));
  return <HBar data={rows} colors={order.map((k) => colors[k])} label="Customer sentiment" />;
}

/** How confident the triage model was, for tickets the model actually classified. */
export function ConfidenceChart({ data }: { data: Overview["aiConfidence"] }) {
  return (
    <div className="h-44" role="img" aria-label={`AI confidence distribution: ${data.map((d) => `${d.bucket} ${d.count}`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="bucket" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--chart-cursor)" }} />
          <Bar dataKey="count" name="Tickets" fill="var(--chart-created)" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Helpful vs not-helpful votes on grounded AI answers. */
export function FeedbackChart({ data }: { data: Overview["aiFeedback"] }) {
  const rows = [{ name: "Helpful", count: data.helpful }, { name: "Not helpful", count: data.notHelpful }];
  return <HBar data={rows} colors={["var(--chart-positive)", "var(--chart-critical)"]} label="AI answer feedback" />;
}
