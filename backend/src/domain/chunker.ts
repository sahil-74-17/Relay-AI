export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
}

export interface ChunkerOptions {
  /** Target chunk size in characters (~4 chars per token). */
  maxChars: number;
  /** Characters of trailing context repeated at the start of the next chunk. */
  overlap: number;
}

const DEFAULTS: ChunkerOptions = { maxChars: 700, overlap: 120 };
const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;

interface Section {
  path: string[];
  body: string;
}

/** Splits markdown-like text into sections, tracking the heading path (H1 > H2 > ...). */
function sections(text: string): Section[] {
  const result: Section[] = [];
  const path: string[] = [];
  let body: string[] = [];
  const flush = () => {
    const content = body.join("\n").trim();
    if (content) result.push({ path: [...path], body: content });
    body = [];
  };
  for (const line of text.split("\n")) {
    const match = line.match(HEADING);
    if (!match) {
      body.push(line);
      continue;
    }
    flush();
    const level = match[1].length;
    path.splice(level - 1);
    path[level - 1] = match[2];
  }
  flush();
  return result;
}

/** Packs paragraphs (then sentences) of one section into chunks with overlap. */
function pack(body: string, { maxChars, overlap }: ChunkerOptions): string[] {
  const units: string[] = [];
  for (const paragraph of body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)) {
    if (paragraph.length <= maxChars) units.push(paragraph);
    else
      for (const sentence of paragraph.split(/(?<=[.!?])\s+/))
        for (let i = 0; i < sentence.length; i += maxChars) units.push(sentence.slice(i, i + maxChars));
  }
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    const tail = current.slice(-overlap);
    const carry = current && overlap > 0 ? tail.slice(tail.indexOf(" ") + 1) : "";
    current = carry && carry.length + unit.length + 2 <= maxChars ? `${carry} … ${unit}` : unit;
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Structure-aware chunker. Each heading section becomes its own chunk(s), so a
 * chunk is about one topic, and the heading path is prefixed ("Billing > Refund
 * policy") so the embedding keeps its context. Plain text (e.g. from PDFs)
 * without headings falls back to paragraph packing.
 */
export function chunkText(raw: string, options: ChunkerOptions = DEFAULTS): Chunk[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return [];
  const contents = sections(text).flatMap(({ path, body }) => {
    const heading = path.filter(Boolean).join(" > ");
    return pack(body, options).map((part) => (heading ? `${heading}\n${part}` : part));
  });
  return contents.map((content, index) => ({ index, content, tokenCount: estimateTokens(content) }));
}
