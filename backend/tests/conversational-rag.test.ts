import { describe, expect, it } from "vitest";
import { detectConversationalIntent } from "../src/domain/conversational-intent";
import { isContextDependentFollowUp } from "../src/domain/rag-followup";
import type { ChatTurn, RetrievedChunk } from "../src/domain/rag-prompt";
import type { HybridCandidate } from "../src/domain/hybrid-retrieval";
import { NO_ANSWER_MESSAGE, RagService } from "../src/services/rag.service";
import type { AnswerGenerator } from "../src/services/answer-generation";
import type { DocumentRepository } from "../src/repositories/document.repository";
import type { MlClient } from "../src/integrations/ml-client";
import type { SettingsService } from "../src/services/settings.service";

/** Detects small talk so it never reaches retrieval or the ticket pipeline. */
describe("conversational intent", () => {
  it("recognises greetings, thanks, acknowledgements and farewells", () => {
    for (const text of ["hi", "hii", "hello!", "hey", "heyyy", "good morning", "Good Morning!"]) {
      expect(detectConversationalIntent(text)).toBe("greeting");
    }
    expect(detectConversationalIntent("thanks")).toBe("thanks");
    expect(detectConversationalIntent("thank you so much")).toBe("thanks");
    expect(detectConversationalIntent("ok")).toBe("acknowledgement");
    expect(detectConversationalIntent("okay, got it")).toBe("acknowledgement");
    expect(detectConversationalIntent("sure")).toBe("acknowledgement");
    expect(detectConversationalIntent("bye")).toBe("farewell");
    expect(detectConversationalIntent("goodbye!")).toBe("farewell");
    expect(detectConversationalIntent("how are you?")).toBe("pleasantry");
  });

  it("treats mixed messages as real support questions", () => {
    expect(detectConversationalIntent("hi, my payment failed")).toBeNull();
    expect(detectConversationalIntent("thanks, but my password still doesn't work")).toBeNull();
    expect(detectConversationalIntent("ok but I still can't login")).toBeNull();
  });
});

/** The previous question may only be reused for genuinely related follow-ups. */
describe("follow-up detection", () => {
  const history: ChatTurn[] = [
    { role: "user", content: "How do refunds work?" },
    { role: "assistant", content: "Refunds take 5 to 7 business days [1]." },
  ];

  it("accepts anaphoric and elliptical follow-ups", () => {
    expect(isContextDependentFollowUp("How long does that take?", history)).toBe(true);
    expect(isContextDependentFollowUp("and for invoices?", history)).toBe(true);
    expect(isContextDependentFollowUp("why?", history)).toBe(true);
  });

  it("rejects a new, unrelated question", () => {
    expect(isContextDependentFollowUp("Can I get an on-premise server for my bank?", history)).toBe(false);
    expect(isContextDependentFollowUp("Do you support SAML single sign-on?", history)).toBe(false);
    // Short does not mean related: a new topic is still retrieved on its own.
    expect(isContextDependentFollowUp("Do you support SAML?", history)).toBe(false);
  });

  it("returns false when there is no history", () => {
    expect(isContextDependentFollowUp("How long does that take?", [])).toBe(false);
  });
});

const chunk = (id: string, documentTitle: string, content: string): HybridCandidate => ({
  chunkId: id,
  documentId: `doc-${id}`,
  documentTitle,
  index: 0,
  content,
  similarity: 0.9,
  keywordRank: 1,
  matchedTerms: 2,
  queryTerms: 2,
});

/**
 * Fake retrieval: only refund and password questions find knowledge-base chunks.
 * Every query is recorded so tests can prove which question was embedded.
 */
class RagHarness {
  queries: string[] = [];
  private ml: MlClient = {
    analyze: async () => {
      throw new Error("not used");
    },
    embed: async (texts: string[]) => texts.map(() => new Array(384).fill(0)),
    health: async () => true,
  };
  private documents = {
    hybridCandidates: async (_vector: string, query: string) => {
      this.queries.push(query);
      if (/refund/i.test(query)) return [chunk("refund", "Billing & payments", "Billing & payments > Refunds\nRefunds take 5 to 7 business days.")];
      if (/password/i.test(query)) return [chunk("password", "Account & access", "Account & access > Password reset\nUse the Forgot password link on the sign-in page.")];
      return [];
    },
  } as unknown as DocumentRepository;
  private generator: AnswerGenerator = {
    name: "test",
    answer: async (question, chunks) => {
      const text = chunks.length ? `Here is the answer [1].` : "";
      return { text, answerable: !!text, generator: "test" };
    },
  };
  private settings = { get: async () => ({ ragTopK: 4, ragMinSimilarity: 0.3, ragMinKeywordCoverage: 0.5 }) } as unknown as SettingsService;
  readonly service = new RagService(this.ml, this.documents, this.generator, this.settings);
}

describe("RAG follow-up handling", () => {
  it("answers a related follow-up using the previous question's context", async () => {
    const h = new RagHarness();
    const history: ChatTurn[] = [
      { role: "user", content: "How do refunds work?" },
      { role: "assistant", content: "Refunds take 5 to 7 business days [1]." },
    ];
    const answer = await h.service.answer("How long does that take?", history);
    expect(answer.answerable).toBe(true);
    expect(answer.sources[0].documentTitle).toBe("Billing & payments");
    expect(h.queries).toHaveLength(2);
    expect(h.queries[1]).toContain("How do refunds work?");
  });

  it("retrieves an unrelated new question independently and never reuses the old context", async () => {
    const h = new RagHarness();
    const history: ChatTurn[] = [
      { role: "user", content: "I was charged twice." },
      { role: "assistant", content: "Refunds take 5 to 7 business days [1]." },
    ];
    const answer = await h.service.answer("Can I get an on-premise server for my bank?", history);
    expect(answer.answerable).toBe(false);
    expect(answer.content).toBe(NO_ANSWER_MESSAGE);
    expect(answer.sources).toEqual([]);
    expect(h.queries).toEqual(["Can I get an on-premise server for my bank?"]);
  });

  it("falls back honestly for an unsupported new question", async () => {
    const h = new RagHarness();
    const answer = await h.service.answer("Is there a moon base?", []);
    expect(answer.answerable).toBe(false);
    expect(answer.content).toBe(NO_ANSWER_MESSAGE);
  });

  it("answers a support question that follows small talk", async () => {
    const h = new RagHarness();
    const history: ChatTurn[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "Hi! I'm the Relay support assistant." },
    ];
    const answer = await h.service.answer("How do I reset my password?", history);
    expect(answer.answerable).toBe(true);
    expect(answer.sources[0].documentTitle).toBe("Account & access");
    expect(h.queries).toHaveLength(1);
  });

  it("keeps small-talk follow-ups conversational", async () => {
    const h = new RagHarness();
    const history: ChatTurn[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "Hi! I'm the Relay support assistant." },
    ];
    const answer = await h.service.answer("thanks", history);
    expect(answer.answerable).toBeNull();
    expect(answer.sources).toEqual([]);
    expect(h.queries).toEqual([]); // no embedding, no retrieval, no LLM
  });
});
