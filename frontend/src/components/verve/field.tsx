"use client";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  trailing?: ReactNode;
  hint?: string;
};

/** Labelled input shared by the public auth screens. */
export function VerveField({
  id, label, type = "text", value, onChange, placeholder, error, autoComplete, trailing, hint,
}: Props) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-semibold text-verve-muted">{label}</label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-xl border bg-verve-surface px-3.5 text-[14px] text-verve-ink outline-none transition placeholder:text-verve-subtle ${
            trailing ? "pr-11" : ""
          } ${
            error
              ? "border-critical-fg focus:ring-4 focus:ring-critical-fg/10"
              : "border-verve-line focus:border-verve-forest focus:ring-4 focus:ring-verve-lime/30 dark:focus:border-verve-lime"
          }`}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-[12px] text-critical-fg">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[11.5px] leading-relaxed text-verve-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
