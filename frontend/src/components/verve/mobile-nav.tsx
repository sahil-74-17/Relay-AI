"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/app/theme-toggle";

const LINKS = [
  ["Platform", "#platform"],
  ["How it works", "#how"],
  ["Roles", "#roles"],
] as const;

/** Small accessible menu for the marketing header (md and below). */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="marketing-mobile-nav"
        aria-label={open ? "Close navigation" : "Open navigation"}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-verve-line text-verve-muted transition-colors hover:text-verve-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-forest"
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
      </button>

      {open && (
        <div
          id="marketing-mobile-nav"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-verve-line bg-verve-surface p-2 shadow-[0_24px_60px_-24px_rgba(12,59,46,0.4)]"
        >
          <nav aria-label="Mobile" className="flex flex-col text-[13px]">
            {LINKS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 font-medium text-verve-muted transition-colors hover:bg-verve-soft hover:text-verve-ink"
              >
                {label}
              </a>
            ))}
            <span className="my-1 h-px bg-verve-line" aria-hidden />
            <Link
              href="/login"
              className="rounded-xl px-3 py-2 font-medium text-verve-muted transition-colors hover:bg-verve-soft hover:text-verve-ink"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=register"
              className="rounded-xl px-3 py-2 font-semibold text-verve-forest transition-colors hover:bg-verve-soft dark:text-verve-lime"
            >
              Create an account
            </Link>
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-verve-line px-2 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-verve-subtle">Theme</span>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
