"use client";
import {
  AlertCircle, ArrowRight, BookOpen, ChevronRight, CircleDot, Eye, EyeOff, Fingerprint, Gauge, Headset, LockKeyhole, Radar, ShieldCheck, UserRound, Zap,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";
import { GoogleGlyph } from "./shared";

type Mode = "signin" | "register";

function BMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#22D3EE] to-[#6366F1] shadow-[0_0_26px_-6px_rgba(34,211,238,0.85)]">
        <svg width="17" height="17" viewBox="0 0 22 22" aria-hidden>
          <path d="M4 8h10l-3-3M18 14H8l3 3" stroke="#04121A" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && <span className="text-[14px] font-semibold uppercase tracking-[0.22em] text-white">Relay</span>}
    </span>
  );
}

function BField({
  label, type = "text", value, onChange, placeholder, error, autoComplete, trailing,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  trailing?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#7C8DA6]">{label}</span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={`h-11 w-full rounded-lg border bg-[#050A12] px-3 text-[14px] text-[#E6EDF7] outline-none transition placeholder:text-[#4B5A70] ${
            trailing ? "pr-10" : ""
          } ${
            error
              ? "border-[#FB7185]/70 focus:ring-2 focus:ring-[#FB7185]/15"
              : "border-[#1E293B] focus:border-[#22D3EE]/60 focus:ring-2 focus:ring-[#22D3EE]/15"
          }`}
        />
        {trailing}
      </div>
      {error && (
        <span role="alert" className="mt-1.5 flex items-center gap-1 text-[11px] text-[#FDA4AF]">
          <AlertCircle className="h-3 w-3" aria-hidden />
          {error}
        </span>
      )}
    </label>
  );
}

const B_DEMO = [
  { email: "user@demo.com", label: "user" },
  { email: "agent@demo.com", label: "agent" },
  { email: "admin@demo.com", label: "admin" },
];

export function AuthB() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  function changeMode(next: Mode) {
    setMode(next);
    setErrors({});
    setNotice(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (mode === "register" && name.trim().length < 2) next.name = "Enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    else if (mode === "register" && (!/[A-Za-z]/.test(password) || !/\d/.test(password))) {
      next.password = "Include at least one letter and one number.";
    }
    setErrors(next);
    setNotice(Object.keys(next).length === 0 ? "Preview surface: in the build this calls the existing auth API." : null);
  }

  return (
    <div className="relative min-h-[calc(100dvh-44px)] overflow-hidden bg-[#05070B] text-[#E6EDF7]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-24%] h-[540px] w-[900px] -translate-x-1/2 rounded-full bg-[#0891B2]/20 blur-[130px]" />
        <div className="absolute bottom-[-14%] right-[-8%] h-[460px] w-[560px] rounded-full bg-[#6D28D9]/20 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.22) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 50% 35%, black, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 35%, black, transparent 72%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100dvh-44px)] w-full max-w-[1120px] flex-col px-4 py-7 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/design-lab/b" aria-label="Relay home"><BMark /></Link>
          <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5F7189] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.9)]" aria-hidden />
            secure access
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[432px]">
            <div className="rounded-2xl bg-gradient-to-b from-[#22D3EE]/40 via-[#334155]/40 to-transparent p-px shadow-[0_0_90px_-24px_rgba(34,211,238,0.5)]">
              <div className="rounded-[15px] border border-white/5 bg-[#070C14]/95 p-6 backdrop-blur-xl sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#67E8F9]">Relay // access</p>
                <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white">
                  {mode === "signin" ? "Sign in to the console" : "Create your workspace account"}
                </h1>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#8FA0B8]">
                  {mode === "signin" ? "Authenticate to open your support workspace." : "One account, scoped to your role and team."}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1" role="tablist" aria-label="Authentication">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "signin"}
                    onClick={() => changeMode("signin")}
                    className={`h-9 rounded-md text-[12px] font-medium transition-all ${
                      mode === "signin"
                        ? "border border-[#22D3EE]/35 bg-[#0C1A28] text-[#CFFAFE] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "border border-transparent text-[#7C8DA6] hover:text-white"
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "register"}
                    onClick={() => changeMode("register")}
                    className={`h-9 rounded-md text-[12px] font-medium transition-all ${
                      mode === "register"
                        ? "border border-[#22D3EE]/35 bg-[#0C1A28] text-[#CFFAFE] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "border border-transparent text-[#7C8DA6] hover:text-white"
                    }`}
                  >
                    Register
                  </button>
                </div>

                <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
                  {mode === "register" && (
                    <BField label="Full name" value={name} onChange={setName} placeholder="Aditi Rao" autoComplete="name" error={errors.name} />
                  )}
                  <BField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoComplete="email" error={errors.email} />
                  <BField
                    label="Password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={setPassword}
                    placeholder={mode === "register" ? "Minimum 8 characters" : "••••••••"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    error={errors.password}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        aria-label={show ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#5F7189] transition-colors hover:text-[#CFFAFE]"
                      >
                        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      </button>
                    }
                  />

                  {mode === "signin" ? (
                    <div className="flex justify-end">
                      <Link href="/forgot-password" className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#67E8F9] underline-offset-4 hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-[#6B7C93]">
                      Accounts begin with the Customer role. An admin can widen access later.
                    </p>
                  )}

                  {notice && (
                    <p role="status" className="rounded-lg border border-[#34D399]/25 bg-[#34D399]/10 px-3 py-2 text-[11px] text-[#A7F3D0]">{notice}</p>
                  )}

                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#22D3EE] to-[#6366F1] text-[13px] font-semibold text-[#04121A] transition hover:brightness-110"
                  >
                    {mode === "signin" ? "Authenticate" : "Create account"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/[0.08]" aria-hidden />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#5F7189]">or</span>
                  <span className="h-px flex-1 bg-white/[0.08]" aria-hidden />
                </div>

                <button
                  type="button"
                  className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[#1E293B] bg-white/[0.03] text-[12px] font-medium text-[#E6EDF7] transition-colors hover:border-[#22D3EE]/30 hover:bg-white/[0.06]"
                >
                  <GoogleGlyph />
                  Continue with Google
                </button>

                <div className="mt-5 flex items-center justify-center gap-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5F7189]">
                  <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3 w-3" aria-hidden /> HttpOnly</span>
                  <span className="h-3 w-px bg-white/10" aria-hidden />
                  <span className="inline-flex items-center gap-1.5"><Fingerprint className="h-3 w-3" aria-hidden /> Role scoped</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5F7189]">demo</span>
              {B_DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { changeMode("signin"); setEmail(d.email); setPassword("Demo@1234"); }}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-[#9FB0C7] transition-colors hover:border-[#22D3EE]/40 hover:text-[#CFFAFE]"
                >
                  {d.label}
                </button>
              ))}
              <span className="font-mono text-[9px] text-[#4B5A70]">pw Demo@1234</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const B_FEATURES = [
  {
    icon: Gauge,
    title: "Explainable triage",
    body: "Category, priority and sentiment, with the confidence behind each prediction and the rules that adjusted it. Nothing is a black box.",
    span: "md:col-span-3",
  },
  {
    icon: BookOpen,
    title: "Answers that cite",
    body: "Retrieval runs against the documents you uploaded. Every answer links its source passage, and unanswered chats convert to tickets.",
    span: "md:col-span-3",
  },
  {
    icon: Radar,
    title: "Incident signals",
    body: "Similar tickets clustered in time become one potential incident, compared with normal volume, before the queue floods.",
    span: "md:col-span-2",
  },
  {
    icon: ShieldCheck,
    title: "Role-scoped by default",
    body: "Customers, agents and admins each get a distinct surface, enforced by the API on every request.",
    span: "md:col-span-2",
  },
  {
    icon: Zap,
    title: "Feedback loop",
    body: "When an agent corrects a prediction, the correction is stored as labelled data for the next model.",
    span: "md:col-span-2",
  },
];

const B_STEPS = [
  ["Ingest", "Web form or an unanswered chat becomes a ticket."],
  ["Analyse", "Classification, priority, sentiment, embeddings."],
  ["Route", "Least-busy agent in the owning team, or review."],
  ["Learn", "Corrections feed the next training round."],
];

export function HomeB() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#05070B] text-[#E6EDF7]">
      <header className="sticky top-11 z-40 border-b border-white/[0.06] bg-[#05070B]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1160px] items-center gap-8 px-4 sm:px-6">
          <Link href="/design-lab/b" aria-label="Relay home"><BMark /></Link>
          <nav className="hidden items-center gap-7 text-[12px] text-[#8FA0B8] md:flex">
            <a href="#platform" className="transition-colors hover:text-white">Platform</a>
            <a href="#pipeline" className="transition-colors hover:text-white">Pipeline</a>
            <a href="#roles" className="transition-colors hover:text-white">Roles</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-md px-3 py-2 text-[12px] font-medium text-[#9FB0C7] transition-colors hover:text-white">Sign in</Link>
            <Link href="/login" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#22D3EE] to-[#6366F1] px-4 text-[12px] font-semibold text-[#04121A] transition hover:brightness-110">
              Open console <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-[12%] top-[-18%] h-[420px] w-[620px] rounded-full bg-[#0891B2]/20 blur-[120px]" />
            <div className="absolute right-[-6%] top-[8%] h-[380px] w-[460px] rounded-full bg-[#6D28D9]/20 blur-[120px]" />
            <div
              className="absolute inset-0 opacity-[0.1]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(148,163,184,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.25) 1px, transparent 1px)",
                backgroundSize: "52px 52px",
                maskImage: "radial-gradient(ellipse at 50% 20%, black, transparent 70%)",
                WebkitMaskImage: "radial-gradient(ellipse at 50% 20%, black, transparent 70%)",
              }}
            />
          </div>

          <div className="relative mx-auto grid max-w-[1160px] items-center gap-16 px-4 pb-24 pt-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:pt-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/25 bg-[#22D3EE]/[0.07] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#67E8F9]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.9)]" aria-hidden />
                AI support &amp; incident intelligence
              </p>
              <h1 className="mt-6 text-[44px] font-semibold leading-[1.03] tracking-[-0.035em] text-white sm:text-[58px]">
                Triage at machine speed.
                <span className="block bg-gradient-to-r from-[#5EEAD4] via-[#67E8F9] to-[#A5B4FC] bg-clip-text text-transparent">
                  Judgment you can audit.
                </span>
              </h1>
              <p className="mt-6 max-w-[48ch] text-[15px] leading-[1.75] text-[#8FA0B8]">
                Relay reads every incoming ticket, ranks it against the queue, and routes it with the reasoning attached. Answers come from your documents, and emerging incidents surface before they become a flood.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[#22D3EE] to-[#6366F1] px-5 text-[13px] font-semibold text-[#04121A] transition hover:brightness-110">
                  Explore the console <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a href="#pipeline" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-5 text-[13px] font-medium text-[#C7D2E3] transition-colors hover:border-[#22D3EE]/30 hover:bg-white/[0.06]">
                  See the pipeline
                </a>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5F7189]">
                <span className="inline-flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-[#34D399]" aria-hidden /> Sources on every answer</span>
                <span className="inline-flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-[#22D3EE]" aria-hidden /> Confidence in the open</span>
                <span className="inline-flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-[#A5B4FC]" aria-hidden /> RBAC on every call</span>
              </div>
            </div>

            <div className="relative">
              <div aria-hidden className="absolute -inset-6 rounded-[28px] bg-gradient-to-tr from-[#22D3EE]/15 via-transparent to-[#6D28D9]/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#080D15]/90 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                  <div className="flex items-center gap-1.5" aria-hidden>
                    <span className="h-2 w-2 rounded-full bg-[#1E293B]" />
                    <span className="h-2 w-2 rounded-full bg-[#1E293B]" />
                    <span className="h-2 w-2 rounded-full bg-[#1E293B]" />
                  </div>
                  <span className="font-mono text-[10px] text-[#5F7189]">relay://triage/live</span>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#34D399]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" aria-hidden /> streaming
                  </span>
                </div>

                <div className="space-y-2 p-4">
                  {[
                    { title: "UPI payment failed at checkout", tag: "BILLING", conf: 97, tone: "#FB7185" },
                    { title: "Duplicate charge on invoice #8841", tag: "BILLING", conf: 91, tone: "#FBBF24" },
                    { title: "Assistant answer contradicted policy", tag: "KNOWLEDGE", conf: 74, tone: "#22D3EE" },
                  ].map((row) => (
                    <div key={row.title} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: row.tone }} aria-hidden />
                        <p className="min-w-0 flex-1 truncate text-[12px] text-[#DCE6F2]">{row.title}</p>
                        <span className="font-mono text-[9px] text-[#5F7189]">{row.tag}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#818CF8]" style={{ width: `${row.conf}%` }} />
                        </div>
                        <span className="font-mono text-[9px] text-[#8FA0B8]">{row.conf}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-px border-t border-white/[0.07] bg-white/[0.06]">
                  <div className="bg-[#080D15] px-4 py-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5F7189]">routed to</p>
                    <p className="mt-1 text-[11px] text-[#C7D2E3]">Billing · Priya S.</p>
                  </div>
                  <div className="bg-[#080D15] px-4 py-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5F7189]">rule applied</p>
                    <p className="mt-1 text-[11px] text-[#C7D2E3]">4 repeats → critical</p>
                  </div>
                </div>
              </div>

              <div className="ml-4 mt-4 hidden w-[250px] rounded-xl border border-[#FB7185]/25 bg-[#160A10]/95 p-3.5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur sm:block">
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#FDA4AF]">
                  <Radar className="h-3 w-3" aria-hidden /> potential incident
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#FECDD3]">4 similar billing tickets in 30 minutes</p>
                <p className="mt-1 font-mono text-[9px] text-[#9F6B75]">watch · compare to baseline</p>
              </div>

              <div className="absolute -right-3 -top-9 hidden items-center gap-2 rounded-full border border-white/10 bg-[#0B111C]/95 px-3 py-1.5 shadow-lg backdrop-blur sm:flex">
                <BookOpen className="h-3 w-3 text-[#67E8F9]" aria-hidden />
                <span className="font-mono text-[9px] text-[#9FB0C7]">answer cited · refund-policy.md</span>
              </div>
            </div>
          </div>
        </section>

        <div className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-7 gap-y-2 px-4 py-3.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5F7189] sm:px-6">
            <span className="text-[#3F4D61]">Built with</span>
            {["Next.js", "Express", "FastAPI", "PostgreSQL + pgvector", "Redis", "Docker"].map((s) => (
              <span key={s} className="text-[#7C8DA6]">{s}</span>
            ))}
          </div>
        </div>

        <section id="platform" className="mx-auto max-w-[1160px] px-4 py-24 sm:px-6">
          <div className="max-w-[54ch]">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#67E8F9]">Platform</p>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-white sm:text-[40px]">
              Five capabilities, one ticket.
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-[#8FA0B8]">
              Each capability works on the same ticket, so context never has to be re-entered between tools.
            </p>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-6">
            {B_FEATURES.map(({ icon: Icon, title, body, span }) => (
              <div key={title} className={`group rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-transparent p-6 transition-colors hover:border-[#22D3EE]/25 ${span}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#22D3EE]/20 bg-[#22D3EE]/[0.07]">
                  <Icon className="h-4 w-4 text-[#67E8F9]" aria-hidden />
                </span>
                <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#8FA0B8]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pipeline" className="border-y border-white/[0.06] bg-[#070B12]">
          <div className="mx-auto max-w-[1160px] px-4 py-24 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#A5B4FC]">Pipeline</p>
                <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-white sm:text-[40px]">
                  From message to owner, in one pass.
                </h2>
              </div>
              <p className="max-w-[36ch] text-[13px] leading-relaxed text-[#8FA0B8]">
                Every step leaves an audit trail on the ticket: what the model saw, what it decided, and who received it.
              </p>
            </div>

            <div className="relative mt-14">
              <div aria-hidden className="absolute left-0 right-0 top-[13px] hidden h-px bg-gradient-to-r from-[#22D3EE]/50 via-[#6366F1]/50 to-transparent md:block" />
              <ol className="grid gap-10 md:grid-cols-4">
                {B_STEPS.map(([title, body], i) => (
                  <li key={title} className="relative">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#22D3EE]/30 bg-[#08111C] font-mono text-[10px] text-[#67E8F9]">
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-[15px] font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-[#8FA0B8]">{body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-[1160px] px-4 py-24 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#67E8F9]">Access</p>
              <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-white">
                Three roles. One source of truth.
              </h2>
              <p className="mt-4 max-w-[40ch] text-[13px] leading-relaxed text-[#8FA0B8]">
                Permissions live in the API. The interface only reflects what a role is already allowed to do.
              </p>
              <Link href="/login" className="mt-7 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#67E8F9] underline-offset-4 hover:underline">
                Open the demo console <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>

            <div className="space-y-3">
              {[
                { icon: UserRound, role: "Customer", body: "Raises tickets, follows replies, and asks questions answered only from published help content.", tag: "OWN TICKETS" },
                { icon: Headset, role: "Agent", body: "Works the queue, reviews low-confidence predictions and sends grounded answers.", tag: "TEAM QUEUE" },
                { icon: ShieldCheck, role: "Admin", body: "Owns analytics, knowledge, teams, incidents and workspace settings.", tag: "WORKSPACE" },
              ].map(({ icon: Icon, role, body, tag }) => (
                <div key={role} className="flex items-start gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0B111C]">
                    <Icon className="h-4 w-4 text-[#A5B4FC]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[14px] font-semibold text-white">{role}</h3>
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5F7189]">{tag}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-[#8FA0B8]">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1160px] px-4 pb-24 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-[#22D3EE]/20 bg-[#070C14] px-6 py-16 text-center sm:px-12">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-[-60%] h-[360px] w-[620px] -translate-x-1/2 rounded-full bg-[#0891B2]/20 blur-[100px]" />
              <div className="absolute bottom-[-70%] left-[20%] h-[300px] w-[420px] rounded-full bg-[#6D28D9]/20 blur-[100px]" />
            </div>
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#67E8F9]">Ready when you are</p>
              <h2 className="mx-auto mt-4 max-w-[20ch] text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[42px]">
                Put the queue on a signal path.
              </h2>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[#22D3EE] to-[#6366F1] px-5 text-[13px] font-semibold text-[#04121A] transition hover:brightness-110">
                  Open the console <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/login" className="inline-flex h-11 items-center rounded-lg border border-white/10 bg-white/[0.03] px-5 text-[13px] font-medium text-[#C7D2E3] transition-colors hover:bg-white/[0.06]">
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto grid max-w-[1160px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <BMark />
            <p className="mt-4 max-w-[36ch] text-[12px] leading-relaxed text-[#6B7C93]">
              AI support and incident intelligence. Explainable triage, cited answers and early incident signals on one stack.
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5F7189]">Platform</p>
            <ul className="mt-3 space-y-2 text-[12px] text-[#8FA0B8]">
              <li><a href="#platform" className="hover:text-white">Capabilities</a></li>
              <li><a href="#pipeline" className="hover:text-white">Pipeline</a></li>
              <li><a href="#roles" className="hover:text-white">Roles</a></li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5F7189]">Access</p>
            <ul className="mt-3 space-y-2 text-[12px] text-[#8FA0B8]">
              <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
              <li><Link href="/login" className="hover:text-white">Create an account</Link></li>
              <li><Link href="/forgot-password" className="hover:text-white">Forgot password</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06]">
          <div className="mx-auto flex max-w-[1160px] flex-col gap-1 px-4 py-5 font-mono text-[9px] text-[#4B5A70] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>RELAY · SELF-HOSTED AI SUPPORT</span>
            <span>NEXT.JS / EXPRESS / FASTAPI / POSTGRES / REDIS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
