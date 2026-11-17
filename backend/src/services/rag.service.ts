import { conversationalReply, detectConversationalIntent } from "../domain/conversational-intent";
import { fuseHybrid } from "../domain/hybrid-retrieval";
import { isContextDependentFollowUp } from "../domain/rag-followup";
import type { ChatTurn, RetrievedChunk } from "../domain/rag-prompt";
import type { MlClient } from "../integrations/ml-client";
import type { DocumentRepository } from "../repositories/document.repository";
import { toPgVector } from "../utils/vector";
import type { AnswerGenerator } from "./answer-generation";
import type { SettingsService } from "./settings.service";

export interface RagSource {
  ref: number;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  snippet: string;
  similarity: number;
  matchedBy: RetrievedChunk["matchedBy"];
}

export interface RagAnswer {
  content: string;
  /** true: grounded answer. false: support question with no reliable answer (ticket offered). null: small talk. */
  answerable: boolean | null;
  sources: RagSource[];
  generator: string;
}

export const NO_ANSWER_MESSAGE =
  "I couldn't find a reliable answer to that in the knowledge base. I can turn this conversation into a support ticket so a specialist can help.";

/** Retrieve → filter by relevance → generate grounded answer → attach citations. */
export class RagService {
  constructor(
    private readonly ml: MlClient,
    private readonly documents: DocumentRepository,
    private readonly generator: AnswerGenerator,
    private readonly settings: SettingsService,
  ) {}

  async retrieve(question: string, history: ChatTurn[] = []): Promise<RetrievedChunk[]> {
    const direct = await this.search(question);
    if (direct.length) return direct;
    // Only genuinely related follow-ups may borrow the previous question. A new,
    // unrelated question is retrieved on its own and may legitimately have no answer.
    if (!isContextDependentFollowUp(question, history)) return [];
    const previous = [...history].reverse().find((t) => t.role === "user")?.content;
    return previous ? this.search(`${previous}\n${question}`) : [];
  }

  private async search(query: string): Promise<RetrievedChunk[]> {
    const config = await this.settings.get();
    const [embedding] = await this.ml.embed([query]);
    const candidates = await this.documents.hybridCandidates(toPgVector(embedding), query);
    return fuseHybrid(candidates, {
      topK: config.ragTopK,
      minSimilarity: config.ragMinSimilarity,
      minKeywordCoverage: config.ragMinKeywordCoverage,
    });
  }

  async answer(question: string, history: ChatTurn[]): Promise<RagAnswer> {
    // Greetings, thanks, acknowledgements: reply directly. No embedding call, no retrieval,
    // no LLM, and no "create a ticket" offer, because there is nothing to escalate.
    const intent = detectConversationalIntent(question);
    if (intent) return { content: conversationalReply(intent), answerable: null, sources: [], generator: `conversational:${intent}` };

    const chunks = await this.retrieve(question, history);
    if (!chunks.length) return { content: NO_ANSWER_MESSAGE, answerable: false, sources: [], generator: "retrieval" };

    const result = await this.generator.answer(question, chunks, history);
    if (!result.answerable) return { content: NO_ANSWER_MESSAGE, answerable: false, sources: [], generator: result.generator };

    return { content: result.text, answerable: true, sources: RagService.citedSources(result.text, chunks), generator: result.generator };
  }

  /** Keeps only the excerpts the answer actually cites (all of them if none are cited). */
  static citedSources(text: string, chunks: RetrievedChunk[]): RagSource[] {
    const cited = new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
    return chunks
      .map((c, i) => ({
        ref: i + 1,
        documentId: c.documentId,
        documentTitle: c.documentTitle,
        chunkIndex: c.index,
        // Enough surrounding context for the reader to judge the citation. The UI adds an
        // ellipsis when this reaches the cap; it never shows a fabricated source.
        snippet: c.content.slice(0, 600),
        similarity: Number(c.similarity.toFixed(3)),
        matchedBy: c.matchedBy,
      }))
      .filter((s) => !cited.size || cited.has(s.ref));
  }
}