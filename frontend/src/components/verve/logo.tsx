/**
 * The Verve wordmark. `onDark` flips the mark for forest panels (lime tile,
 * forest arrow) while the normal form sits on the adaptive page surface.
 */
export function VerveLogo({
  onDark = false,
  compact = false,
  className = "",
}: {
  onDark?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const tile = onDark ? "bg-verve-lime text-verve-forest" : "bg-verve-forest text-verve-lime";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${tile}`} aria-hidden>
        <svg width="17" height="17" viewBox="0 0 22 22" focusable="false">
          <path
            d="M4 8h10l-3-3M18 14H8l3 3"
            stroke="currentColor"
            strokeWidth="1.9"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className={`text-[17px] font-bold tracking-[-0.035em] ${onDark ? "text-verve-onForest" : "text-verve-ink"}`}>
          Relay
        </span>
      )}
    </span>
  );
}
