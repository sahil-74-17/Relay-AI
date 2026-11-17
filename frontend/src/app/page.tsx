import {
  ArrowRight, ArrowUpRight, BookOpen, Gauge, Headset, Radar, RefreshCw, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { MobileNav } from "@/components/verve/mobile-nav";
import { VerveLogo } from "@/components/verve/logo";

export const metadata: Metadata = {
  title: "AI support & incident intelligence",
  description:
    "Relay reads incoming support tickets, explains its triage, routes them to the right person, answers from your own documents, and surfaces incident signals early.",
};

const PLATFORM = [
  {
    title: "Triage that shows its work",
    body: "Category, priority and sentiment on every ticket, with the confidence behind each call and the rules that adjusted it. Agents see the reasoning, not just the verdict.",
  },
  {
    title: "Answers from your docs",
    body: "The assistant retrieves only from the policies and FAQs you upload, and links the passage behind every answer it gives.",
  },
  {
    title: "Incidents before the flood",
    body: "Similar tickets arriving close together are grouped into one potential incident, with volume compared against a normal week.",
  },
  {
    title: "Roles that hold",
    body: "Customer, Agent and Admin surfaces, enforced by the API on every request rather than hidden in the interface.",
  },
];

const STEPS = [
  ["Submitted", "Web form, or a chat the assistant couldn't answer."],
  ["Analysed", "Models classify category, priority and sentiment, then embed the ticket."],
  ["Adjusted", "Rules raise what matters: critical wording, repeat issues."],
  ["Routed", "To the owning team's least-busy agent, or held for review."],
  ["Learned from", "Agent corrections become labelled training feedback."],
];

const ROLES = [
  {
    icon: UserRound,
    role: "Customer",
    body: "Raise tickets, follow replies, and ask the assistant questions grounded in your help centre.",
    tag: "Own tickets + assistant",
  },
  {
    icon: Headset,
    role: "Agent",
    body: "Work the queue, confirm or correct low-confidence predictions, and answer from the knowledge base.",
    tag: "Team queue + review",
  },
  {
    icon: ShieldCheck,
    role: "Admin",
    body: "See analytics, manage the knowledge base, groups, teams and incident signals.",
    tag: "Workspace-wide",
  },
];

const MARQUEE = ["AI triage", "Grounded answers", "Incident detection", "Role-based access", "Analytics", "Feedback loop"];

export default function HomePage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-verve-bg text-verve-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-verve-forest focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-verve-onForest"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 bg-verve-bg/85 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-6 rounded-full border border-verve-line bg-verve-surface/80 px-4 py-2.5 shadow-[0_8px_30px_-20px_rgba(12,59,46,0.4)] sm:px-5">
          <Link href="/" aria-label="Relay home" className="rounded-lg">
            <VerveLogo />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 text-[12px] font-medium text-verve-muted md:flex">
            <a href="#platform" className="transition-colors hover:text-verve-ink">Platform</a>
            <a href="#how" className="transition-colors hover:text-verve-ink">How it works</a>
            <a href="#roles" className="transition-colors hover:text-verve-ink">Roles</a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className="hidden md:inline-flex" />
            <Link
              href="/login"
              className="hidden rounded-full px-3 py-1.5 text-[12px] font-medium text-verve-muted transition-colors hover:text-verve-ink sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=register"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-verve-lime px-4 text-[12px] font-bold text-verve-forest transition-colors hover:bg-[#BDEB45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-forest focus-visible:ring-offset-2 focus-visible:ring-offset-verve-surface"
            >
              Get started <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>

      <main id="main">
        <section className="px-3 pt-3">
          <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[32px] bg-verve-forest px-6 py-16 text-verve-onForest ring-1 ring-inset ring-white/[0.06] sm:px-12 sm:py-20">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -right-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-verve-lime/[0.13] blur-3xl" />
              <div className="absolute bottom-[-30%] left-[8%] h-[320px] w-[320px] rounded-full bg-[#1E7A5E]/40 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(246,242,231,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(246,242,231,.7) 1px, transparent 1px)",
                  backgroundSize: "72px 72px",
                }}
              />
            </div>

            <div className="relative grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-verve-lime px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-verve-forest">
                  <Sparkles className="h-3 w-3" aria-hidden /> AI support &amp; incident intelligence
                </p>
                <h1 className="mt-6 text-[46px] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[62px]">
                  Support that feels{" "}
                  <span className="block text-verve-lime">effortless.</span>
                </h1>
                <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.7] text-verve-onForest/65">
                  Relay reads every incoming ticket, ranks it, and routes it with the reasoning attached. Customers get answers from your documentation. Agents get the next right thing.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-verve-lime px-5 text-[13px] font-bold text-verve-forest transition-colors hover:bg-[#BDEB45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime focus-visible:ring-offset-2 focus-visible:ring-offset-verve-forest"
                  >
                    Open the demo <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <a
                    href="#how"
                    className="inline-flex h-11 items-center rounded-full border border-verve-onForest/25 px-5 text-[13px] font-medium text-verve-onForest transition-colors hover:bg-white/5 focus-visible:ring-verve-lime focus-visible:ring-offset-verve-forest"
                  >
                    See how it works
                  </a>
                </div>
                <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-verve-onForest/60">
                  {["Explainable triage", "Cited answers", "Incident alerts"].map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-verve-lime" aria-hidden />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <figure className="relative mx-auto w-full max-w-[440px]">
                <div className="relative">
                  <div aria-hidden className="absolute inset-x-6 bottom-4 top-8 rotate-[3deg] rounded-[26px] border border-verve-lime/20 bg-[#0A3227]" />
                  <div className="relative -rotate-2 rounded-[22px] bg-[#FDFCF8] p-3 text-[#0C1B14] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A968D]">Triage queue</span>
                    <span className="flex items-center gap-1.5 rounded-full bg-[#EAF7D2] px-2 py-0.5 text-[9px] font-semibold text-[#3F6B1F]">
                      <span className="h-1 w-1 rounded-full bg-[#5C9A2B]" aria-hidden /> sample
                    </span>
                  </div>
                  <div className="mt-1 space-y-1.5">
                    {[
                      { title: "UPI payment failed at checkout", tag: "Critical", tone: "bg-[#FDECEA] text-[#A6271C]" },
                      { title: "Invoice shows a duplicate charge", tag: "High", tone: "bg-[#FEF1E6] text-[#A84808]" },
                      { title: "Cannot reset my password", tag: "Medium", tone: "bg-[#FBF5E1] text-[#7A5C00]" },
                    ].map((row) => (
                      <div key={row.title} className="flex items-center gap-2 rounded-xl border border-[#EFEADC] bg-white px-3 py-2.5">
                        <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-[#0C1B14]">{row.title}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${row.tone}`}>{row.tag}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 rounded-xl bg-[#0C3B2E] p-3.5 text-[#F6F2E7]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-[0.14em] text-[#F6F2E7]/45">Prediction</span>
                      <span className="text-[10px] font-semibold text-[#CBF35C]">Billing</span>
                    </div>
                    <p className="mt-1 text-[11.5px] font-semibold">Billing &amp; payments</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                      <div className="h-full w-[82%] rounded-full bg-[#CBF35C]" />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[9.5px]">
                      <span className="text-[#F6F2E7]/45">Routed to</span>
                      <span className="font-medium text-[#F6F2E7]/85">Billing · Priya S.</span>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-2 flex items-center gap-2 rounded-full bg-verve-lime px-3 py-1.5 text-[10px] font-bold text-verve-forest shadow-lg sm:-left-6">
                  <Radar className="h-3 w-3" aria-hidden /> 4 similar tickets
                </div>
                </div>
                <figcaption className="mt-7 text-center text-[10px] text-verve-onForest/55">
                  Illustrative interface with sample ticket data.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <div aria-hidden="true" className="mt-3 overflow-hidden border-y border-verve-forest/10 bg-verve-lime py-3.5 text-verve-forest">
          <div className="flex w-max items-center gap-8 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] motion-safe:animate-marquee motion-reduce:animate-none">
            {[0, 1].map((copy) => (
              <span key={copy} className="flex items-center gap-8">
                {MARQUEE.map((word) => (
                  <span key={`${copy}-${word}`} className="flex items-center gap-8">
                    {word}
                    <span className="text-verve-forest/40">✳</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section id="platform" className="mx-auto max-w-[1240px] scroll-mt-28 px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-verve-muted">The platform</p>
              <h2 className="mt-3 max-w-[18ch] text-[36px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[44px]">
                Everything the queue needs, in one place.
              </h2>
            </div>
            <p className="max-w-[38ch] text-[13px] leading-relaxed text-verve-muted">
              No extra tools and no re-entering context. Each capability works on the same ticket, from the first message to resolution.
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-6">
            <article className="rounded-[24px] bg-verve-forest p-7 text-verve-onForest md:col-span-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-verve-lime/15 text-verve-lime">
                <Gauge className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{PLATFORM[0].title}</h3>
              <p className="mt-2 max-w-[52ch] text-[12.5px] leading-relaxed text-verve-onForest/60">{PLATFORM[0].body}</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <div className="h-full w-[82%] rounded-full bg-verve-lime" />
                </div>
                <span className="text-[10px] font-semibold text-verve-lime">confidence visible on every ticket</span>
              </div>
            </article>

            <article className="rounded-[24px] bg-verve-lime p-7 text-verve-forest md:col-span-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-verve-forest/10 text-verve-forest">
                <BookOpen className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{PLATFORM[1].title}</h3>
              <p className="mt-2 max-w-[52ch] text-[12.5px] leading-relaxed text-verve-forest/75">{PLATFORM[1].body}</p>
            </article>

            {PLATFORM.slice(2).map(({ title, body }) => (
              <article key={title} className="rounded-[24px] border border-verve-line bg-verve-surface p-7 md:col-span-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-verve-forest/[0.06] text-verve-forest dark:bg-verve-lime/10 dark:text-verve-lime">
                  {title.startsWith("Incidents") ? <Radar className="h-4 w-4" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                </span>
                <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 max-w-[52ch] text-[12.5px] leading-relaxed text-verve-muted">{body}</p>
              </article>
            ))}

            <article className="mt-3 flex flex-col gap-4 rounded-[24px] border border-verve-line bg-verve-surface p-6 md:col-span-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-verve-forest/[0.06] text-verve-forest dark:bg-verve-lime/10 dark:text-verve-lime">
                  <RefreshCw className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold tracking-[-0.02em]">Corrections become training data</h3>
                  <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-verve-muted">
                    When an agent confirms or corrects a prediction, the decision is stored as labelled feedback for the next model.
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-verve-subtle">Closed loop</p>
            </article>
          </div>
        </section>

        <section id="how" className="scroll-mt-28 border-y border-verve-line bg-verve-soft">
          <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-verve-muted">How it works</p>
                <h2 className="mt-3 text-[36px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[44px]">
                  From message to owner.
                </h2>
              </div>
              <p className="max-w-[40ch] text-[13px] leading-relaxed text-verve-muted">
                The decision trail stays on the ticket, so agents can trust the routing and correct it when context differs.
              </p>
            </div>

            <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-verve-line bg-verve-line sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map(([title, body], index) => (
                <li key={title} className="bg-verve-surface p-5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-verve-lime text-[10px] font-bold text-verve-forest">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-[13px] font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-verve-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="roles" className="scroll-mt-28">
          <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-verve-muted">Roles</p>
                <h2 className="mt-3 text-[36px] font-semibold tracking-[-0.04em] sm:text-[44px]">Three people. One thread.</h2>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-verve-forest/20 px-4 py-2 text-[12px] font-semibold text-verve-forest transition-colors hover:bg-verve-forest hover:text-verve-onForest dark:border-verve-lime/30 dark:text-verve-lime dark:hover:bg-verve-lime dark:hover:text-verve-forest"
              >
                Try each role <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>

            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {ROLES.map(({ icon: Icon, role, body, tag }) => (
                <article key={role} className="rounded-[24px] border border-verve-line bg-verve-surface p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-verve-forest text-verve-lime">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-right text-[9px] font-bold uppercase tracking-[0.14em] text-verve-subtle">{tag}</span>
                  </div>
                  <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.02em]">{role}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-verve-muted">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-3 pb-3">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-8 rounded-[32px] bg-verve-lime px-6 py-14 text-verve-forest sm:px-12 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-verve-forest/60">Start here</p>
              <h2 className="mt-3 max-w-[16ch] text-[40px] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[52px]">
                Make support feel effortless.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-verve-forest px-5 text-[13px] font-bold text-verve-onForest transition-colors hover:bg-[#0A3227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-forest focus-visible:ring-offset-2 focus-visible:ring-offset-verve-lime"
              >
                Open the demo <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/login?mode=register"
                className="inline-flex h-11 items-center rounded-full border border-verve-forest/25 px-5 text-[13px] font-semibold text-verve-forest transition-colors hover:bg-verve-forest/5 focus-visible:ring-verve-forest focus-visible:ring-offset-verve-lime"
              >
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-3 pb-3">
        <div className="mx-auto max-w-[1240px] rounded-[28px] bg-verve-forest px-6 py-10 text-verve-onForest sm:px-10">
          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Link href="/" aria-label="Relay home" className="inline-block rounded-lg">
                <VerveLogo onDark />
              </Link>
              <p className="mt-4 max-w-[36ch] text-[12px] leading-relaxed text-verve-onForest/60">
                AI support and incident intelligence. Explainable triage, cited answers and early incident signals in one platform.
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-verve-onForest/50">Product</p>
              <ul className="mt-3 space-y-2 text-[12px] text-verve-onForest/70">
                <li><a href="#platform" className="hover:text-verve-lime">Capabilities</a></li>
                <li><a href="#how" className="hover:text-verve-lime">How it works</a></li>
                <li><a href="#roles" className="hover:text-verve-lime">Roles</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-verve-onForest/50">Access</p>
              <ul className="mt-3 space-y-2 text-[12px] text-verve-onForest/70">
                <li><Link href="/login" className="hover:text-verve-lime">Sign in</Link></li>
                <li><Link href="/login?mode=register" className="hover:text-verve-lime">Create an account</Link></li>
                <li><Link href="/forgot-password" className="hover:text-verve-lime">Forgot password</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-1 border-t border-white/10 pt-4 text-[10px] text-verve-onForest/50 sm:flex-row sm:items-center sm:justify-between">
            <span>Relay · AI support &amp; incident intelligence</span>
            <span>Next.js · Express · FastAPI · PostgreSQL + pgvector</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
