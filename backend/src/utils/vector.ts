import { EMBEDDING_DIM } from "../config/constants";

/** Serialises an embedding into pgvector's text format, validating its shape. */
export function toPgVector(values: number[]): string {
  if (values.length !== EMBEDDING_DIM) {
    throw new Error(`Expected embedding of length ${EMBEDDING_DIM}, got ${values.length}`);
  }
  if (!values.every(Number.isFinite)) throw new Error("Embedding contains non-finite values");
  return `[${values.join(",")}]`;
}
