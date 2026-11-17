"use client";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { CONCEPTS, conceptById, type ConceptId, type ConceptView, viewHref } from "./meta";

export { CONCEPTS, conceptById, viewHref };
export type { ConceptId, ConceptMeta, ConceptView } from "./meta";

/** Neutral preview chrome so the concepts themselves are what you compare. */
export function LabBar({ id, view }: { id: ConceptId; view: ConceptView }) {
  const index = CONCEPTS.findIndex((c) => c.id === id);
  const prev = CONCEPTS[(index + CONCEPTS.length - 1) % CONCEPTS.length];
  const next = CONCEPTS[(index + 1) % CONCEPTS.length];
  const concept = CONCEPTS[index];

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex h-11 items-center gap-3 border-b border-white/10 bg-[#0B0D12] px-3 text-white sm:px-5">
      <Link
        href="/design-lab"
        className="inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Design lab</span>
      </Link>
      <span className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden />
      <span className="text-xs font-medium">{concept.name}</span>
      <span className="hidden text-[11px] text-white/40 md:inline">{concept.style}</span>

      <div className="ml-auto flex items-center gap-0.5 rounded-md bg-white/[0.07] p-0.5">
        <Link
          href={viewHref(id, "home")}
          className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
            view === "home" ? "bg-white text-[#0B0D12]" : "text-white/60 hover:text-white"
          }`}
        >
          Home
        </Link>
        <Link
          href={viewHref(id, "auth")}
          className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
            view === "auth" ? "bg-white text-[#0B0D12]" : "text-white/60 hover:text-white"
          }`}
        >
          <span className="sm:hidden">Auth</span>
          <span className="hidden sm:inline">Sign in / Register</span>
        </Link>
      </div>

      <div className="hidden items-center gap-1 sm:flex">
        <Link
          href={viewHref(prev.id, view)}
          aria-label={`Previous concept: ${prev.name}`}
          className="rounded p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          href={viewHref(next.id, view)}
          aria-label={`Next concept: ${next.name}`}
          className="rounded p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function GoogleGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.51h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.86Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

/** Small, honest product-fact line used across the concepts. */
export function FactRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      <Eye className="h-3.5 w-3.5" aria-hidden />
      {children}
    </span>
  );
}
