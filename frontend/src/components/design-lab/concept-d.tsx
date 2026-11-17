"use client";
import {
  AlertCircle, ArrowRight, ArrowUpRight, BookOpen, Check, Eye, EyeOff, Gauge, Headset, Radar, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";
import { GoogleGlyph } from "./shared";

type Mode = "signin" | "register";

function DMark({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const bg = tone === "light" ? "#CBF35C" : "#0C3B2E";
  const fg = tone === "light" ? "#0C3B2E" : "#CBF35C";
  const text = tone === "light" ? "#F6F2E7" : "#0C3B2E";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: bg }}>
        <svg width="17" height="17" viewBox="0 0 22 22" aria-hidden>
          <path d="M4 8h10l-3-3M18 14H8l3 3" stroke={fg} strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[17px] font-bold tracking-[-0.035em]" style={{ color: text }}>Relay</span>
    </span>
  );
}

function DField({
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
      <span className="mb-1.5 block text-[12px] font-medium text-[#4A5A50]">{label}</span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={`h-11 w-full rounded-xl border bg-white px-3.5 text-[14px] text-[#0C1B14] outline-none transition placeholder:text-[#9AA79E] ${
            trailing ? "pr-10" : ""
          } ${
            error
              ? "border-[#B42318] focus:ring-4 focus:ring-[#B42318]/10"
              : "border-[#E1DCCD] focus:border-[#0C3B2E] focus:ring-4 focus:ring-[#CBF35C]/30"
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

const D_DEMO = [
  { email: "user@demo.com", label: "Customer" },
  { email: "agent@demo.com", label: "Agent" },
  { email: "admin@demo.com", label: "Admin" },
];

export function AuthD() {
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
    <div className="min-h-[calc(100dvh-44px)] bg-[#F6F2E7] p-3 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100dvh-68px)] max-w-[1280px] overflow-hidden rounded-[26px] bg-white shadow-[0_40px_100px_-50px_rgba(12,59,46,0.55)] sm:min-h-[calc(100dvh-84px)] lg:grid-cols-[1.02fr_0.98fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0C3B2E] p-10 text-[#F6F2E7] lg:flex xl:p-14">
          <div aria-hidden className="pointer-events-none absolute -right-16 top-1/4 h-64 w-64 rounded-full bg-[#CBF35C]/25 blur-3xl" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(246,242,231,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(246,242,231,.5) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />

          <div className="relative"><DMark tone="light" /></div>

          <div className="relative max-w-[420px]">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#CBF35C] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0C3B2E]">
              <Sparkles className="h-3 w-3" aria-hidden /> AI support, human pace
            </p>
            <h1 className="mt-5 text-[42px] font-semibold leading-[1.02] tracking-[-0.045em] xl:text-[48px]">
              Welcome to the calm side of support.
            </h1>
            <p className="mt-5 text-[14px] leading-relaxed text-[#F6F2E7]/60">
              Relay sorts the queue, shows its reasoning, and gets the right ticket to the right person. Your team keeps the judgment.
            </p>

            <ul className="mt-8 space-y-3">
              {["Explainable triage on every ticket", "Answers grounded in your documents", "Incident signals before the flood"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[13px] text-[#F6F2E7]/85">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#CBF35C]">
                    <Check className="h-3 w-3 text-[#0C3B2E]" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#F6F2E7]/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#CBF35C]" aria-hidden />
            Customer · Agent · Admin
          </div>
        </aside>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:py-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-7 flex items-center justify-between lg:hidden">
              <DMark />
              <Link href="/design-lab" className="text-[11px] font-medium text-[#4A5A50] underline underline-offset-4">Design lab</Link>
            </div>

            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.035em] text-[#0C1B14]">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1.5 text-[13px] text-[#5C6B61]">
              {mode === "signin" ? "Pick up exactly where you left off." : "Start with a customer workspace, upgrade roles later."}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-[#F1EDE2] p-1" role="tablist" aria-label="Authentication">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                onClick={() => changeMode("signin")}
                className={`h-9 rounded-full text-[12.5px] font-semibold transition-all ${
                  mode === "signin" ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#4A5A50] hover:text-[#0C3B2E]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => changeMode("register")}
                className={`h-9 rounded-full text-[12.5px] font-semibold transition-all ${
                  mode === "register" ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#4A5A50] hover:text-[#0C3B2E]"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              {mode === "register" && (
                <DField label="Full name" value={name} onChange={setName} placeholder="Aditi Rao" autoComplete="name" error={errors.name} />
              )}
              <DField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoComplete="email" error={errors.email} />
              <DField
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
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#9AA79E] transition-colors hover:text-[#0C3B2E]"
                  >
                    {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                }
              />

              {mode === "signin" ? (
                <div className="-mt-0.5 flex justify-end">
                  <Link href="/forgot-password" className="text-[12px] font-semibold text-[#0C3B2E] underline decoration-[#CBF35C] decoration-2 underline-offset-4 hover:decoration-[#0C3B2E]">
                    Forgot password?
                  </Link>
                </div>
              ) : (
                <p className="text-[11.5px] leading-relaxed text-[#7C8A80]">
                  New accounts start with the Customer role. An admin can widen your access.
                </p>
              )}

              {notice && (
                <p role="status" className="rounded-xl bg-[#F1EDE2] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#3A4A40]">{notice}</p>
              )}

              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0C3B2E] text-[13px] font-semibold text-white transition-colors hover:bg-[#0A3227]"
              >
                {mode === "signin" ? "Sign in" : "Create account"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A3AFA7]">
              <span className="h-px flex-1 bg-[#EDE8DB]" aria-hidden />
              or
              <span className="h-px flex-1 bg-[#EDE8DB]" aria-hidden />
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#E1DCCD] bg-white text-[12.5px] font-semibold text-[#0C1B14] transition-colors hover:bg-[#FBFAF6]"
            >
              <GoogleGlyph />
              Continue with Google
            </button>

            <div className="mt-6 rounded-xl bg-[#F8F5EC] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A968D]">Demo</span>
                {D_DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => { changeMode("signin"); setEmail(d.email); setPassword("Demo@1234"); }}
                    className="rounded-full border border-[#E1DCCD] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4A5A50] transition-colors hover:border-[#0C3B2E]/30 hover:text-[#0C3B2E]"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-[#9AA79E]">Password: Demo@1234</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const D_CARDS = [
  {
    icon: Gauge,
    title: "Triage that shows its work",
    body: "Category, priority and sentiment, with the confidence and the rules that adjusted them. Agents see the reasoning, not just the verdict.",
    tone: "dark",
    span: "md:col-span-4",
  },
  {
    icon: BookOpen,
    title: "Answers from your docs",
    body: "Retrieval over uploaded policies and FAQs. Each answer links its source passage.",
    tone: "lime",
    span: "md:col-span-2",
  },
  {
    icon: Radar,
    title: "Incidents before the flood",
    body: "Similar tickets arriving together are grouped into a potential incident and compared with normal volume.",
    tone: "light",
    span: "md:col-span-3",
  },
  {
    icon: ShieldCheck,
    title: "Roles that hold",
    body: "Customer, Agent and Admin surfaces, enforced by the API on every request, not hidden in the UI.",
    tone: "light",
    span: "md:col-span-3",
  },
];

const D_STEPS = [
  ["Submitted", "Web form or unanswered chat."],
  ["Analysed", "Models classify, score and embed."],
  ["Adjusted", "Rules raise what matters."],
  ["Routed", "Owning team, least busy agent."],
  ["Learned", "Corrections become labelled data."],
];

export function HomeD() {
  return (
    <div className="min-h-dvh bg-[#F6F2E7] text-[#0C1B14]">
      <style>{`@keyframes lab-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>

      <header className="sticky top-11 z-40 bg-[#F6F2E7]/90 px-3 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-8 rounded-full border border-[#0C3B2E]/10 bg-white/80 px-4 py-2.5 shadow-[0_8px_30px_-20px_rgba(12,59,46,0.4)] sm:px-5">
          <Link href="/design-lab/d" aria-label="Relay home"><DMark /></Link>
          <nav className="hidden items-center gap-6 text-[12px] font-medium text-[#4A5A50] md:flex">
            <a href="#platform" className="transition-colors hover:text-[#0C3B2E]">Platform</a>
            <a href="#how" className="transition-colors hover:text-[#0C3B2E]">How it works</a>
            <a href="#roles" className="transition-colors hover:text-[#0C3B2E]">Roles</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-3 py-1.5 text-[12px] font-medium text-[#4A5A50] transition-colors hover:text-[#0C3B2E] sm:block">Sign in</Link>
            <Link href="/login" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#CBF35C] px-4 text-[12px] font-bold text-[#0C3B2E] transition-colors hover:bg-[#BDEB45]">
              Get started <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-3 pt-3">
          <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[32px] bg-[#0C3B2E] px-6 py-16 text-[#F6F2E7] sm:px-12 sm:py-20">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -right-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-[#CBF35C]/[0.13] blur-3xl" />
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
                <p className="inline-flex items-center gap-2 rounded-full bg-[#CBF35C] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0C3B2E]">
                  <Sparkles className="h-3 w-3" aria-hidden /> AI support &amp; incident intelligence
                </p>
                <h1 className="mt-6 text-[46px] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[62px]">
                  Support that feels
                  <span className="block text-[#CBF35C]">effortless.</span>
                </h1>
                <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.7] text-[#F6F2E7]/65">
                  Relay reads every incoming ticket, ranks it, and routes it with the reasoning attached. Customers get answers from your documentation. Agents get the next right thing.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#CBF35C] px-5 text-[13px] font-bold text-[#0C3B2E] transition-colors hover:bg-[#BDEB45]">
                    Open the demo <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <a href="#how" className="inline-flex h-11 items-center rounded-full border border-[#F6F2E7]/25 px-5 text-[13px] font-medium text-[#F6F2E7] transition-colors hover:bg-white/5">
                    See how it works
                  </a>
                </div>
                <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#F6F2E7]/45">
                  <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#CBF35C]" aria-hidden /> Explainable triage</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#CBF35C]" aria-hidden /> Cited answers</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#CBF35C]" aria-hidden /> Incident alerts</span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[440px] pb-6">
                <div aria-hidden className="absolute inset-x-6 bottom-0 top-8 rotate-[3deg] rounded-[26px] border border-[#CBF35C]/20 bg-[#0A3227]" />
                <div className="relative rotate-[-2deg] rounded-[22px] bg-[#FDFCF8] p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A968D]">Triage queue</span>
                    <span className="flex items-center gap-1.5 rounded-full bg-[#EAF7D2] px-2 py-0.5 text-[9px] font-semibold text-[#3F6B1F]">
                      <span className="h-1 w-1 rounded-full bg-[#5C9A2B]" aria-hidden /> live
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
                      <span className="text-[10px] font-semibold text-[#CBF35C]">97%</span>
                    </div>
                    <p className="mt-1 text-[11.5px] font-semibold">Billing &amp; payments</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[97%] rounded-full bg-[#CBF35C]" />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[9.5px]">
                      <span className="text-[#F6F2E7]/45">Routed to</span>
                      <span className="font-medium text-[#F6F2E7]/85">Billing · Priya S.</span>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-1 -left-2 flex items-center gap-2 rounded-full bg-[#CBF35C] px-3 py-1.5 text-[10px] font-bold text-[#0C3B2E] shadow-lg sm:-left-6">
                  <Radar className="h-3 w-3" aria-hidden /> 4 similar tickets
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-3 overflow-hidden border-y border-[#0C3B2E]/10 bg-[#CBF35C] py-3.5 text-[#0C3B2E]">
          <div className="flex w-max animate-[lab-marquee_26s_linear_infinite] items-center gap-8 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em]">
            {[0, 1].map((copy) => (
              <span key={copy} className="flex items-center gap-8" aria-hidden={copy === 1}>
                {["AI triage", "Grounded answers", "Incident detection", "Role-based access", "Analytics", "Feedback loop"].map((word) => (
                  <span key={word} className="flex items-center gap-8">
                    {word}
                    <span className="text-[#0C3B2E]/40" aria-hidden>✳</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section id="platform" className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5C6B61]">The platform</p>
              <h2 className="mt-3 max-w-[18ch] text-[36px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[44px]">
                Everything the queue needs, in one place.
              </h2>
            </div>
            <p className="max-w-[38ch] text-[13px] leading-relaxed text-[#5C6B61]">
              No extra tools, no re-entering context. Each capability works on the same ticket from first message to resolution.
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-6">
            {D_CARDS.map(({ icon: Icon, title, body, tone, span }) => (
              <div
                key={title}
                className={`rounded-[24px] p-7 ${span} ${
                  tone === "dark"
                    ? "bg-[#0C3B2E] text-[#F6F2E7]"
                    : tone === "lime"
                      ? "bg-[#CBF35C] text-[#0C3B2E]"
                      : "border border-[#0C3B2E]/10 bg-white/70"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  tone === "dark" ? "bg-[#CBF35C]/15 text-[#CBF35C]" : tone === "lime" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" : "bg-[#0C3B2E]/[0.06] text-[#0C3B2E]"
                }`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
                <p className={`mt-2 max-w-[52ch] text-[12.5px] leading-relaxed ${tone === "dark" ? "text-[#F6F2E7]/60" : "text-[#4A5A50]"}`}>{body}</p>
                {tone === "dark" && (
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[97%] rounded-full bg-[#CBF35C]" />
                    </div>
                    <span className="text-[10px] font-semibold text-[#CBF35C]">97% confidence</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-[1240px] px-4 pb-20 sm:px-6">
          <div className="rounded-[24px] border border-[#0C3B2E]/10 bg-white/60 p-6 sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5C6B61]">How it works</p>
                <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.035em] sm:text-[36px]">From message to owner.</h2>
              </div>
              <p className="max-w-[36ch] text-[12.5px] leading-relaxed text-[#5C6B61]">
                The full decision trail stays on the ticket, so ranking can be trusted and corrected.
              </p>
            </div>

            <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#0C3B2E]/10 bg-[#0C3B2E]/10 sm:grid-cols-2 lg:grid-cols-5">
              {D_STEPS.map(([title, body], i) => (
                <li key={title} className="bg-[#FDFCF8] p-5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#CBF35C] text-[10px] font-bold text-[#0C3B2E]">{i + 1}</span>
                  <h3 className="mt-4 text-[13px] font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#5C6B61]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="roles" className="border-y border-[#0C3B2E]/10 bg-[#EDE7D8]">
          <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5C6B61]">Roles</p>
                <h2 className="mt-3 text-[36px] font-semibold tracking-[-0.04em] sm:text-[44px]">Three people. One thread.</h2>
              </div>
              <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full border border-[#0C3B2E]/20 px-4 py-2 text-[12px] font-semibold text-[#0C3B2E] transition-colors hover:bg-[#0C3B2E] hover:text-[#F6F2E7]">
                Try each role <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>

            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {[
                { icon: UserRound, role: "Customer", body: "Raises tickets, follows replies and asks the assistant questions answered from published help content.", tag: "Own tickets" },
                { icon: Headset, role: "Agent", body: "Works the queue, confirms low-confidence predictions and sends answers with sources attached.", tag: "Team queue" },
                { icon: ShieldCheck, role: "Admin", body: "Sees analytics, manages knowledge and teams, and watches incident signals across the workspace.", tag: "Workspace" },
              ].map(({ icon: Icon, role, body, tag }) => (
                <div key={role} className="rounded-[24px] bg-[#FDFCF8] p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0C3B2E] text-[#CBF35C]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A968D]">{tag}</span>
                  </div>
                  <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.02em]">{role}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#5C6B61]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-3 py-3">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-8 rounded-[32px] bg-[#CBF35C] px-6 py-14 text-[#0C3B2E] sm:px-12 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0C3B2E]/60">Start here</p>
              <h2 className="mt-3 max-w-[16ch] text-[40px] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[52px]">
                Make support feel effortless.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0C3B2E] px-5 text-[13px] font-bold text-[#F6F2E7] transition-colors hover:bg-[#0A3227]">
                Open the demo <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/login" className="inline-flex h-11 items-center rounded-full border border-[#0C3B2E]/25 px-5 text-[13px] font-semibold text-[#0C3B2E] transition-colors hover:bg-[#0C3B2E]/5">
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-3 pb-3">
        <div className="mx-auto max-w-[1240px] rounded-[28px] bg-[#0C3B2E] px-6 py-10 text-[#F6F2E7] sm:px-10">
          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <DMark tone="light" />
              <p className="mt-4 max-w-[36ch] text-[12px] leading-relaxed text-[#F6F2E7]/50">
                AI support and incident intelligence. Triage, cited answers and early incident signals in one platform.
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#F6F2E7]/35">Product</p>
              <ul className="mt-3 space-y-2 text-[12px] text-[#F6F2E7]/70">
                <li><a href="#platform" className="hover:text-[#CBF35C]">Capabilities</a></li>
                <li><a href="#how" className="hover:text-[#CBF35C]">How it works</a></li>
                <li><a href="#roles" className="hover:text-[#CBF35C]">Roles</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#F6F2E7]/35">Access</p>
              <ul className="mt-3 space-y-2 text-[12px] text-[#F6F2E7]/70">
                <li><Link href="/login" className="hover:text-[#CBF35C]">Sign in</Link></li>
                <li><Link href="/login" className="hover:text-[#CBF35C]">Create an account</Link></li>
                <li><Link href="/forgot-password" className="hover:text-[#CBF35C]">Forgot password</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-1 border-t border-white/10 pt-4 text-[10px] text-[#F6F2E7]/35 sm:flex-row sm:items-center sm:justify-between">
            <span>Relay · AI support &amp; incident intelligence</span>
            <span>Built on Next.js, Express, FastAPI, PostgreSQL + pgvector</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
