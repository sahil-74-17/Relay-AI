import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { Category, IncidentStatus } from "../generated/prisma/enums";
import { CATEGORY_LABELS, INCIDENT_TRANSITIONS } from "../config/constants";
import { logger } from "../config/logger";
import { clusterBySimilarity, incidentSeverity, spikeRatio } from "../domain/incident-clustering";
import { IncidentRepository } from "../repositories/incident.repository";
import { TicketRepository } from "../repositories/ticket.repository";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { type PageParams, paginate } from "../utils/pagination";
import type { SettingsService } from "./settings.service";

const BASELINE_MINUTES = 7 * 24 * 60;
const SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;

export interface DetectionResult {
  created: number;
  updated: number;
  ticketsLinked: number;
}

/**
 * Compact incident intelligence over tickets (no log ingestion):
 * recent window → same-category embedding clusters → spike ratio → incident.
 */
export class IncidentService {
  private readonly incidents: IncidentRepository;
  private readonly tickets: TicketRepository;

  constructor(private readonly prisma: PrismaClient, private readonly settings: SettingsService) {
    this.incidents = new IncidentRepository(prisma);
    this.tickets = new TicketRepository(prisma);
  }

  async list(status: IncidentStatus | undefined, page: PageParams) {
    const { items, total } = await this.incidents.list(status, page);
    return paginate(items, total, page);
  }

  async get(id: string) {
    const incident = await this.incidents.findDetail(id);
    if (!incident) throw new NotFoundError("Incident");
    return incident;
  }

  async updateStatus(id: string, status: IncidentStatus) {
    const incident = await this.get(id);
    if (incident.status !== status && !INCIDENT_TRANSITIONS[incident.status].includes(status)) {
      throw new BadRequestError(`An ${incident.status.toLowerCase()} incident can't move to ${status.toLowerCase()}`);
    }
    return this.incidents.update(id, { status, resolvedAt: status === "RESOLVED" ? new Date() : null });
  }

  async detect(now = new Date()): Promise<DetectionResult> {
    const cfg = await this.settings.get();
    const since = new Date(now.getTime() - cfg.incidentWindowMinutes * 60_000);
    const windowTickets = await this.tickets.windowTickets(since);
    const result: DetectionResult = { created: 0, updated: 0, ticketsLinked: 0 };

    const byCategory = new Map<Category, typeof windowTickets>();
    for (const t of windowTickets) byCategory.set(t.category!, [...(byCategory.get(t.category!) ?? []), t]);

    for (const [category, tickets] of byCategory) {
      if (tickets.length < cfg.incidentMinClusterSize) continue;
      const ids = tickets.map((t) => t.id);
      const edges = (await this.tickets.similarityEdges(ids, cfg.incidentSimilarityThreshold)).map((e) => ({
        ...e,
        similarity: Number(e.similarity),
      }));
      const baseline = await this.tickets.countByCategorySince(category, new Date(since.getTime() - BASELINE_MINUTES * 60_000), since);
      const ratio = spikeRatio(tickets.length, baseline, cfg.incidentWindowMinutes, BASELINE_MINUTES);
      const isSpike = ratio >= cfg.incidentSpikeRatio;

      const clusters = clusterBySimilarity(ids, edges).filter((c) => c.ids.length >= cfg.incidentMinClusterSize);
      // Unusual volume with no tight cluster is still worth a look.
      if (!clusters.length && isSpike && tickets.length >= cfg.incidentMinClusterSize * 2) {
        clusters.push({ ids, medoidId: tickets[tickets.length - 1].id, avgSimilarity: 0 });
      }

      const byId = new Map(tickets.map((t) => [t.id, t]));
      for (const cluster of clusters) {
        const outcome = await this.upsertIncident(category, cluster, byId, { ratio, isSpike, windowMinutes: cfg.incidentWindowMinutes, spikeThreshold: cfg.incidentSpikeRatio });
        result.created += outcome.created ? 1 : 0;
        result.updated += outcome.created ? 0 : 1;
        result.ticketsLinked += outcome.linked;
      }
    }
    if (result.created || result.ticketsLinked) logger.info(result, "Incident detection finished");
    return result;
  }

  private async upsertIncident(
    category: Category,
    cluster: { ids: string[]; medoidId: string; avgSimilarity: number },
    byId: Map<string, { id: string; title: string; incidentId: string | null }>,
    s: { ratio: number; isSpike: boolean; windowMinutes: number; spikeThreshold: number },
  ) {
    const active = await this.incidents.findActive(category);
    const clusterSet = new Set(cluster.ids);
    const existing = active.find((i) => i.tickets.some((t) => clusterSet.has(t.id)));
    const activeIds = new Set(active.map((a) => a.id));
    // Never steal tickets from another active incident; re-link tickets of resolved ones.
    const linkable = cluster.ids.filter((id) => {
      const current = byId.get(id)?.incidentId;
      return !current || current === existing?.id || !activeIds.has(current);
    });
    const label = CATEGORY_LABELS[category];
    const size = new Set([...(existing?.tickets.map((t) => t.id) ?? []), ...linkable]).size;
    const severity = incidentSeverity(size, s.ratio, s.spikeThreshold);
    const summary =
      `${size} related ${label.toLowerCase()} reports within ${s.windowMinutes} minutes` +
      (s.isSpike ? `. Volume is ${s.ratio}× the normal rate.` : ".");
    const signals = {
      clusterSize: size,
      avgSimilarity: Number(cluster.avgSimilarity.toFixed(3)),
      spikeRatio: s.ratio,
      isSpike: s.isSpike,
      windowMinutes: s.windowMinutes,
    } satisfies Prisma.InputJsonObject;

    return this.prisma.$transaction(async (tx) => {
      const incidents = new IncidentRepository(tx);
      const tickets = new TicketRepository(tx);
      let incidentId: string;
      let created = false;
      if (existing) {
        incidentId = existing.id;
        const keep = SEVERITY_RANK[existing.severity] >= SEVERITY_RANK[severity] ? existing.severity : severity;
        await incidents.update(existing.id, { summary, severity: keep, signals });
      } else {
        const medoid = byId.get(cluster.medoidId);
        const incident = await incidents.create({ title: `${label}: ${medoid?.title ?? "related reports"}`, summary, category, severity, signals });
        incidentId = incident.id;
        created = true;
      }
      const newlyLinked = linkable.filter((id) => byId.get(id)?.incidentId !== incidentId);
      if (newlyLinked.length) {
        await incidents.linkTickets(incidentId, newlyLinked);
        for (const id of newlyLinked) await tickets.addActivity(id, null, "INCIDENT_LINKED", { incidentId });
      }
      return { created, linked: newlyLinked.length };
    });
  }
}
