import type { RetrievedChunk } from "./rag-prompt";

/** A retrieval candidate with both semantic and lexical signals. */
export interface HybridCandidate extends Omit<RetrievedChunk, "matchedBy"> {
  keywordRank: number;
  matchedTerms: number;
  queryTerms: number;
}

export interface HybridOptions {
  topK: number;
  /** Minimum cosine similarity for a semantic match. */
  minSimilarity: number;
  /** Minimum share of query terms a chunk must contain for a keyword match. */
  minKeywordCoverage: number;
  /** Reciprocal Rank Fusion constant (60 is the standard value from the RRF paper). */
  rrfK?: number;
}

const rankMap = (items: HybridCandidate[], score: (c: HybridCandidate) => number) =>
  new Map([...items].sort((a, b) => score(b) - score(a)).map((c, i) => [c.chunkId, i + 1]));

/**
 * Fuses vector and keyword rankings with Reciprocal Rank Fusion, then applies a
 * relevance gate: a chunk must be semantically close OR contain most of the
 * query's terms. The gate is what lets the assistant say "I don't know".
 */
export function fuseHybrid(candidates: HybridCandidate[], o: HybridOptions): RetrievedChunk[] {
  const k = o.rrfK ?? 60;
  const byVector = rankMap(candidates, (c) => c.similarity);
  const byKeyword = rankMap(
    candidates.filter((c) => c.keywordRank > 0),
    (c) => c.keywordRank,
  );

  return candidates
    .map((c) => {
      const semantic = c.similarity >= o.minSimilarity;
      const coverage = c.queryTerms ? c.matchedTerms / c.queryTerms : 0;
      const keyword = c.matchedTerms >= 1 && coverage >= o.minKeywordCoverage;
      const kwRank = byKeyword.get(c.chunkId);
      const score = 1 / (k + byVector.get(c.chunkId)!) + (kwRank ? 1 / (k + kwRank) : 0);
      const matchedBy: RetrievedChunk["matchedBy"] = semantic && keyword ? "hybrid" : semantic ? "semantic" : "keyword";
      return { chunk: c, score, relevant: semantic || keyword, matchedBy };
    })
    .filter((r) => r.relevant)
    .sort((a, b) => b.score - a.score)
    .slice(0, o.topK)
    .map(({ chunk, matchedBy }) => ({
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      index: chunk.index,
      content: chunk.content,
      similarity: chunk.similarity,
      matchedBy,
    }));
}
