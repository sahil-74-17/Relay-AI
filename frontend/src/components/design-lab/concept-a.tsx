"use client";
import {
  AlertCircle, ArrowRight, BookOpen, Check, Eye, EyeOff, Gauge, Headset, Lock, Radar, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";
import { GoogleGlyph } from "./shared";

type Mode = "signin" | "register";

function AMark({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const bg = tone === "light" ? "#F7F4EF" : "#0B1B2A";
  const fg = tone === "light" ? "#0B1B2A" : "#F7F4EF";
  const text = tone === "light" ? "#F7F4EF" : "#0B1B2A";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[7px]" style={{ background: bg }}>
        <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden>
          <path d="M4 8h10l-3-3M18 14H8l3 3" stroke={fg} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-serif text-[19px] font-semibold tracking-tight" style={{ color: text }}>Relay</span>
    </span>
  );
}

function AField({
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
      <span className="mb-1.5 block text-[12px] font-medium tracking-[0.01em] text-[#4B5563]">{label}</span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={`h-11 w-full rounded-md border bg-white px-3 text-[14px] text-[#0B1B2A] outline-none transition placeholder:text-[#A79F92] ${
            trailing ? "pr-10" : ""
          } ${
            error
              ? "border-[#B42318] focus:ring-2 focus:ring-[#B42318]/15"
              : "border-[#DCD6CB] focus:border-[#1F6F5C] focus:ring-2 focus:ring-[#1F6F5C]/15"
          }`}
        />
        {trailing}
      </div>
      {error && (
        <span role="alert" className="mt-1.5 flex items-center gap-1 text-[12px] text-[#B42318]">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {error}
        </span>
      )}
    </label>
  );
}

const A_DEMO = [
  { email: "user@demo.com", label: "Customer" },
  { email: "agent@demo.com", label: "Agent" },
  { email: "admin@demo.com", label: "Admin" },
];

export function AuthA() {
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
    setNotice(Object.keys(next).length === 0 ? "Preview surface: in the build this submits to the existing auth API." : null);
  }

  function fillDemo(target: string) {
    changeMode("signin");
    setEmail(target);
    setPassword("Demo@1234");
  }

  return (
    <div className="min-h-[calc(100dvh-44px)] bg-[#F7F4EF] lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden overflow-hidden bg-[#0B1B2A] px-12 py-11 lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(247,244,239,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(247,244,239,.18) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 35% 45%, black, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse at 35% 45%, black, transparent 72%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[#1F6F5C]/25 blur-3xl" />

        <div className="relative"><AMark tone="light" /></div>

        <div className="relative max-w-[430px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#C7A96D]">AI support &amp; incident intelligence</p>
          <h1 className="mt-5 font-serif text-[40px] leading-[1.06] tracking-[-0.01em] text-[#F7F4EF] xl:text-[47px]">
            Support that earns its place at the table.
          </h1>
          <p className="mt-5 text-[14px] leading-relaxed text-[#F7F4EF]/60">
            One workspace where triage, grounded answers and incident signals meet, so nothing important waits in a queue.
          </p>

          <ul className="mt-9 space-y-4">
            {[
              ["Every prediction shows its reasoning", "Category, priority and the rules that adjusted them."],
              ["Answers cite your own documents", "No outside knowledge, no invented policy."],
              ["Role-based from the first click", "Customers, agents and admins each see their own workspace."],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#F7F4EF]/25">
                  <Check className="h-3 w-3 text-[#D9C39A]" aria-hidden />
                </span>
                <span>
                  <span className="block text-[13px] font-medium text-[#F7F4EF]/90">{title}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-[#F7F4EF]/45">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] leading-relaxed text-[#F7F4EF]/35">
          Relay · Built for teams that can&apos;t afford to miss a ticket.
        </p>
      </aside>

      <section className="flex min-h-[calc(100dvh-44px)] items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <AMark />
            <Link href="/design-lab" className="text-[12px] text-[#8A8172] underline-offset-4 hover:underline">Design lab</Link>
          </div>

          <div className="rounded-xl border border-[#E6E0D5] bg-white p-6 shadow-[0_1px_2px_rgba(11,27,42,0.05),0_28px_60px_-38px_rgba(11,27,42,0.35)] sm:p-8">
            <h1 className="font-serif text-[30px] leading-tight tracking-[-0.01em] text-[#0B1B2A]">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-[13px] text-[#6B7280]">
              {mode === "signin" ? "Sign in to pick up where your team left off." : "Start with a customer workspace. Roles are assigned by your admin."}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-[#EFEBE3] p-1" role="tablist" aria-label="Authentication">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                onClick={() => changeMode("signin")}
                className={`h-9 rounded-md text-[13px] font-medium transition-all ${
                  mode === "signin" ? "bg-white text-[#0B1B2A] shadow-[0_1px_3px_rgba(11,27,42,0.12)]" : "text-[#6B6257] hover:text-[#0B1B2A]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => changeMode("register")}
                className={`h-9 rounded-md text-[13px] font-medium transition-all ${
                  mode === "register" ? "bg-white text-[#0B1B2A] shadow-[0_1px_3px_rgba(11,27,42,0.12)]" : "text-[#6B6257] hover:text-[#0B1B2A]"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              {mode === "register" && (
                <AField label="Full name" value={name} onChange={setName} placeholder="Aditi Rao" autoComplete="name" error={errors.name} />
              )}
              <AField label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoComplete="email" error={errors.email} />
              <AField
                label="Password"
                type={show ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                error={errors.password}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#A79F92] transition-colors hover:text-[#0B1B2A]"
                  >
                    {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                }
              />

              {mode === "signin" ? (
                <div className="-mt-0.5 flex justify-end">
                  <Link href="/forgot-password" className="text-[12px] font-medium text-[#1F6F5C] underline-offset-4 hover:underline">
                    Forgot password?
                  </Link>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-[#8A8172]">
                  New accounts start with the Customer role. An admin can promote you to Agent or Admin later.
                </p>
              )}

              {notice && (
                <p role="status" className="rounded-md bg-[#ECF5F1] px-3 py-2 text-[12px] text-[#185A4B]">{notice}</p>
              )}

              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0B1B2A] text-[14px] font-medium text-[#F7F4EF] transition-colors hover:bg-[#132C42]"
              >
                {mode === "signin" ? "Sign in" : "Create account"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] text-[#A79F92]">
              <span className="h-px flex-1 bg-[#EDE8DE]" aria-hidden />
              or
              <span className="h-px flex-1 bg-[#EDE8DE]" aria-hidden />
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-[#DCD6CB] bg-white text-[13px] font-medium text-[#0B1B2A] transition-colors hover:bg-[#FBF9F5]"
            >
              <GoogleGlyph />
              Continue with Google
            </button>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#8A8172]">
              <Lock className="h-3 w-3" aria-hidden />
              Session stored in an HttpOnly cookie
            </p>
          </div>

          <div className="mt-5 rounded-lg border border-[#E6E0D5] bg-white/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8172]">Demo access</span>
              {A_DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => fillDemo(d.email)}
                  className="rounded-full border border-[#DCD6CB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4B5563] transition-colors hover:border-[#1F6F5C]/40 hover:text-[#1F6F5C]"
                >
                  {d.label}
                </button>
              ))}
              <span className="text-[10px] text-[#A79F92]">Password Demo@1234</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const A_FEATURES = [
  {
    n: "01",
    icon: Gauge,
    title: "Triage that explains itself",
    body: "Category, priority and sentiment on every ticket, with the confidence behind each call and the business rules that adjusted it.",
  },
  {
    n: "02",
    icon: BookOpen,
    title: "Answers with sources",
    body: "The assistant reads only the policies and FAQs you upload, and shows the exact passage behind every answer it gives.",
  },
  {
    n: "03",
    icon: Radar,
    title: "Incidents, not ticket floods",
    body: "Similar tickets arriving close together are grouped into one potential incident, with volume compared against a normal week.",
  },
];

const A_STEPS = [
  ["Submitted", "Web form, or a chat the assistant couldn't answer."],
  ["Analysed", "Models classify category, priority and sentiment."],
  ["Adjusted", "Rules raise what matters: critical words, repeat issues."],
  ["Routed", "To the owning team's least busy agent, or held for review."],
  ["Learned from", "Agent corrections become labelled training feedback."],
];

const A_ROLES = [
  { icon: UserRound, role: "Customer", body: "Raise tickets, follow replies, and ask the assistant questions grounded in your help centre.", access: "Own tickets + assistant" },
  { icon: Headset, role: "Agent", body: "Work the queue, confirm or correct low-confidence predictions, and answer from the knowledge base.", access: "Team queue + review" },
  { icon: ShieldCheck, role: "Admin", body: "See analytics, manage the knowledge base, groups and teams, and watch incident signals.", access: "Workspace-wide" },
];

export function HomeA() {
  return (
    <div className="overflow-x-clip bg-[#F7F4EF] text-[#0B1B2A]">
      <header className="sticky top-11 z-40 border-b border-[#E4DFD6] bg-[#F7F4EF]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-8 px-4 sm:px-6">
          <Link href="/design-lab/a" aria-label="Relay home"><AMark /></Link>
          <nav className="hidden items-center gap-7 text-[13px] text-[#4B5563] md:flex">
            <a href="#platform" className="transition-colors hover:text-[#0B1B2A]">Platform</a>
            <a href="#how" className="transition-colors hover:text-[#0B1B2A]">How it works</a>
            <a href="#roles" className="transition-colors hover:text-[#0B1B2A]">Roles</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-md px-3 py-2 text-[13px] font-medium text-[#4B5563] transition-colors hover:text-[#0B1B2A]">Sign in</Link>
            <Link href="/login" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#0B1B2A] px-4 text-[13px] font-medium text-[#F7F4EF] transition-colors hover:bg-[#132C42]">
              Get started <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1180px] items-center gap-14 px-4 pb-24 pt-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:pt-24">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A8172]">
              <span className="h-px w-7 bg-[#C7A96D]" aria-hidden />
              AI support &amp; incident intelligence
            </p>
            <h1 className="mt-6 max-w-[15ch] font-serif text-[46px] leading-[1.02] tracking-[-0.02em] sm:text-[58px]">
              Every ticket, understood before anyone opens it.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.75] text-[#5C6675]">
              Relay reads incoming support requests, ranks them, and routes them to the right person. Agents start with context, customers get answers grounded in your own documentation.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1F6F5C] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#185A4B]">
                Open the demo <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a href="#how" className="inline-flex h-11 items-center rounded-md border border-[#CFC8BA] bg-white px-5 text-[13px] font-medium text-[#0B1B2A] transition-colors hover:bg-[#FBF9F5]">
                See how it works
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[#6B7280]">
              <span className="inline-flex items-center gap-1.5"><CheckCircleA /> Role-based access</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircleA /> Answers cite sources</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircleA /> Runs on your stack</span>
            </div>
          </div>

          <div className="relative min-w-0 lg:pl-4">
            <div aria-hidden className="absolute -inset-5 rounded-3xl bg-[#1F6F5C]/[0.06] blur-2xl" />
            <div className="relative overflow-hidden rounded-xl border border-[#E4DFD6] bg-white shadow-[0_30px_70px_-40px_rgba(11,27,42,0.45)]">
              <div className="flex items-center justify-between border-b border-[#EDE8DE] px-4 py-3">
                <div className="flex items-center gap-1.5" aria-hidden>
                  <span className="h-2 w-2 rounded-full bg-[#E4DFD6]" />
                  <span className="h-2 w-2 rounded-full bg-[#E4DFD6]" />
                  <span className="h-2 w-2 rounded-full bg-[#E4DFD6]" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#A79F92]">relay / triage queue</span>
                <span className="rounded-full bg-[#ECF5F1] px-2 py-0.5 text-[10px] font-medium text-[#1F6F5C]">Live</span>
              </div>

              <div className="divide-y divide-[#F0ECE4]">
                {[
                  { id: "TCK-0042", title: "UPI payment failed at checkout", meta: "Billing · 2 min ago", tone: "critical", label: "Critical" },
                  { id: "TCK-0041", title: "Invoice shows a duplicate charge", meta: "Billing · 6 min ago", tone: "high", label: "High" },
                  { id: "TCK-0039", title: "Cannot reset my password", meta: "Account · 11 min ago", tone: "medium", label: "Medium" },
                ].map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      t.tone === "critical" ? "bg-[#B42318]" : t.tone === "high" ? "bg-[#B45A12]" : "bg-[#9A7B18]"
                    }`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-[#0B1B2A]">{t.title}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[#A79F92]">{t.id} · {t.meta}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      t.tone === "critical" ? "bg-[#FDECEA] text-[#A6271C]" : t.tone === "high" ? "bg-[#FEF1E6] text-[#A84808]" : "bg-[#FBF5E1] text-[#7A5C00]"
                    }`}>{t.label}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#EDE8DE] bg-[#FBF9F5] p-4">
                <div className="rounded-lg bg-[#0B1B2A] p-4 text-[#F7F4EF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#F7F4EF]/45">Prediction</span>
                    <span className="font-mono text-[10px] text-[#C7A96D]">97% confidence</span>
                  </div>
                  <p className="mt-2 text-[12px] font-medium">Billing &amp; payments</p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[97%] rounded-full bg-[#C7A96D]" />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
                    <span className="text-[10px] text-[#F7F4EF]/45">Routed to</span>
                    <span className="text-[10px] font-medium text-[#F7F4EF]/85">Billing · Priya S.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-16 right-0 hidden rounded-lg border border-[#E4DFD6] bg-white px-3.5 py-2.5 shadow-[0_16px_40px_-24px_rgba(11,27,42,0.4)] sm:block">
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A8172]">
                <Sparkles className="h-3 w-3 text-[#C7A96D]" aria-hidden /> Incident signal
              </p>
              <p className="mt-1 text-[11px] text-[#4B5563]">4 similar billing tickets in 30 min</p>
            </div>
          </div>
        </section>

        <section id="platform" className="border-y border-[#E4DFD6] bg-white">
          <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8A8172]">The platform</p>
                <h2 className="mt-3 max-w-[22ch] font-serif text-[34px] leading-[1.12] tracking-[-0.015em]">
                  A calmer queue, from first message to resolution.
                </h2>
              </div>
              <p className="max-w-[38ch] text-[13px] leading-relaxed text-[#6B7280]">
                Every capability exists to reduce the distance between a customer&apos;s problem and the person who can solve it.
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[#EDE8DE] bg-[#EDE8DE] md:grid-cols-3">
              {A_FEATURES.map(({ n, icon: Icon, title, body }) => (
                <div key={n} className="bg-white p-7">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#B08A4F]">{n}</span>
                    <Icon className="h-4 w-4 text-[#1F6F5C]" aria-hidden />
                  </div>
                  <h3 className="mt-6 text-[16px] font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-[#6B7280]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8A8172]">How it works</p>
              <h2 className="mt-3 font-serif text-[34px] leading-[1.12] tracking-[-0.015em]">Five steps, none of them hidden.</h2>
            </div>
            <p className="max-w-[36ch] text-[13px] leading-relaxed text-[#6B7280]">
              The pipeline is visible on every ticket, so agents can trust the ranking and correct it when context differs.
            </p>
          </div>

          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {A_STEPS.map(([title, body], i) => (
              <li key={title} className="relative border-t border-[#D8D1C4] pt-4">
                <span className="font-mono text-[10px] text-[#B08A4F]">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-[13px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#6B7280]">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="roles" className="border-y border-[#E4DFD6] bg-white">
          <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8A8172]">One workspace, three views</p>
              <h2 className="mt-3 max-w-[16ch] font-serif text-[34px] leading-[1.12] tracking-[-0.015em]">
                Everyone sees exactly what they need.
              </h2>
              <p className="mt-5 max-w-[34ch] text-[13px] leading-relaxed text-[#6B7280]">
                Permissions are enforced by the API on every request, not just hidden in the interface.
              </p>
              <Link href="/login" className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1F6F5C] underline-offset-4 hover:underline">
                Try each role in the demo <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {A_ROLES.map(({ icon: Icon, role, body, access }) => (
                <div key={role} className="rounded-lg border border-[#E4DFD6] bg-[#FBF9F5] p-5">
                  <Icon className="h-5 w-5 text-[#1F6F5C]" aria-hidden />
                  <h3 className="mt-4 text-[14px] font-semibold">{role}</h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-[#6B7280]">{body}</p>
                  <p className="mt-4 border-t border-[#E4DFD6] pt-3 text-[10px] uppercase tracking-[0.12em] text-[#8A8172]">{access}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0B1B2A] text-[#F7F4EF]">
          <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
            <div className="grid items-end gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#C7A96D]">Start here</p>
                <h2 className="mt-4 max-w-[20ch] font-serif text-[38px] leading-[1.08] tracking-[-0.015em] sm:text-[44px]">
                  Give every ticket a clear next step.
                </h2>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-md bg-[#F7F4EF] px-5 text-[13px] font-medium text-[#0B1B2A] transition-colors hover:bg-white">
                  Open the demo <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/login" className="inline-flex h-11 items-center rounded-md border border-[#F7F4EF]/25 px-5 text-[13px] font-medium text-[#F7F4EF] transition-colors hover:bg-white/5">
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E4DFD6] bg-[#F7F4EF]">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <AMark />
            <p className="mt-4 max-w-[34ch] text-[12px] leading-relaxed text-[#6B7280]">
              An AI support and incident intelligence platform. Triage, grounded answers and early incident signals in one place.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8172]">Product</p>
            <ul className="mt-3 space-y-2 text-[12px] text-[#4B5563]">
              <li><a href="#platform" className="hover:text-[#0B1B2A]">Capabilities</a></li>
              <li><a href="#how" className="hover:text-[#0B1B2A]">How it works</a></li>
              <li><a href="#roles" className="hover:text-[#0B1B2A]">Roles &amp; access</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8172]">Access</p>
            <ul className="mt-3 space-y-2 text-[12px] text-[#4B5563]">
              <li><Link href="/login" className="hover:text-[#0B1B2A]">Sign in</Link></li>
              <li><Link href="/login" className="hover:text-[#0B1B2A]">Create an account</Link></li>
              <li><Link href="/forgot-password" className="hover:text-[#0B1B2A]">Forgot password</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#E4DFD6]">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-1 px-4 py-5 text-[11px] text-[#8A8172] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>Relay · AI support &amp; incident intelligence</span>
            <span className="font-mono text-[10px]">Next.js · Express · FastAPI · PostgreSQL + pgvector</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CheckCircleA() {
  return (
    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#CFC8BA]">
      <Check className="h-2 w-2 text-[#1F6F5C]" aria-hidden />
    </span>
  );
}
