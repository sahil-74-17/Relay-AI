"use client";
import { clsx } from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";
import { type Theme, useTheme } from "@/hooks/use-theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Visible light / dark / system switch, used in the sidebar, mobile header and login page. */
export function ThemeToggle({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={clsx(
        "inline-flex items-center gap-0.5 rounded-full border p-0.5",
        onDark ? "border-white/15 bg-white/10" : "border-line bg-surface",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            className={clsx(
              "flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2",
              onDark
                ? active
                  ? "bg-verve-lime text-verve-forest focus-visible:ring-verve-lime"
                  : "text-verve-onForest/55 hover:bg-white/10 hover:text-verve-onForest focus-visible:ring-verve-lime"
                : active
                  ? "bg-paper text-pine-600 ring-1 ring-line"
                  : "text-ink-muted hover:bg-paper hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
