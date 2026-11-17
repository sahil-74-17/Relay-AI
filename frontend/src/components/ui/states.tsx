import { clsx } from "clsx";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded bg-ink/[0.06]", className)} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-5 w-20 sm:block" />
          <Skeleton className="hidden h-5 w-16 md:block" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="mb-3 rounded-2xl border border-verve-line bg-verve-soft p-3"><Icon className="h-5 w-5 text-verve-forest dark:text-verve-lime" aria-hidden /></div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={clsx("flex flex-col items-center px-6 py-10 text-center", className)}>
      <AlertTriangle className="mb-2 h-5 w-5 text-critical-fg" aria-hidden />
      <h3 className="text-sm font-semibold">This didn't load</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{message ?? "The server didn't respond as expected."}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
