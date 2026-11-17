import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { BadRequestError } from "../utils/errors";

/** Text extraction per file type (Strategy), selected by extension/mime. */
export interface TextExtractor {
  supports(fileName: string, mimeType: string): boolean;
  extract(path: string): Promise<string>;
}

class PlainTextExtractor implements TextExtractor {
  supports(fileName: string, mimeType: string) {
    return [".txt", ".md", ".markdown"].includes(extname(fileName).toLowerCase()) || mimeType.startsWith("text/");
  }
  extract(path: string) {
    return readFile(path, "utf8");
  }
}

class PdfExtractor implements TextExtractor {
  supports(fileName: string, mimeType: string) {
    return extname(fileName).toLowerCase() === ".pdf" || mimeType === "application/pdf";
  }
  async extract(path: string) {
    // Import the library entry directly: the package index runs a debug harness.
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const result = await pdfParse(await readFile(path));
    return result.text;
  }
}

const extractors: TextExtractor[] = [new PdfExtractor(), new PlainTextExtractor()];

export const SUPPORTED_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"];

export function extractorFor(fileName: string, mimeType: string): TextExtractor {
  const extractor = extractors.find((e) => e.supports(fileName, mimeType));
  if (!extractor) throw new BadRequestError(`Unsupported file type. Upload ${SUPPORTED_EXTENSIONS.join(", ")}`);
  return extractor;
}
