import type { RetrievedChunk } from "./rag-prompt";

const STOP = new Set("a an the is are was were to of in on for and or how do i my me can what why when where with it this that be you your we our".split(" "));
const tokens = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g)?.filter((t) => !STOP.has(t) && t.length > 1) ?? [];

/**
 * LLM-free answer generation: picks the sentences from retrieved chunks that
 * best overlap the question and cites them. Used when no LLM is configured.
 */
export function extractiveAnswer(question: string, chunks: RetrievedChunk[], maxSentences = 3): string {
  const q = new Set(tokens(question));
  const scored = chunks.flatMap((chunk, ci) => {
    // Chunks start with their heading path ("Billing > Refund policy"): use it as a topic signal, not as answer text.
    const [first, ...rest] = chunk.content.split("\n");
    const hasHeading = first.includes(" > ") || rest.length > 0 && first.length < 120 && !/[.!?]$/.test(first);
    const heading = hasHeading ? first : "";
    const body = hasHeading ? rest.join("\n") : chunk.content;
    const headingOverlap = tokens(heading).filter((t) => q.has(t)).length;
    return body
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20)
      .map((sentence, si) => {
        const overlap = tokens(sentence).filter((t) => q.has(t)).length;
        return { sentence, ci, si, overlap, score: overlap + headingOverlap * 0.75 + chunk.similarity * 2 - ci * 0.1 };
      });
  });
  const ranked = scored.filter((s) => s.overlap > 0 || q.size === 0).sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  // Keep only sentences nearly as relevant as the best one, so tangents don't leak in.
  const best = ranked
    .filter((s) => s.score >= top * 0.6)
    .slice(0, maxSentences)
    .sort((a, b) => a.ci - b.ci || a.si - b.si);
  if (!best.length) return "";
  return best.map((b) => `${b.sentence.replace(/^[-*#\d.)\s]+/, "")} [${b.ci + 1}]`).join("\n\n");
}
