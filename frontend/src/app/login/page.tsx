"use client";
import {
  ArrowRight, Check, Eye, EyeOff, Headset, Loader2, LockKeyhole, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import useSWR, { mutate } from "swr";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { VerveField } from "@/components/verve/field";
import { VerveLogo } from "@/components/verve/logo";
import { ApiError, api, fetcher } from "@/lib/api";

type Mode = "signin" | "register";

const DEMO = [
  { email: "user@demo.com", label: "Customer", detail: "Raise tickets and chat with the assistant", icon: UserRound },
  { email: "agent@demo.com", label: "Agent", detail: "Work the queue and review AI predictions", icon: Headset },
  { email: "admin@demo.com", label: "Admin", detail: "Analytics, knowledge base and incidents", icon: ShieldCheck },
];
const DEMO_PASSWORD = "Demo@1234";

const AUTH_ERRORS: Record<string, string> = {
  google_unconfigured: "Google sign-in isn't configured on this server. Use email and password instead.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again or use email and password.",
  google_state: "That Google sign-in link expired. Please try again.",
};

/** Same-origin destinations only: blocks //evil.com and backslash tricks. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/dashboard";
  return next;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden focusable="false">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.51h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.86Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const initialMode: Mode = params.get("mode") === "register" ? "register" : "signin";
  const initialError = AUTH_ERRORS[params.get("error") ?? ""] ?? null;
  const resetDone = params.get("reset") === "1";
  const { data: providers } = useSWR<{ google: boolean }>("/auth/providers", fetcher, { revalidateOnFocus: false });

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  function changeMode(value: Mode) {
    setMode(value);
    setErrors({});
    setError(null);
    setShow(false);
  }

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    if (mode === "register" && (name.trim().length < 2 || name.trim().length > 80)) {
      found.name = "Enter your full name (2–80 characters).";
    }
    if (!email.trim()) found.email = "Enter your email address.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) found.email = "Enter a valid email address.";
    if (!password) found.password = "Enter your password.";
    else if (mode === "register") {
      if (password.length < 8) found.password = "Use at least 8 characters.";
      else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) found.password = "Include at least one letter and one number.";
    }
    return found;
  }

  async function finish() {
    await mutate("/auth/me");
    router.replace(safeNext(next));
  }

  async function signIn(creds: { email: string; password: string }, key: string) {
    setLoading(key);
    setError(null);
    setErrors({});
    try {
      await api("/auth/login", { method: "POST", body: creds });
      await finish();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign-in failed. Try again.");
      setLoading(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const found = validate();
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) return;

    setLoading("form");
    try {
      if (mode === "signin") {
        await api("/auth/login", { method: "POST", body: { email: email.trim(), password } });
      } else {
        await api("/auth/register", {
          method: "POST",
          body: { name: name.trim(), email: email.trim(), password },
        });
      }
      await finish();
    } catch (e) {
      if (e instanceof ApiError) {
        const fieldErrors = e.fieldErrors;
        const mapped: Record<string, string> = {};
        (["name", "email", "password"] as const).forEach((field) => {
          const message = fieldErrors[field]?.[0];
          if (message) mapped[field] = message;
        });
        if (Object.keys(mapped).length > 0) setErrors(mapped);
        else setError(e.message);
      } else {
        setError(mode === "signin" ? "Sign-in failed. Try again." : "We couldn't create your account. Try again.");
      }
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div className="min-h-dvh bg-verve-bg p-3 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100dvh-24px)] max-w-[1280px] overflow-hidden rounded-[24px] border border-verve-line bg-verve-surface shadow-[0_40px_100px_-50px_rgba(12,59,46,0.55)] sm:min-h-[calc(100dvh-40px)] lg:grid-cols-[1.02fr_0.98fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-verve-forest p-10 text-verve-onForest lg:flex xl:p-14">
          <div aria-hidden className="pointer-events-none absolute -right-16 top-1/4 h-64 w-64 rounded-full bg-verve-lime/25 blur-3xl" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(246,242,231,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(246,242,231,.5) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />

          <div className="relative">
            <Link href="/" aria-label="Relay home" className="rounded-lg focus-visible:ring-2 focus-visible:ring-verve-lime">
              <VerveLogo onDark />
            </Link>
          </div>

          <div className="relative max-w-[420px]">
            <p className="inline-flex items-center gap-2 rounded-full bg-verve-lime px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-verve-forest">
              <Sparkles className="h-3 w-3" aria-hidden /> AI support, human pace
            </p>
            <h2 className="mt-5 text-[42px] font-semibold leading-[1.02] tracking-[-0.045em] xl:text-[48px]">
              Welcome to the calm side of support.
            </h2>
            <p className="mt-5 text-[14px] leading-relaxed text-verve-onForest/60">
              Relay sorts the queue, shows its reasoning, and gets the right ticket to the right person. Your team keeps the judgment.
            </p>

            <ul className="mt-8 space-y-3">
              {["Explainable triage on every ticket", "Answers grounded in your documents", "Incident signals before the flood"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[13px] text-verve-onForest/85">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-verve-lime">
                    <Check className="h-3 w-3 text-verve-forest" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-verve-onForest/40">
            <span className="h-1.5 w-1.5 rounded-full bg-verve-lime" aria-hidden />
            Customer · Agent · Admin
          </div>
        </aside>

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 lg:px-12 lg:py-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-7 flex items-center justify-between gap-3 lg:justify-end">
              <Link href="/" aria-label="Relay home" className="rounded-lg lg:hidden">
                <VerveLogo />
              </Link>
              <ThemeToggle />
            </div>

            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.035em] text-verve-ink">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-[13px] text-verve-muted">
              {mode === "signin"
                ? "Sign in to pick up exactly where you left off."
                : "Start with a customer workspace. Roles are assigned by your admin."}
            </p>

            <div
              role="tablist"
              aria-label="Sign in or create an account"
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const value: Mode = mode === "signin" ? "register" : "signin";
                changeMode(value);
                document.getElementById(`tab-${value}`)?.focus();
              }}
              className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-verve-sunken p-1"
            >
              {([
                ["signin", "Sign in"],
                ["register", "Register"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  id={`tab-${value}`}
                  aria-selected={mode === value}
                  aria-controls="auth-panel"
                  tabIndex={mode === value ? 0 : -1}
                  onClick={() => changeMode(value)}
                  className={`h-9 rounded-full text-[12.5px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime ${
                    mode === value
                      ? "bg-verve-forest text-verve-onForest shadow-sm dark:bg-verve-lime dark:text-verve-forest"
                      : "text-verve-muted hover:text-verve-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {resetDone && (
              <p role="status" className="mt-5 rounded-xl bg-positive-bg px-3.5 py-2.5 text-[12px] leading-relaxed text-positive-fg">
                Password updated. Sign in with your new password.
              </p>
            )}

            <form
              id="auth-panel"
              role="tabpanel"
              aria-labelledby={`tab-${mode}`}
              onSubmit={onSubmit}
              className="mt-5 space-y-4"
              noValidate
            >
              {mode === "register" && (
                <VerveField
                  id="auth-name"
                  label="Full name"
                  value={name}
                  onChange={(v) => { setName(v); clearError("name"); }}
                  placeholder="Aditi Rao"
                  autoComplete="name"
                  error={errors.name}
                />
              )}
              <VerveField
                id="auth-email"
                label="Email"
                type="email"
                value={email}
                onChange={(v) => { setEmail(v); clearError("email"); }}
                placeholder="you@company.com"
                autoComplete="email"
                error={errors.email}
              />
              <VerveField
                id="auth-password"
                label="Password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(v) => { setPassword(v); clearError("password"); }}
                placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                hint={mode === "register" ? "At least 8 characters, including a letter and a number." : undefined}
                error={errors.password}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShow((value) => !value)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-verve-subtle transition-colors hover:text-verve-forest dark:hover:text-verve-lime"
                  >
                    {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                }
              />

              {mode === "signin" ? (
                <div className="-mt-0.5 flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="rounded text-[12px] font-semibold text-verve-forest underline decoration-verve-lime decoration-2 underline-offset-4 hover:decoration-verve-forest dark:text-verve-lime dark:hover:decoration-verve-lime"
                  >
                    Forgot password?
                  </Link>
                </div>
              ) : (
                <p className="text-[11.5px] leading-relaxed text-verve-subtle">
                  New accounts start with the Customer role. An admin can widen your access.
                </p>
              )}

              {(error ?? initialError) && (
                <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-[12px] leading-relaxed text-critical-fg">
                  {error ?? initialError}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-verve-forest px-4 text-[13px] font-semibold text-verve-onForest transition-colors hover:bg-[#0A3227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime focus-visible:ring-offset-2 focus-visible:ring-offset-verve-surface disabled:cursor-not-allowed disabled:opacity-60 dark:bg-verve-lime dark:text-verve-forest dark:hover:bg-[#BDEB45]"
              >
                {loading === "form" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden />
                )}
                {loading === "form"
                  ? mode === "signin" ? "Signing in…" : "Creating account…"
                  : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-verve-subtle">
              <span className="h-px flex-1 bg-verve-line" aria-hidden />
              or
              <span className="h-px flex-1 bg-verve-line" aria-hidden />
            </div>

            <a
              href={`/api/v1/auth/google${next ? `?next=${encodeURIComponent(safeNext(next))}` : ""}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-verve-line bg-verve-surface text-[12.5px] font-semibold text-verve-ink transition-colors hover:bg-verve-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime focus-visible:ring-offset-2 focus-visible:ring-offset-verve-surface"
            >
              <GoogleMark />
              Continue with Google
            </a>
            {providers?.google === false && (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-verve-subtle">
                Google sign-in isn&apos;t configured on this server. Email and password still work.
              </p>
            )}

            <div className="mt-6 rounded-2xl bg-verve-soft px-4 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-verve-subtle">Demo access</p>
                <p className="text-[10.5px] text-verve-subtle">Password <span className="font-mono">Demo@1234</span></p>
              </div>
              <div className="mt-2.5 grid gap-1.5 sm:grid-cols-3">
                {DEMO.map(({ email: demoEmail, label, detail, icon: Icon }) => (
                  <button
                    key={demoEmail}
                    type="button"
                    onClick={() => signIn({ email: demoEmail, password: DEMO_PASSWORD }, demoEmail)}
                    disabled={busy}
                    title={detail}
                    aria-label={`Sign in as the demo ${label.toLowerCase()}: ${detail}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-verve-line bg-verve-surface px-2.5 py-1.5 text-[11px] font-semibold text-verve-muted transition-colors hover:border-verve-forest/30 hover:text-verve-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-verve-lime"
                  >
                    {loading === demoEmail ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] leading-relaxed text-verve-subtle">
                <LockKeyhole className="h-3 w-3 shrink-0" aria-hidden />
                Each demo signs in immediately. Sessions use an HttpOnly cookie.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
