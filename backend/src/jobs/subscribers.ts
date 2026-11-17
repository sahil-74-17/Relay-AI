import type { Container } from "../container";
import { incidentQueue, ingestionQueue, scheduleIncidentDetection, triageQueue } from "./queues";

/** Wires domain events to background jobs (services stay unaware of queues). */
export function registerSubscribers({ events }: Container) {
  events.on("ticket.created", ({ ticketId }) => triageQueue.add("triage", { ticketId }).then(() => undefined));
  events.on("ticket.reanalyze", ({ ticketId }) => triageQueue.add("triage", { ticketId }).then(() => undefined));
  events.on("ticket.triaged", () => scheduleIncidentDetection().then(() => undefined));
  events.on("document.uploaded", ({ documentId }) => ingestionQueue.add("ingest", { documentId }).then(() => undefined));
}

/** Periodic sweep so incidents are detected even without new tickets. */
export const scheduleIncidentSweep = () =>
  incidentQueue.upsertJobScheduler("incident-sweep", { every: 5 * 60_000 }, { name: "detect" });
