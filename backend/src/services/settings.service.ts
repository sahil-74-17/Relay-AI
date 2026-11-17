import type { SettingsRepository } from "../repositories/settings.repository";
import type { SettingsDto } from "../validators/admin.validators";

export const DEFAULT_SETTINGS = {
  /** Below this ML category confidence a ticket goes to the human review queue. */
  confidenceThreshold: 0.55,
  /** Minimum cosine similarity for "related tickets". */
  similarTicketThreshold: 0.55,
  /** Minimum cosine similarity for a chunk to be used as RAG context. */
  ragMinSimilarity: 0.3,
  /** Share of query terms a chunk must contain to count as a keyword match (hybrid search). */
  ragMinKeywordCoverage: 0.5,
  ragTopK: 4,
  incidentWindowMinutes: 60,
  incidentMinClusterSize: 3,
  incidentSimilarityThreshold: 0.6,
  incidentSpikeRatio: 3,
};

export type SystemSettings = typeof DEFAULT_SETTINGS;

/** DB-backed, admin-tunable thresholds with defaults and a short in-process cache. */
export class SettingsService {
  private cache: { value: SystemSettings; expires: number } | null = null;

  constructor(private readonly repo: SettingsRepository, private readonly ttlMs = 15_000) {}

  async get(): Promise<SystemSettings> {
    if (this.cache && this.cache.expires > Date.now()) return this.cache.value;
    const rows = await this.repo.all();
    const stored = Object.fromEntries(rows.filter((r) => r.key in DEFAULT_SETTINGS).map((r) => [r.key, r.value]));
    const value = { ...DEFAULT_SETTINGS, ...stored } as SystemSettings;
    this.cache = { value, expires: Date.now() + this.ttlMs };
    return value;
  }

  async update(patch: SettingsDto): Promise<SystemSettings> {
    await Promise.all(
      Object.entries(patch)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => this.repo.upsert(k, v as number)),
    );
    this.cache = null;
    return this.get();
  }
}
