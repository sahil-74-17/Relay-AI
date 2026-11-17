import type { Prisma } from "../generated/prisma/client";
import type { DocumentStatus } from "../generated/prisma/enums";
import type { Db } from "../lib/prisma";
import type { HybridCandidate } from "../domain/hybrid-retrieval";

export class DocumentRepository {
  constructor(private readonly db: Db) {}

  create(data: Prisma.DocumentUncheckedCreateInput) {
    return this.db.document.create({ data });
  }

  findById(id: string) {
    return this.db.document.findUnique({ where: { id } });
  }

  list() {
    return this.db.document.findMany({
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  }

  setStatus(id: string, status: DocumentStatus, extra: { error?: string | null; chunkCount?: number } = {}) {
    return this.db.document.update({ where: { id }, data: { status, ...extra } });
  }

  delete(id: string) {
    return this.db.document.delete({ where: { id } });
  }

  deleteChunks(documentId: string) {
    return this.db.documentChunk.deleteMany({ where: { documentId } });
  }

  async insertChunk(c: { id: string; documentId: string; index: number; content: string; tokenCount: number; vector: string }) {
    await this.db.$executeRaw`
      INSERT INTO "DocumentChunk" ("id", "documentId", "index", "content", "tokenCount", "embedding")
      VALUES (${c.id}, ${c.documentId}, ${c.index}, ${c.content}, ${c.tokenCount}, ${c.vector}::vector)`;
  }

  /**
   * Hybrid candidate generation: top-N by vector distance (HNSW index) UNION
   * top-N by full-text rank (GIN index), each annotated with both signals.
   * Fusion and the relevance gate happen in the domain layer (fuseHybrid).
   */
  hybridCandidates(vector: string, text: string, perRetriever = 20): Promise<HybridCandidate[]> {
    return this.db.$queryRaw<HybridCandidate[]>`
      WITH q AS (
        SELECT ${vector}::vector AS v,
               to_tsquery('english', NULLIF(replace(plainto_tsquery('english', ${text})::text, '&', '|'), '')) AS t,
               tsvector_to_array(to_tsvector('english', ${text})) AS terms
      ),
      ready AS (
        SELECT c.* FROM "DocumentChunk" c JOIN "Document" d ON d."id" = c."documentId"
        WHERE d."status" = 'READY' AND c."embedding" IS NOT NULL
      ),
      vec AS (SELECT r."id" FROM ready r, q ORDER BY r."embedding" <=> q.v LIMIT ${perRetriever}),
      kw AS (
        SELECT r."id" FROM ready r, q WHERE q.t IS NOT NULL AND r."search" @@ q.t
        ORDER BY ts_rank_cd(r."search", q.t) DESC LIMIT ${perRetriever}
      )
      SELECT c."id" AS "chunkId", c."documentId", d."title" AS "documentTitle", c."index", c."content",
             (1 - (c."embedding" <=> q.v))::float AS "similarity",
             COALESCE(ts_rank_cd(c."search", q.t), 0)::float AS "keywordRank",
             (SELECT count(*) FROM unnest(q.terms) term
               WHERE c."search" @@ to_tsquery('english', quote_literal(term)))::int AS "matchedTerms",
             cardinality(q.terms)::int AS "queryTerms"
      FROM (SELECT "id" FROM vec UNION SELECT "id" FROM kw) cand
      JOIN "DocumentChunk" c ON c."id" = cand."id"
      JOIN "Document" d ON d."id" = c."documentId", q`;
  }
}
