import { clsx } from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

/** A metric tile. When `href` is set the whole tile is a link to the filtered view. */
export function Stat({ label, value, hint, tone = "default", href }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "warn" | "danger"; href?: string }) {
  const body = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-verve-muted">{label}</p>
      <p className={clsx("mt-2.5 text-[27px] font-semibold leading-none tabular-nums tracking-[-0.03em]", tone === "danger" ? "text-critical-fg" : tone === "warn" ? "text-high-fg" : "text-verve-ink")}>{value}</p>
      {hint && <p className="mt-2 text-[11.5px] leading-snug text-verve-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-verve-line bg-verve-surface px-4 py-4 shadow-[0_1px_0_rgba(12,59,46,0.04)]";
  return href
    ? <Link href={href} className={clsx(cls, "transition-colors hover:border-verve-forest/30 hover:bg-verve-soft/50")}>{body}</Link>
    : <div className={cls}>{body}</div>;
}
