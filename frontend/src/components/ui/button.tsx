import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-verve-forest text-verve-onForest hover:bg-[#0A3227] active:bg-[#0A3227] disabled:bg-verve-forest/45 dark:bg-verve-lime dark:text-verve-forest dark:hover:bg-[#BDEB45] dark:active:bg-[#BDEB45] dark:disabled:bg-verve-lime/45",
  secondary: "border border-verve-line bg-verve-surface text-verve-ink hover:border-verve-forest/25 hover:bg-verve-soft disabled:text-verve-subtle",
  ghost: "text-verve-muted hover:bg-verve-ink/5 hover:text-verve-ink disabled:text-verve-subtle",
  danger: "bg-danger text-white hover:bg-danger-hover disabled:opacity-50",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-[12.5px] gap-1.5", md: "h-10 px-4 text-[13px] gap-2" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime focus-visible:ring-offset-2 focus-visible:ring-offset-verve-surface disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
