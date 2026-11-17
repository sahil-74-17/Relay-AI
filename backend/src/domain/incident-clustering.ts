import type { Priority } from "../generated/prisma/enums";

export interface SimilarityEdge {
  a: string;
  b: string;
  similarity: number;
}

export interface Cluster {
  ids: string[];
  /** Ticket with the highest total similarity to the rest: the best representative. */
  medoidId: string;
  avgSimilarity: number;
}

/** Connected components over similarity edges (union-find). */
export function clusterBySimilarity(ids: string[], edges: SimilarityEdge[]): Cluster[] {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };
  for (const { a, b } of edges) {
    if (!parent.has(a) || !parent.has(b)) continue;
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  const groups = new Map<string, string[]>();
  for (const id of ids) groups.set(find(id), [...(groups.get(find(id)) ?? []), id]);

  return [...groups.values()]
    .filter((members) => members.length > 1)
    .map((members) => {
      const set = new Set(members);
      const inner = edges.filter((e) => set.has(e.a) && set.has(e.b));
      const score = new Map(members.map((m) => [m, 0]));
      for (const e of inner) {
        score.set(e.a, score.get(e.a)! + e.similarity);
        score.set(e.b, score.get(e.b)! + e.similarity);
      }
      const medoidId = [...score.entries()].sort((x, y) => y[1] - x[1])[0][0];
      const avgSimilarity = inner.length ? inner.reduce((s, e) => s + e.similarity, 0) / inner.length : 0;
      return { ids: members, medoidId, avgSimilarity };
    })
    .sort((x, y) => y.ids.length - x.ids.length);
}

/** Volume in the window compared to the average volume per window over the baseline period. */
export function spikeRatio(windowCount: number, baselineCount: number, windowMinutes: number, baselineMinutes: number): number {
  const windows = baselineMinutes / windowMinutes;
  const expected = Math.max(baselineCount / windows, 0.5); // floor avoids divide-by-~0 blowups
  return Number((windowCount / expected).toFixed(2));
}

export function incidentSeverity(size: number, ratio: number, spikeThreshold: number): Priority {
  let level = size >= 8 ? 3 : size >= 5 ? 2 : 1;
  if (ratio >= spikeThreshold) level += 1;
  return (["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const)[Math.min(level, 3)];
}
