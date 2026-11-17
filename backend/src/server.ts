import "./types/auth";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { createApp } from "./app";
import { buildContainer } from "./container";
import { closeQueues } from "./jobs/queues";
import { registerSubscribers, scheduleIncidentSweep } from "./jobs/subscribers";
import { startWorkers } from "./jobs/workers";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";

const container = buildContainer();
registerSubscribers(container);
// For a simple local setup workers run in-process; set RUN_WORKERS=false and use `npm run worker` to scale them separately.
const workers = env.RUN_WORKERS ? startWorkers(container) : [];
if (env.RUN_WORKERS) await scheduleIncidentSweep();

const server = createApp(container).listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}/api/v1 (LLM: ${container.llmName})`);
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close();
  await Promise.allSettled([...workers.map((w) => w.close()), closeQueues()]);
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
