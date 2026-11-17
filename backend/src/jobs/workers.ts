import { type Job, Worker } from "bullmq";
import { QUEUES } from "../config/constants";
import { logger } from "../config/logger";
import type { Container } from "../container";
import { createRedisConnection } from "../lib/redis";

const isFinalAttempt = (job: Job) => job.attemptsMade >= (job.opts.attempts ?? 1);

export function startWorkers(c: Container): Worker[] {
  const triage = new Worker<{ ticketId: string }>(QUEUES.triage, (job) => c.triage.triage(job.data.ticketId), {
    connection: createRedisConnection(),
    concurrency: 4,
  });
  triage.on("failed", (job, err) => {
    logger.warn({ err: err.message, ticketId: job?.data.ticketId, attempt: job?.attemptsMade }, "Triage attempt failed");
    if (job && isFinalAttempt(job)) {
      c.triage.markFailed(job.data.ticketId, err.message).catch((e) => logger.error({ e }, "markFailed failed"));
    }
  });

  const ingestion = new Worker<{ documentId: string }>(QUEUES.ingestion, (job) => c.ingestion.process(job.data.documentId), {
    connection: createRedisConnection(),
    concurrency: 2,
  });
  ingestion.on("failed", (job, err) => logger.warn({ err: err.message, documentId: job?.data.documentId }, "Ingestion failed"));

  const incidents = new Worker(QUEUES.incidents, () => c.incidents.detect(), { connection: createRedisConnection(), concurrency: 1 });
  incidents.on("failed", (_job, err) => logger.error({ err: err.message }, "Incident detection failed"));

  logger.info("Background workers started (triage, ingestion, incidents)");
  return [triage, ingestion, incidents];
}
