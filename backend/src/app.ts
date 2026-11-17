import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import type { Container } from "./container";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiLimiter } from "./middleware/rate-limit";
import { requestContext } from "./middleware/request-context";
import { buildRouter } from "./routes";

export function createApp(container: Container) {
  const app = express();
  app.disable("x-powered-by");
  // Only trust forwarded IP headers when explicitly deployed behind a trusted proxy;
  // otherwise a client could spoof X-Forwarded-For and bypass rate limits.
  app.set("trust proxy", env.TRUST_PROXY ? 1 : false);

  app.use(requestContext);
  app.use(pinoHttp({ logger, genReqId: (req) => (req as express.Request).requestId ?? "", autoLogging: { ignore: (req) => req.url === "/api/v1/health" } }));
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use("/api/v1", apiLimiter, buildRouter(container));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
