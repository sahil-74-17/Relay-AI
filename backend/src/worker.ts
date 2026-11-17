import { logger } from "./config/logger";
import { buildContainer } from "./container";
import { registerSubscribers, scheduleIncidentSweep } from "./jobs/subscribers";
import { startWorkers } from "./jobs/workers";

// Standalone worker process (use with RUN_WORKERS=false on the API).
const container = buildContainer();
registerSubscribers(container);
const workers = startWorkers(container);
await scheduleIncidentSweep();
logger.info("Worker process ready");

process.on("SIGTERM", async () => {
  await Promise.allSettled(workers.map((w) => w.close()));
  process.exit(0);
});
