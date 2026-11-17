import Link from "next/link";
import { VerveLogo } from "@/components/verve/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-verve-bg px-4 text-center text-verve-ink">
      <VerveLogo />
      <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-verve-muted">404</p>
      <h1 className="mt-2 text-[32px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[38px]">This page doesn't exist</h1>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-verve-muted">The link may be broken, or the page may have moved.</p>
      <Link
        href="/dashboard"
        className="mt-7 inline-flex h-10 items-center rounded-full bg-verve-forest px-5 text-[13px] font-semibold text-verve-onForest transition-colors hover:bg-[#0A3227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-forest focus-visible:ring-offset-2 dark:bg-verve-lime dark:text-verve-forest dark:hover:bg-[#BDEB45] dark:focus-visible:ring-verve-lime"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
