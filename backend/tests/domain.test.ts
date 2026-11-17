import { describe, expect, it } from "vitest";
import { chunkText } from "../src/domain/chunker";
import { extractiveAnswer } from "../src/domain/extractive-answer";
import { type HybridCandidate, fuseHybrid } from "../src/domain/hybrid-retrieval";
import { clusterBySimilarity, incidentSeverity, spikeRatio } from "../src/domain/incident-clustering";
import { buildRagUserPrompt, isNoAnswer } from "../src/domain/rag-prompt";
import { computeDueAt, slaState } from "../src/domain/sla";
import { TicketPolicy } from "../src/domain/ticket-policy";
import { RagService } from "../src/services/rag.service";

describe("chunkText", () => {
  const doc = "# Billing\n\n## Refunds\nRefunds take 5 days.\n\n## Invoices\nDownload invoices from Settings.";

  it("creates one chunk per section, prefixed with its heading path", () => {
    const chunks = chunkText(doc);
    expect(chunks.map((c) => c.content)).toEqual([
      "Billing > Refunds\nRefunds take 5 days.",
      "Billing > Invoices\nDownload invoices from Settings.",
    ]);
    expect(chunks.map((c) => c.index)).toEqual([0, 1]);
  });

  it("splits long sections and respects the size limit", () => {
    const long = `## Policy\n${Array.from({ length: 40 }, (_, i) => `Sentence number ${i} explains a rule.`).join(" ")}`;
    const chunks = chunkText(long, { maxChars: 300, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(300 + "Policy\n".length);
  });

  it("handles plain text without headings and empty input", () => {
    expect(chunkText("Just one paragraph of text.")).toHaveLength(1);
    expect(chunkText("   \n\n ")).toEqual([]);
  });
});

describe("fuseHybrid (RAG retrieval)", () => {
  const cand = (id: string, similarity: number, matchedTerms: number, keywordRank = matchedTerms * 0.1): HybridCandidate => ({
    chunkId: id, documentId: "d", documentTitle: "Doc", index: 0, content: id, similarity, keywordRank, matchedTerms, queryTerms: 4,
  });
  const opts = { topK: 3, minSimilarity: 0.3, minKeywordCoverage: 0.5 };

  it("drops chunks that are neither semantically close nor keyword matches", () => {
    expect(fuseHybrid([cand("noise", 0.1, 1)], opts)).toEqual([]);
  });

  it("accepts semantic-only, keyword-only and hybrid matches and labels them", () => {
    const r = fuseHybrid([cand("sem", 0.5, 0), cand("kw", 0.1, 3), cand("both", 0.6, 4)], opts);
    expect(Object.fromEntries(r.map((c) => [c.chunkId, c.matchedBy]))).toEqual({ sem: "semantic", kw: "keyword", both: "hybrid" });
    expect(r[0].chunkId).toBe("both"); // ranked first by both retrievers
  });

  it("returns at most topK chunks", () => {
    const many = Array.from({ length: 8 }, (_, i) => cand(`c${i}`, 0.5 + i / 100, 2));
    expect(fuseHybrid(many, opts)).toHaveLength(3);
  });
});

describe("RAG prompt and answers", () => {
  const chunk = { chunkId: "1", documentId: "d", documentTitle: "Billing", index: 0, content: "Billing > Refunds\nRefunds take 5 to 7 business days. Contact support otherwise.", similarity: 0.6 };

  it("numbers context excerpts and includes history and question", () => {
    const prompt = buildRagUserPrompt("How long do refunds take?", [chunk], [{ role: "user", content: "Hi" }]);
    expect(prompt).toContain("[1] (Billing)");
    expect(prompt).toContain("User: Hi");
    expect(prompt.endsWith("Question: How long do refunds take?")).toBe(true);
  });

  it("detects the no-answer token", () => {
    expect(isNoAnswer(" NO_ANSWER")).toBe(true);
    expect(isNoAnswer("Refunds take 5 days [1]")).toBe(false);
  });

  it("extractive answer cites sources and skips the heading line", () => {
    const answer = extractiveAnswer("how long do refunds take", [chunk]);
    expect(answer).toContain("Refunds take 5 to 7 business days. [1]");
    expect(answer).not.toContain("Billing >");
  });

  it("keeps only cited sources", () => {
    const sources = RagService.citedSources("See [2].", [chunk, { ...chunk, chunkId: "2" }]);
    expect(sources.map((s) => s.ref)).toEqual([2]);
  });
});

describe("incident clustering", () => {
  it("groups connected tickets and picks the most central one", () => {
    const clusters = clusterBySimilarity(["a", "b", "c", "d"], [
      { a: "a", b: "b", similarity: 0.8 }, { a: "b", b: "c", similarity: 0.7 },
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].ids.sort()).toEqual(["a", "b", "c"]);
    expect(clusters[0].medoidId).toBe("b");
  });

  it("computes volume spike ratio against the baseline", () => {
    // 10 tickets in 60 min vs 168 in the previous week (1 per hour) → 10x.
    expect(spikeRatio(10, 168, 60, 7 * 24 * 60)).toBe(10);
    expect(spikeRatio(3, 0, 60, 7 * 24 * 60)).toBe(6); // floor avoids divide-by-zero
  });

  it("raises severity with size and spikes", () => {
    expect(incidentSeverity(3, 1, 3)).toBe("MEDIUM");
    expect(incidentSeverity(3, 5, 3)).toBe("HIGH");
    expect(incidentSeverity(9, 5, 3)).toBe("CRITICAL");
  });
});

describe("SLA and ticket policy", () => {
  const user = { id: "u1", email: "", name: "", role: "USER" as const, teamId: null };
  const agent = { ...user, id: "a1", role: "AGENT" as const };

  it("computes due dates and SLA state", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    expect(computeDueAt("CRITICAL", created).toISOString()).toBe("2026-01-01T04:00:00.000Z");
    const due = new Date("2026-01-01T10:00:00Z");
    expect(slaState(due, null, new Date("2026-01-01T09:00:00Z"))).toBe("due_soon");
    expect(slaState(due, null, new Date("2026-01-01T11:00:00Z"))).toBe("breached");
    expect(slaState(due, new Date("2026-01-01T09:00:00Z"))).toBe("met");
  });

  it("lets users see only their own tickets; staff see all", () => {
    expect(TicketPolicy.canView(user, { createdById: "u1" })).toBe(true);
    expect(TicketPolicy.canView(user, { createdById: "other" })).toBe(false);
    expect(TicketPolicy.canView(agent, { createdById: "other" })).toBe(true);
  });

  it("enforces the status state machine", () => {
    expect(TicketPolicy.canTransition("OPEN", "IN_PROGRESS")).toBe(true);
    expect(TicketPolicy.canTransition("RESOLVED", "WAITING_FOR_USER")).toBe(false);
    expect(TicketPolicy.canTransition("CLOSED", "OPEN")).toBe(false);
  });
});
