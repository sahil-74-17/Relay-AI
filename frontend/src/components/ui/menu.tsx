"use client";
import { clsx } from "clsx";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

export interface MenuItem { label: string; onSelect: () => void; danger?: boolean; icon?: ReactNode }

/** Accessible dropdown menu: Esc/outside-click to close, arrow-key navigation. */
export function Menu({
  trigger,
  items,
  label,
  align = "end",
  placement = "bottom",
  triggerClassName,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  label: string;
  align?: "start" | "end";
  /** "top" opens upward, for triggers pinned to the bottom of the viewport. */
  placement?: "bottom" | "top";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    const els = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { setOpen(false); (root.current?.querySelector("button") as HTMLElement)?.focus(); }
    if (e.key === "ArrowDown") { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKey}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={id} aria-label={label} onClick={() => setOpen((o) => !o)} className={clsx("rounded-md", triggerClassName)}>
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className={clsx(
            "absolute z-50 max-h-64 min-w-[190px] overflow-y-auto overscroll-contain animate-fade-in rounded-xl border border-line bg-surface p-1.5 shadow-pop",
            align === "end" ? "right-0" : "left-0",
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); item.onSelect(); }}
              className={clsx("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] focus:bg-paper focus:outline-none hover:bg-paper", item.danger ? "text-critical-fg" : "text-ink")}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
