"use client";
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "relay-theme";
const EVENT = "relay-theme-change";

const prefersDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  } catch {
    return "system";
  }
}

/** Applies the class used by Tailwind's dark: variants. */
function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/**
 * Light / dark / system theme, persisted in localStorage. Multiple toggles on
 * the page stay in sync through a custom event, and System follows the OS.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = readTheme();
      setThemeState(next);
      applyTheme(next);
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    sync();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readTheme() !== "system") return;
      applyTheme("system");
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
    applyTheme(next);
    setThemeState(next);
    setIsDark(document.documentElement.classList.contains("dark"));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { theme, isDark, setTheme };
}
