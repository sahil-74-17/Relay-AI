import { type JobsOptions, Queue } from "bullmq";
import { QUEUES } from "../config/constants";
import { createRedisConnection } from "../lib/redis";

const connection = createRedisConnection();
const defaults: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 500 },
};

export const triageQueue = new Queue<{ ticketId: string }>(QUEUES.triage, { connection, defaultJobOptions: defaults });
export const ingestionQueue = new Queue<{ documentId: string }>(QUEUES.ingestion, { connection, defaultJobOptions: defaults });
export const incidentQueue = new Queue(QUEUES.incidents, { connection, defaultJobOptions: { ...defaults, attempts: 1 } });

/** Debounced: a burst of new tickets triggers one detection run, not one per ticket. */
export const scheduleIncidentDetection = () =>
  incidentQueue.add("detect", {}, { jobId: "detect-debounced", delay: 3000, removeOnComplete: true, removeOnFail: true });

export const closeQueues = () => Promise.all([triageQueue.close(), ingestionQueue.close(), incidentQueue.close()]);
