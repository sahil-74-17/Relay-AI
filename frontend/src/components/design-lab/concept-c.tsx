"use client";
import { AlertCircle, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Headset, Radar, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";
import { GoogleGlyph } from "./shared";

type Mode = "signin" | "register";

function CMark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden>
        <rect x="0.5" y="0.5" width="21" height="21" rx="2" fill="#111315" />
        <path d="M4.5 8h10l-3-3M17.5 14h-10l3 3" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">Relay</span>
    </span>
  );
}

function CField({
  label, type = "text", value, onChange, placeholder, error, autoComplete, revealed, onToggleReveal,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  revealed?: boolean;
  onToggleReveal?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] text-[#4E555B]">{label}</span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={`h-10 w-full rounded-[3px] border bg-white px-3 text-[14px] text-[#111315] outline-none transition placeholder:text-[#A6ACB1] focus:ring-1 ${
            onToggleReveal ? "pr-14" : ""
          } ${
            error
              ? "border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/15"
              : "border-[#D9DCDE] focus:border-[#111315] focus:ring-[#111315]/10"
          }`}
        />
        {onToggleReveal && (
          <button
            type="button"
            onClick={onToggleReveal}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 px-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#6A7076] transition-colors hover:text-[#111315]"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
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

const C_DEMO = [
  { email: "user@demo.com", label: "Customer" },
  { email: "agent@demo.com", label: "Agent" },
  { email: "admin@demo.com", label: "Admin" },
];

export function AuthC() {
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
    <div className="min-h-[calc(100dvh-44px)] bg-white text-[#111315]">
      <div className="mx-auto grid min-h-[calc(100dvh-44px)] max-w-[1280px] lg:grid-cols-[minmax(0,440px)_1fr]">
        <section className="flex flex-col px-5 pb-6 pt-7 sm:px-10 lg:border-r lg:border-[#E5E7E8] lg:px-12 lg:pt-9">
          <div className="flex items-center justify-between">
            <Link href="/design-lab/c" aria-label="Relay home"><CMark /></Link>
            <Link href="/design-lab" className="text-[11px] uppercase tracking-[0.14em] text-[#8A9096] transition-colors hover:text-[#111315]">Lab</Link>
          </div>

          <div className="flex flex-1 items-center py-10">
            <div className="w-full max-w-[344px]">
              <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.025em]">
                {mode === "signin" ? "Sign in" : "Create an account"}
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-[#6A7076]">
                {mode === "signin"
                  ? "Access your Relay workspace."
                  : "Start with a customer workspace. Admin assigns roles."}
              </p>

              <div className="mt-8 flex gap-7 border-b border-[#E5E7E8]" role="tablist" aria-label="Authentication">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signin"}
                  onClick={() => changeMode("signin")}
                  className={`-mb-px border-b-2 pb-2.5 text-[13px] transition-colors ${
                    mode === "signin" ? "border-[#111315] font-medium text-[#111315]" : "border-transparent text-[#6A7076] hover:text-[#111315]"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "register"}
                  onClick={() => changeMode("register")}
                  className={`-mb-px border-b-2 pb-2.5 text-[13px] transition-colors ${
                    mode === "register" ? "border-[#111315] font-medium text-[#111315]" : "border-transparent text-[#6A7076] hover:text-[#111315]"
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                {mode === "register" && (
                  <CField label="Full name" value={name} onChange={setName} placeholder="Aditi Rao" autoComplete="name" error={errors.name} />
                )}
                <CField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoComplete="email" error={errors.email} />
                <CField
                  label="Password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  error={errors.password}
                  revealed={show}
                  onToggleReveal={() => setShow((s) => !s)}
                />

                {mode === "signin" ? (
                  <div className="-mt-0.5 flex justify-end">
                    <Link href="/forgot-password" className="text-[12px] text-[#1F6F5C] underline-offset-4 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                ) : (
                  <p className="text-[11.5px] leading-relaxed text-[#8A9096]">
                    New accounts start as Customer. This can be changed by an admin.
                  </p>
                )}

                {notice && (
                  <p role="status" className="border-l-2 border-[#1F6F5C] pl-2.5 text-[12px] leading-relaxed text-[#3E4A46]">{notice}</p>
                )}

                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[3px] bg-[#111315] text-[13px] font-medium text-white transition-colors hover:bg-black"
                >
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 border-t border-[#E5E7E8] pt-5">
                <button
                  type="button"
                  className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-[3px] border border-[#D9DCDE] bg-white text-[12.5px] font-medium text-[#111315] transition-colors hover:bg-[#FAFAF9]"
                >
                  <GoogleGlyph />
                  Continue with Google
                </button>
              </div>

              <div className="mt-7 border-t border-[#E5E7E8] pt-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A9096]">Demo accounts</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {C_DEMO.map((d) => (
                    <button
                      key={d.email}
                      type="button"
                      onClick={() => { changeMode("signin"); setEmail(d.email); setPassword("Demo@1234"); }}
                      className="text-[12px] text-[#4E555B] underline decoration-[#C9CDD0] underline-offset-4 transition-colors hover:text-[#1F6F5C] hover:decoration-[#1F6F5C]"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-[#A6ACB1]">Password: Demo@1234</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-[0.16em] text-[#A6ACB1]">Relay · Access</p>
        </section>

        <aside className="relative hidden flex-col justify-between bg-[#FAFAF9] px-12 py-10 lg:flex xl:px-16">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[#8A9096]">
            <span>AI support &amp; incident intelligence</span>
            <span>Concept C</span>
          </div>

          <div className="max-w-[440px]">
            <h2 className="text-[42px] font-medium leading-[1.06] tracking-[-0.04em] text-[#111315]">
              Support, without the noise.
            </h2>
            <p className="mt-5 text-[13.5px] leading-[1.75] text-[#6A7076]">
              Relay takes incoming requests, orders them, and gives agents the context to act. The interface stays out of the way.
            </p>

            <ol className="mt-10">
              {[
                ["Triage that explains itself", "Category, priority and sentiment, with confidence."],
                ["Answers that cite documents", "Retrieval over your own policies, never outside them."],
                ["Incidents before they spread", "Similar tickets grouped and measured against baseline."],
              ].map(([title, body], i) => (
                <li key={title} className="border-t border-[#E0E3E5] py-4">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-[10px] text-[#A6ACB1]">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="text-[13.5px] font-medium text-[#111315]">{title}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#6A7076]">{body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="max-w-[440px] border border-[#E0E3E5] bg-white">
            <div className="flex items-center justify-between border-b border-[#E9EBEC] px-4 py-2.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#8A9096]">Queue</span>
              <span className="text-[10px] text-[#A6ACB1]">Sorted by priority</span>
            </div>
            {[
              ["UPI payment failed at checkout", "Critical"],
              ["Invoice shows a duplicate charge", "High"],
              ["Cannot reset my password", "Medium"],
            ].map(([title, level], i) => (
              <div key={title} className={`flex items-center justify-between gap-4 px-4 py-2.5 ${i > 0 ? "border-t border-[#F0F2F3]" : ""}`}>
                <span className="truncate text-[12px] text-[#3A4147]">{title}</span>
                <span className="shrink-0 text-[11px] text-[#6A7076]">{level}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

const C_FEATURES = [
  { icon: BarChart3, title: "Explainable triage", body: "Category, priority and sentiment on every ticket, plus the confidence and the business rules that adjusted the result." },
  { icon: BookOpen, title: "Grounded answers", body: "The assistant retrieves only from uploaded documentation and links the passage behind each answer." },
  { icon: Radar, title: "Incident detection", body: "Tickets that arrive together and look alike are grouped into a potential incident with baseline comparison." },
  { icon: ShieldCheck, title: "Role-based access", body: "Customers, agents and admins see distinct surfaces. The API enforces permissions on every request." },
  { icon: Headset, title: "Feedback that trains", body: "Agent corrections are stored as labelled examples so the next model starts from real decisions." },
];

const C_STEPS = [
  ["Submitted", "Web form or unanswered chat"],
  ["Analysed", "Models classify and embed"],
  ["Adjusted", "Rules raise what matters"],
  ["Routed", "Owning team, least busy agent"],
  ["Learned from", "Corrections become labels"],
];

const C_ROLES = [
  { icon: UserRound, role: "Customer", body: "Raise and follow tickets, ask the assistant, read replies." },
  { icon: Headset, role: "Agent", body: "Work the queue, review predictions, send sourced answers." },
  { icon: ShieldCheck, role: "Admin", body: "Analytics, knowledge base, teams, incidents and settings." },
];

export function HomeC() {
  return (
    <div className="min-h-dvh bg-white text-[#111315]">
      <header className="border-b border-[#E5E7E8]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-10 px-4 sm:px-6">
          <Link href="/design-lab/c" aria-label="Relay home"><CMark /></Link>
          <nav className="hidden items-center gap-8 text-[12.5px] text-[#5A6167] md:flex">
            <a href="#platform" className="transition-colors hover:text-[#111315]">Platform</a>
            <a href="#how" className="transition-colors hover:text-[#111315]">How it works</a>
            <a href="#roles" className="transition-colors hover:text-[#111315]">Roles</a>
          </nav>
          <div className="ml-auto flex items-center gap-5">
            <Link href="/login" className="hidden text-[12.5px] text-[#5A6167] transition-colors hover:text-[#111315] sm:block">Sign in</Link>
            <Link href="/login" className="group inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#111315]">
              Get started
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-20 sm:px-6 lg:pt-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A9096]">
            AI support &amp; incident intelligence
          </p>
          <h1 className="mt-6 max-w-[17ch] text-[48px] font-medium leading-[0.98] tracking-[-0.045em] sm:text-[64px] lg:text-[72px]">
            The support desk that thinks in order.
          </h1>

          <div className="mt-10 grid gap-8 border-t border-[#E5E7E8] pt-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-[58ch] text-[15px] leading-[1.75] text-[#5A6167]">
              Relay reads every incoming ticket, ranks it against the queue and routes it with the reasoning attached. Answers come from your documents. Incidents surface while they are still a pattern.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-[3px] bg-[#111315] px-4 text-[12.5px] font-medium text-white transition-colors hover:bg-black">
                Open the demo <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <a href="#how" className="text-[12.5px] text-[#111315] underline decoration-[#B9BEC2] underline-offset-4 transition-colors hover:decoration-[#111315]">
                See how it works
              </a>
            </div>
          </div>

          <div className="mt-14 border border-[#DDE0E2]">
            <div className="flex items-center justify-between border-b border-[#E9EBEC] bg-[#FAFAF9] px-4 py-2.5">
              <div className="flex items-center gap-2" aria-hidden>
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9CDD0]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9CDD0]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9CDD0]" />
              </div>
              <span className="font-mono text-[10px] text-[#8A9096]">relay / tickets</span>
              <span className="text-[10px] text-[#8A9096]">Aditi Rao · Admin</span>
            </div>

            <div className="grid lg:grid-cols-[190px_1fr]">
              <div className="hidden border-r border-[#E9EBEC] p-4 lg:block">
                {["Overview", "Tickets", "Assistant", "Review queue", "Incidents", "Knowledge", "Users"].map((item, i) => (
                  <div key={item} className={`flex items-center justify-between px-2 py-1.5 text-[12px] ${i === 1 ? "bg-[#F4F5F5] font-medium text-[#111315]" : "text-[#6A7076]"}`}>
                    {item}
                    {i === 3 && <span className="text-[10px] text-[#8A9096]">3</span>}
                  </div>
                ))}
                <div className="mt-6 border-t border-[#E9EBEC] pt-3">
                  <p className="px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#A6ACB1]">Queue health</p>
                  <div className="mt-2 px-2">
                    <div className="h-1 w-full bg-[#EDEFF0]"><div className="h-full w-[68%] bg-[#1F6F5C]" /></div>
                    <p className="mt-1.5 text-[10px] text-[#8A9096]">Open · 41</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between border-b border-[#E9EBEC] px-4 py-3">
                  <div className="flex items-center gap-4 text-[12px]">
                    <span className="font-medium text-[#111315]">Tickets</span>
                    <span className="text-[#8A9096]">All</span>
                    <span className="text-[#8A9096]">Open</span>
                    <span className="text-[#8A9096]">Resolved</span>
                  </div>
                  <span className="rounded-[3px] bg-[#111315] px-2.5 py-1 text-[10px] font-medium text-white">New ticket</span>
                </div>

                <div className="divide-y divide-[#F0F2F3]">
                  {[
                    { title: "UPI payment failed at checkout", meta: "Billing · Customer · 2 min ago", level: "Critical", route: "Priya S." },
                    { title: "Invoice shows a duplicate charge", meta: "Billing · Customer · 6 min ago", level: "High", route: "Arjun M." },
                    { title: "Assistant answer contradicted policy", meta: "Knowledge · Agent · 14 min ago", level: "Medium", route: "Review" },
                    { title: "Cannot reset my password", meta: "Account · Customer · 21 min ago", level: "Medium", route: "Priya S." },
                  ].map((row) => (
                    <div key={row.title} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[1fr_80px_90px_90px]">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] text-[#111315]">{row.title}</p>
                        <p className="mt-0.5 text-[10.5px] text-[#8A9096]">{row.meta}</p>
                      </div>
                      <span className="hidden text-[11px] text-[#5A6167] sm:block">{row.level}</span>
                      <span className="hidden text-[11px] text-[#8A9096] sm:block">{row.route}</span>
                      <span className="justify-self-end font-mono text-[10px] text-[#A6ACB1]">→</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-[#E9EBEC] bg-[#FAFAF9] px-4 py-2.5">
                  <span className="text-[10.5px] text-[#8A9096]">4 of 41 tickets</span>
                  <span className="text-[10.5px] text-[#8A9096]">Triage confidence visible on every row</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="border-t border-[#E5E7E8]">
          <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A9096]">01 / Capabilities</p>
                <h2 className="mt-4 text-[30px] font-medium leading-[1.12] tracking-[-0.03em]">Built for the queue, not the demo.</h2>
                <p className="mt-4 text-[13px] leading-relaxed text-[#6A7076]">
                  Each capability solves one part of the same problem, on the same ticket.
                </p>
              </div>

              <div>
                {C_FEATURES.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="grid gap-3 border-t border-[#E5E7E8] py-5 last:border-b sm:grid-cols-[220px_1fr] sm:gap-8">
                    <h3 className="flex items-center gap-2 text-[13.5px] font-medium">
                      <Icon className="h-4 w-4 text-[#1F6F5C]" aria-hidden />
                      {title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-[#6A7076]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-[#E5E7E8] bg-[#FAFAF9]">
          <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A9096]">02 / How it works</p>
                <h2 className="mt-4 text-[30px] font-medium leading-[1.12] tracking-[-0.03em]">Five steps, all visible.</h2>
              </div>
              <p className="max-w-[40ch] text-[13px] leading-relaxed text-[#6A7076]">
                The pipeline is attached to the ticket, so nothing about the decision is hidden from the agent.
              </p>
            </div>

            <ol className="mt-12 grid gap-px border-t border-[#E0E3E5] sm:grid-cols-2 lg:grid-cols-5">
              {C_STEPS.map(([title, body], i) => (
                <li key={title} className="border-b border-[#E0E3E5] py-5 lg:border-b-0 lg:border-r lg:pr-6 lg:last:border-r-0">
                  <span className="font-mono text-[10px] text-[#A6ACB1]">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 text-[13px] font-medium">{title}</h3>
                  <p className="mt-1.5 max-w-[24ch] text-[12px] leading-relaxed text-[#6A7076]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="roles" className="border-t border-[#E5E7E8]">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[280px_1fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A9096]">03 / Roles</p>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.12] tracking-[-0.03em]">One workspace, three surfaces.</h2>
            </div>
            <div className="grid gap-px border border-[#E5E7E8] sm:grid-cols-3">
              {C_ROLES.map(({ icon: Icon, role, body }) => (
                <div key={role} className="border-b border-[#E5E7E8] p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                  <Icon className="h-4 w-4 text-[#1F6F5C]" aria-hidden />
                  <h3 className="mt-4 text-[14px] font-medium">{role}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#6A7076]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#E5E7E8]">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A9096]">04 / Start</p>
              <h2 className="mt-4 max-w-[18ch] text-[38px] font-medium leading-[1.02] tracking-[-0.04em] sm:text-[46px]">
                Put the queue in order.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-[3px] bg-[#111315] px-4 text-[12.5px] font-medium text-white transition-colors hover:bg-black">
                Open the demo <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link href="/login" className="text-[12.5px] text-[#111315] underline decoration-[#B9BEC2] underline-offset-4 hover:decoration-[#111315]">
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5E7E8] bg-[#FAFAF9]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <CMark />
            <p className="mt-4 max-w-[36ch] text-[12px] leading-relaxed text-[#6A7076]">
              AI support and incident intelligence. Triage, cited answers and early incident signals in one stack.
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#A6ACB1]">Product</p>
            <ul className="mt-3 space-y-2 text-[12px] text-[#5A6167]">
              <li><a href="#platform" className="hover:text-[#111315]">Capabilities</a></li>
              <li><a href="#how" className="hover:text-[#111315]">How it works</a></li>
              <li><a href="#roles" className="hover:text-[#111315]">Roles</a></li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#A6ACB1]">Access</p>
            <ul className="mt-3 space-y-2 text-[12px] text-[#5A6167]">
              <li><Link href="/login" className="hover:text-[#111315]">Sign in</Link></li>
              <li><Link href="/login" className="hover:text-[#111315]">Create an account</Link></li>
              <li><Link href="/forgot-password" className="hover:text-[#111315]">Forgot password</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#E5E7E8]">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-4 py-4 font-mono text-[9px] text-[#A6ACB1] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>RELAY · AI SUPPORT &amp; INCIDENT INTELLIGENCE</span>
            <span>NEXT.JS / EXPRESS / FASTAPI / POSTGRESQL / REDIS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
