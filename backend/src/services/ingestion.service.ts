import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client";
import { logger } from "../config/logger";
import { chunkText } from "../domain/chunker";
import type { MlClient } from "../integrations/ml-client";
import { extractorFor } from "../integrations/text-extractors";
import { DocumentRepository } from "../repositories/document.repository";
import { toPgVector } from "../utils/vector";

/** Document → text → chunks → embeddings → pgvector. Runs in a background job. */
export class IngestionService {
  constructor(private readonly prisma: PrismaClient, private readonly ml: MlClient) {}

  async process(documentId: string): Promise<void> {
    const documents = new DocumentRepository(this.prisma);
    const document = await documents.findById(documentId);
    if (!document) return;
    await documents.setStatus(documentId, "PROCESSING", { error: null });

    try {
      const text = await extractorFor(document.fileName, document.mimeType).extract(document.storagePath);
      const chunks = chunkText(text);
      if (!chunks.length) throw new Error("No readable text found in this file");

      // Prefix the title so short chunks keep their topic when embedded.
      const embeddings = await this.ml.embed(chunks.map((c) => `${document.title}\n${c.content}`));

      await this.prisma.$transaction(async (tx) => {
        const repo = new DocumentRepository(tx);
        await repo.deleteChunks(documentId);
        for (const [i, chunk] of chunks.entries()) {
          await repo.insertChunk({ id: randomUUID(), documentId, ...chunk, vector: toPgVector(embeddings[i]) });
        }
        await repo.setStatus(documentId, "READY", { chunkCount: chunks.length });
      });
      logger.info({ documentId, chunks: chunks.length }, "Document ingested");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      await documents.setStatus(documentId, "FAILED", { error: message.slice(0, 500) });
      throw err;
    }
  }
}
