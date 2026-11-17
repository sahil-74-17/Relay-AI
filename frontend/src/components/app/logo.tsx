/** "Relay": tickets are relayed to the right person. The mark is two offset arrows. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect width="22" height="22" rx="5" fill="#1F6F5C" />
        <path d="M5 8h9l-2.5-2.5M17 14H8l2.5 2.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-ink">Relay</span>
    </span>
  );
}
