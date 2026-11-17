"use client";
import { ArrowLeft, MailCheck, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { VerveField } from "@/components/verve/field";
import { VerveLogo } from "@/components/verve/logo";
import { ApiError, api } from "@/lib/api";

type ResetRequest = { delivery: "email" | "dev"; resetUrl?: string };

const BUTTON =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-verve-forest px-4 text-[13px] font-semibold text-verve-onForest transition-colors hover:bg-[#0A3227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime focus-visible:ring-offset-2 focus-visible:ring-offset-verve-surface disabled:cursor-not-allowed disabled:opacity-60 dark:bg-verve-lime dark:text-verve-forest dark:hover:bg-[#BDEB45]";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ResetRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setResult(await api<ResetRequest>("/auth/forgot-password", { method: "POST", body: { email } }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't start the reset. Try again.");
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
            <p className="inline-flex items-center gap-2 rounded-full bg-verve-lime px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-verve-forest">
              <ShieldCheck className="h-3 w-3" aria-hidden /> Account recovery
            </p>
            <h1 className="mt-5 text-[32px] font-semibold leading-tight tracking-[-0.035em] text-verve-ink">
              Forgot password?
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-verve-muted">
              Enter the email on your account and we&apos;ll send a single-use reset link.
            </p>

            {result ? (
              <div className="mt-7 space-y-4">
                {result.delivery === "dev" ? (
                  <div role="status" className="rounded-2xl border border-verve-line bg-verve-soft px-4 py-4 text-[13px]">
                    <p className="flex items-center gap-2 font-semibold text-verve-ink">
                      <MailCheck className="h-4 w-4 text-verve-forest dark:text-verve-lime" aria-hidden />
                      Email delivery isn&apos;t configured
                    </p>
                    <p className="mt-1.5 leading-relaxed text-verve-muted">
                      No email was sent. For development, open the reset link below. It expires in 30 minutes and works once.
                    </p>
                    {result.resetUrl && (
                      <>
                        <a href={result.resetUrl} className={`${BUTTON} mt-4`}>
                          Open reset link
                        </a>
                        <p className="mt-3 break-all font-mono text-[11px] leading-relaxed text-verve-subtle">{result.resetUrl}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div role="status" className="rounded-2xl border border-verve-line bg-verve-soft px-4 py-4 text-[13px] leading-relaxed text-verve-muted">
                    If an account exists for <span className="font-semibold text-verve-ink">{email}</span>, we&apos;ve sent a reset link. Check your inbox and spam folder.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setResult(null); }}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-verve-line bg-verve-surface text-[13px] font-semibold text-verve-ink transition-colors hover:bg-verve-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
                <VerveField
                  id="reset-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={setEmail}
                />
                {error && (
                  <p role="alert" className="rounded-xl bg-critical-bg px-3.5 py-2.5 text-[12px] leading-relaxed text-critical-fg">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={loading || !email} className={BUTTON}>
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            )}

            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-1.5 rounded text-[12.5px] font-semibold text-verve-forest underline decoration-verve-lime decoration-2 underline-offset-4 hover:decoration-verve-forest dark:text-verve-lime dark:hover:decoration-verve-lime"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />Back to sign in
            </Link>
          </div>
        </main>

        <div className="border-t border-verve-line bg-verve-soft px-5 py-4 text-[11px] leading-relaxed text-verve-muted sm:px-7">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5"><Timer className="h-3.5 w-3.5 text-verve-forest dark:text-verve-lime" aria-hidden />Expires in 30 minutes</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-verve-forest dark:text-verve-lime" aria-hidden />Works once</span>
            <span className="inline-flex items-center gap-1.5"><MailCheck className="h-3.5 w-3.5 text-verve-forest dark:text-verve-lime" aria-hidden />Never emailed</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
