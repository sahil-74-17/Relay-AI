"use client";
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { VerveField } from "@/components/verve/field";
import { VerveLogo } from "@/components/verve/logo";
import { ApiError, api } from "@/lib/api";

const MIN_PASSWORD = 8;

const BUTTON =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-verve-forest px-4 text-[13px] font-semibold text-verve-onForest transition-colors hover:bg-[#0A3227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime focus-visible:ring-offset-2 focus-visible:ring-offset-verve-surface disabled:cursor-not-allowed disabled:opacity-60 dark:bg-verve-lime dark:text-verve-forest dark:hover:bg-[#BDEB45]";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError("Use at least 8 characters.");
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return setError("Include at least one letter and one number.");
    if (password !== confirm) return setError("The passwords don't match.");
    setLoading(true);
    setError(null);
    try {
      await api("/auth/reset-password", { method: "POST", body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.password?.[0] ?? err.message) : "We couldn't reset your password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-verve-bg p-3 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100dvh-24px)] w-full max-w-[520px] flex-col justify-center sm:min-h-[calc(100dvh-48px)]">
        <div className="overflow-hidden rounded-[24px] border border-verve-line bg-verve-surface shadow-[0_40px_100px_-50px_rgba(12,59,46,0.55)]">
          <header className="flex items-center justify-between border-b border-verve-line px-5 py-4 sm:px-7">
          <Link href="/" aria-label="Relay home" className="rounded-lg focus-visible:ring-2 focus-visible:ring-verve-forest">
            <VerveLogo />
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full max-w-[420px]">
            {!token ? (
              <>
                <p className="inline-flex items-center gap-2 rounded-full bg-verve-lime px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-verve-forest">
                  <ShieldCheck className="h-3 w-3" aria-hidden /> Account recovery
                </p>
                <h1 className="mt-5 text-[32px] font-semibold leading-tight tracking-[-0.035em] text-verve-ink">Reset link incomplete</h1>
                <p className="mt-2 text-[13px] leading-relaxed text-verve-muted">
                  This link has no reset token. Request a new link to continue.
                </p>
                <Link href="/forgot-password" className={`${BUTTON} mt-7`}>
                  Request a new link
                </Link>
              </>
            ) : done ? (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-verve-lime text-verve-forest" aria-hidden>
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <h1 className="mt-5 text-[32px] font-semibold leading-tight tracking-[-0.035em] text-verve-ink">Password updated</h1>
                <p className="mt-2 text-[13px] leading-relaxed text-verve-muted">
                  Your reset link has been used and can&apos;t be used again. Sign in with your new password.
                </p>
                <Link href="/login?reset=1" className={`${BUTTON} mt-7`}>
                  Sign in
                </Link>
              </>
            ) : (
              <>
                <p className="inline-flex items-center gap-2 rounded-full bg-verve-lime px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-verve-forest">
                  <KeyRound className="h-3 w-3" aria-hidden /> Account recovery
                </p>
                <h1 className="mt-5 text-[32px] font-semibold leading-tight tracking-[-0.035em] text-verve-ink">Set a new password</h1>
                <p className="mt-2 text-[13px] leading-relaxed text-verve-muted">
                  Choose a password you haven&apos;t used before. This link works once and expires after 30 minutes.
                </p>
                <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
                  <VerveField
                    id="new-password"
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={setPassword}
                    hint="At least 8 characters, including a letter and a number."
                  />
                  <VerveField
                    id="confirm-password"
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat your new password"
                    value={confirm}
                    onChange={setConfirm}
                    error={mismatch ? "The passwords don't match." : undefined}
                  />
                  {error && (
                    <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-[12px] leading-relaxed text-critical-fg">
                      {error}
                    </p>
                  )}
                  <button type="submit" disabled={loading || !password || !confirm || mismatch} className={BUTTON}>
                    {loading ? "Updating…" : "Update password"}
                  </button>
                </form>
                <Link
                  href="/forgot-password"
                  className="mt-6 inline-flex rounded text-[12.5px] font-semibold text-verve-forest underline decoration-verve-lime decoration-2 underline-offset-4 hover:decoration-verve-forest dark:text-verve-lime dark:hover:decoration-verve-lime"
                >
                  Request a new link
                </Link>
              </>
            )}

            <Link
              href="/login"
              className="mt-8 flex items-center gap-1.5 rounded text-[12.5px] font-semibold text-verve-muted transition-colors hover:text-verve-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />Back to sign in
            </Link>
          </div>
        </main>

        <div className="border-t border-verve-line bg-verve-soft px-5 py-4 text-[11px] leading-relaxed text-verve-muted sm:px-7">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-verve-forest dark:text-verve-lime" aria-hidden />Stored as a bcrypt hash</span>
            <span className="inline-flex items-center gap-1.5"><Timer className="h-3.5 w-3.5 text-verve-forest dark:text-verve-lime" aria-hidden />Expires in 30 minutes</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-verve-forest dark:text-verve-lime" aria-hidden />Role unchanged</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
