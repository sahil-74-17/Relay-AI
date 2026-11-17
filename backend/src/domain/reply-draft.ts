import { extractiveAnswer } from "./extractive-answer";
import type { RetrievedChunk } from "./rag-prompt";

export interface ReplyTicket {
  title: string;
  description: string;
  requesterName: string;
  category: string | null;
}

export interface ReplySuggestion {
  text: string;
  generator: string;
  /** Document titles the draft was grounded in; empty when the KB had nothing relevant. */
  groundedIn: string[];
}

export const REPLY_SYSTEM_PROMPT = `You draft a first reply for a human support agent to review and send.
Rules:
- Greet the customer by first name and acknowledge their specific problem.
- Use ONLY the numbered knowledge-base excerpts for policies, prices, steps or technical facts.
- Never invent policies, timelines, refunds, links or technical details.
- If the excerpts do not cover the question, say the team is investigating and will follow up; do not guess.
- 2-4 short paragraphs, plain text, no markdown headings, no citation markers, sign off as "The support team".
- Output only the reply text.`;

const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);

/** The knowledge-base text used for the draft, numbered like the RAG prompt. */
export function buildReplyPrompt(ticket: ReplyTicket, chunks: RetrievedChunk[], maxChars = 5000): string {
  let budget = maxChars;
  const excerpts: string[] = [];
  chunks.forEach((c, i) => {
    if (budget <= 0) return;
    const body = c.content.slice(0, budget);
    budget -= body.length;
    excerpts.push(`[${i + 1}] (${c.documentTitle})\n${body}`);
  });
  const firstName = ticket.requesterName.split(" ")[0] || "there";
  return [
    `Customer first name: ${firstName}`,
    `Ticket: ${clip(ticket.title, 200)}`,
    `Description: ${clip(ticket.description, 1200)}`,
    ticket.category ? `AI category: ${ticket.category}` : "",
    excerpts.length ? `Knowledge-base excerpts:\n${excerpts.join("\n\n")}` : "Knowledge-base excerpts: none retrieved.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Honest, KB-grounded draft used when no LLM is configured (or the LLM fails). */
export function heuristicReply(ticket: ReplyTicket, chunks: RetrievedChunk[]): string {
  const firstName = ticket.requesterName.split(" ")[0] || "there";
  const introduced = !!chunks.length;
  const quoted = introduced
    ? extractiveAnswer(`${ticket.title}\n${ticket.description}`, chunks, 2)
        .replace(/\[\d+\]/g, "")
        .replace(/\n{2,}/g, "\n\n")
        .trim()
    : "";

  const acknowledgement = `Thanks for reaching out about "${clip(ticket.title, 120)}".`;
  const nextStep = quoted
    ? "Based on our help documentation, this may be relevant:"
    : "I've passed the details to the right team, who are looking into this now. We'll follow up with the next steps as soon as we can.";
  const closing = "If you have any additional details in the meantime, just reply here.";
  return [firstName ? `Hi ${firstName},` : "Hi,", "", acknowledgement, quoted ? `${nextStep}\n\n${quoted}` : nextStep, "", closing, "", "The support team"].join("\n");
}

export function groundedTitles(chunks: RetrievedChunk[]): string[] {
  return [...new Set(chunks.map((c) => c.documentTitle))];
}
