/**
 * Lightweight conversational-intent detection, run before knowledge-base retrieval.
 *
 * A message counts as conversational only when it consists ENTIRELY of casual phrases
 * ("hi", "ok thanks", "hello, how are you?"). Anything else, including
 * "hi, I was charged twice" or "thanks but it still fails", is a support question and
 * goes through retrieval as before. Replies are fixed text: no LLM, no product claims.
 */
export type ConversationalIntent = "greeting" | "farewell" | "thanks" | "acknowledgement" | "pleasantry" | "capabilities";

const PHRASES: Record<ConversationalIntent, string[]> = {
  greeting: ["hi", "hii", "hello", "hey", "heya", "hiya", "yo", "namaste", "good morning", "good afternoon", "good evening", "greetings"],
  farewell: ["bye", "bye bye", "goodbye", "good bye", "see you", "see ya", "see you later", "take care", "good night", "cya", "later"],
  thanks: ["thanks", "thank you", "thank u", "thx", "ty", "tysm", "many thanks", "much appreciated", "appreciate it", "thanks a lot", "thank you so much", "thanks so much", "dhanyavad", "shukriya"],
  acknowledgement: ["ok", "okay", "okk", "k", "kk", "got it", "gotcha", "understood", "cool", "great", "nice", "perfect", "alright", "all right", "sure", "fine", "noted", "makes sense", "awesome", "sounds good", "that helps", "that helped", "that works", "it worked", "yes", "yep", "yeah", "no worries", "no problem"],
  pleasantry: ["how are you", "how are you doing", "how r u", "how is it going", "hows it going", "whats up", "sup", "nice to meet you", "good to meet you"],
  capabilities: ["who are you", "what are you", "what can you do", "what do you do", "how can you help", "help"],
};

/** Words that can accompany casual phrases without changing their meaning ("hi there", "thanks a lot bot"). */
const FILLERS = new Set(["there", "again", "so", "much", "a", "lot", "very", "bot", "assistant", "relay", "team", "everyone", "all", "today", "and", "then", "oh", "well", "ji", "dear", "buddy", "mate", "friend", "please", "pls", "you", "too", "for", "the", "help"]);

/** Precedence when a message mixes intents, e.g. "ok thanks bye" is a farewell. */
const PRECEDENCE: ConversationalIntent[] = ["farewell", "thanks", "capabilities", "pleasantry", "greeting", "acknowledgement"];

const MAX_WORDS = 10;

// Longest phrases first so "thank you so much" wins over "thank you".
const PHRASE_LIST = (Object.entries(PHRASES) as [ConversationalIntent, string[]][])
  .flatMap(([intent, phrases]) => phrases.map((p) => ({ intent, words: p.split(" ") })))
  .sort((a, b) => b.words.length - a.words.length);

export function normalizeMessage(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z\s]/g, " ") // punctuation, emoji and digits
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/(.)\1{2,}/g, "$1$1")) // "heyyyy" → "heyy"
    .map((w) => (/^(hi+|he+y+|o+k+|tha+nks+)$/.test(w) ? w.replace(/(.)\1+/g, "$1") : w)); // "hii", "okkk" → "hi", "ok"
}

/** Returns the conversational intent, or null when the message should go to the knowledge base. */
export function detectConversationalIntent(text: string): ConversationalIntent | null {
  const words = normalizeMessage(text);
  if (!words.length || words.length > MAX_WORDS) return null;

  const found = new Set<ConversationalIntent>();
  let i = 0;
  while (i < words.length) {
    const match = PHRASE_LIST.find((p) => p.words.every((w, k) => words[i + k] === w));
    if (match) {
      found.add(match.intent);
      i += match.words.length;
    } else if (FILLERS.has(words[i])) {
      i += 1;
    } else {
      return null; // a non-casual word: treat the whole message as a support question
    }
  }
  return PRECEDENCE.find((intent) => found.has(intent)) ?? null;
}

const REPLIES: Record<ConversationalIntent, string> = {
  greeting: "Hi! I'm the Relay support assistant. Ask me about your account, billing, the API or anything else in our help documentation.",
  pleasantry: "I'm doing well, thanks for asking! What can I help you with today? I can answer questions from our help documentation.",
  capabilities:
    "I answer questions using our help documentation and show you the sources I used. If I can't find a reliable answer, I can turn our conversation into a support ticket for the team.",
  thanks: "You're welcome! Let me know if there's anything else I can help with.",
  acknowledgement: "Great. Is there anything else I can help you with?",
  farewell: "Goodbye! If anything else comes up, I'm here to help.",
};

export const conversationalReply = (intent: ConversationalIntent) => REPLIES[intent];