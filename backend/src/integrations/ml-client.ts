import { env } from "../config/env";
import { logger } from "../config/logger";
import type { Category, Priority, Sentiment } from "../generated/prisma/enums";
import { ServiceUnavailableError } from "../utils/errors";

export interface LabelPrediction<T extends string> {
  label: T;
  confidence: number;
  scores: Record<T, number>;
}

export interface TicketAnalysis {
  category: LabelPrediction<Category>;
  priority: LabelPrediction<Priority>;
  sentiment: { label: Sentiment; score: number; compound: number };
  embedding: number[];
  modelVersion: string;
}

/** Abstraction the backend depends on (DIP); the HTTP implementation is one adapter. */
export interface MlClient {
  analyze(title: string, description: string): Promise<TicketAnalysis>;
  embed(texts: string[]): Promise<number[][]>;
  health(): Promise<boolean>;
}

export class HttpMlClient implements MlClient {
  constructor(
    private readonly baseUrl = env.ML_SERVICE_URL,
    private readonly timeoutMs = env.ML_TIMEOUT_MS,
  ) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      logger.error({ err, path }, "ML service unreachable");
      throw new ServiceUnavailableError("The ML service");
    }
    if (!res.ok) {
      logger.error({ status: res.status, path, body: await res.text().catch(() => "") }, "ML service error");
      throw new ServiceUnavailableError("The ML service");
    }
    return (await res.json()) as T;
  }

  analyze(title: string, description: string) {
    return this.post<TicketAnalysis>("/v1/analyze", { title, description });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const batches: number[][] = [];
    for (let i = 0; i < texts.length; i += 64) {
      const { embeddings } = await this.post<{ embeddings: number[][] }>("/v1/embed", { texts: texts.slice(i, i + 64) });
      batches.push(...embeddings);
    }
    return batches;
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
