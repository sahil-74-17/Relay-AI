import type { ReactNode } from "react";

/** Lightweight tooltip shown on hover and keyboard focus. */
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 hidden w-max max-w-[240px] -translate-x-1/2 rounded-full bg-verve-ink px-2.5 py-1 text-xs leading-snug text-verve-bg shadow-pop group-focus-within/tt:block group-hover/tt:block">
        {content}
      </span>
    </span>
  );
}
