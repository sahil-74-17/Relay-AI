"use client";
import { clsx } from "clsx";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

type Tone = "success" | "error";
interface Toast { id: number; tone: Tone; message: string }
const ToastContext = createContext<(tone: Tone, message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((tone: Tone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, tone, message }]);
    setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-sm animate-rise-in items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-pop">
            {t.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" aria-hidden /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-critical-fg" aria-hidden />}
            <p className={clsx("flex-1", t.tone === "error" ? "text-critical-fg" : "text-ink")}>{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-ink-muted hover:text-ink" aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const push = useContext(ToastContext);
  return { success: (m: string) => push("success", m), error: (m: string) => push("error", m) };
};
