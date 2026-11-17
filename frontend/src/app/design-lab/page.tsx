import { ArrowRight, ArrowUpRight, FlaskConical } from "lucide-react";
import Link from "next/link";
import { CONCEPTS } from "@/components/design-lab/meta";

export const metadata = {
  title: "Design lab · Relay",
  description: "Four visual directions for the Relay sign-in and landing pages.",
};

export default function DesignLabPage() {
  return (
    <div className="min-h-dvh bg-[#0B0D12] text-white">
      <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/60">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
            Design exploration · preview only
          </span>
          <Link href="/login" className="text-[11px] text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline">
            Back to the current sign-in
          </Link>
        </div>

        <h1 className="mt-8 max-w-[20ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[54px]">
          Four directions for the public face of Relay.
        </h1>
        <p className="mt-5 max-w-[62ch] text-[14px] leading-relaxed text-white/50">
          Each concept includes a sign-in / register surface and a landing page. They share the same product facts and
          structure, but differ in colour, type, density and tone. Nothing here is wired to the API, the database or the
          current dashboard.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {CONCEPTS.map((c) => (
            <article key={c.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
              <div className="flex h-28 items-end gap-1.5 p-5" style={{ background: `linear-gradient(120deg, ${c.swatches[0]} 0%, ${c.swatches[1]} 100%)` }}>
                {c.swatches.slice(2).map((s) => (
                  <span key={s} className="h-3 w-8 rounded-full" style={{ background: s }} aria-hidden />
                ))}
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Concept {c.id.toUpperCase()}</p>
                    <h2 className="mt-1.5 text-[24px] font-semibold tracking-[-0.02em]">{c.name}</h2>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">{c.style}</span>
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-white/50">{c.blurb}</p>
                <p className="mt-3 font-mono text-[10px] text-white/30">{c.fonts}</p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/design-lab/${c.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[12px] font-semibold text-[#0B0D12] transition-colors hover:bg-white/90"
                  >
                    Landing page <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  <Link
                    href={`/design-lab/${c.id}/auth`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3.5 text-[12px] font-medium text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    Sign in / Register <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium text-white/70">What to compare</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">
              Hierarchy, contrast, density and how each would feel on a 12-hour shift.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">What stays the same</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">
              Real product capabilities, three roles, honest copy. No invented customers or metrics.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">How to navigate</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">
              Use the switch in the top bar to move between a concept&apos;s landing and auth views.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
