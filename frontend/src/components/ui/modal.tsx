"use client";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Native <dialog>: focus trapping, Esc to close and inert background for free. */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-overlay/60 open:animate-rise-in"
    >
      <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
        <div>
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        <button onClick={onClose} className="-mr-1 rounded-full p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink" aria-label="Close dialog">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children && <div className="px-5 py-3">{children}</div>}
      {footer && <div className="flex flex-col-reverse gap-2 border-t border-line bg-paper/60 px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
    </dialog>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel, destructive, loading,
}: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: ReactNode; confirmLabel: string; destructive?: boolean; loading?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    />
  );
}
