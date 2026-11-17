-- Hybrid retrieval: full-text search column next to the embedding.
-- Generated + stored, so it can never drift from the chunk content.
ALTER TABLE "DocumentChunk"
  ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED;

CREATE INDEX "DocumentChunk_search_gin_idx" ON "DocumentChunk" USING gin ("search");
