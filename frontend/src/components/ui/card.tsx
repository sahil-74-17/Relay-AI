import { clsx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("card", className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-start justify-between gap-4 border-b border-verve-line px-4 py-3.5 sm:px-5", className)}>
      <div className="min-w-0">
        <h2 className="text-[14.5px] font-semibold tracking-[-0.015em] text-verve-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-verve-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.045em] text-verve-ink sm:text-[38px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-verve-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
