import type { ChatTurn } from "./rag-prompt";

/**
 * Decides whether a question only makes sense with the previous exchange
 * ("and on mobile?", "how long does that take?"). Retrieval must not reuse an
 * earlier question for a topic change ("I was charged twice" → "Can I get an
 * on-premise server for my bank?"), so the fallback is deliberately narrow.
 */
const ANAPHORA = /\b(it|its|it's|that|this|these|those|they|them|their|same|above|former|latter)\b/;
const CONNECTORS = /^(and|also|what about|how about|then|so|but|plus|ok(ay)? (and|so)|what if)\b/;

const STOP = new Set(
  "a an the is are was were to of in on for and or how do does did i my me we our you your can could would should what why when where who which with it this that these those be been being get got".split(
    " ",
  ),
);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Short messages with a reference to the previous turn, or a direct topical link to it. */
export function isContextDependentFollowUp(question: string, history: ChatTurn[]): boolean {
  const q = words(question);
  if (!q.length || q.length > 12) return false;

  const previous = [...history].reverse().find((t) => t.role === "user");
  if (!previous) return false;

  const raw = question.trim().toLowerCase();
  if (ANAPHORA.test(raw) || CONNECTORS.test(raw)) return true;

  // A short question that shares a content word with the previous exchange is a
  // follow-up; an unrelated question shares none and is retrieved independently.
  const lastAnswer = [...history].reverse().find((t) => t.role === "assistant")?.content ?? "";
  const topic = new Set(words(`${previous.content} ${lastAnswer}`));
  const content = q.filter((w) => !STOP.has(w) && w.length > 2);
  // Pure elliptical questions ("why?", "go on") have no topic of their own.
  if (!content.length) return q.length <= 5;
  return q.length <= 9 && content.some((w) => topic.has(w));
}
