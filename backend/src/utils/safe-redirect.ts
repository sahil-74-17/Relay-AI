/**
 * Only same-origin, absolute paths are safe post-login destinations.
 * Rejects `//evil.com`, `/\evil.com`, schemes and control characters (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
