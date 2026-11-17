import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { logger } from "../config/logger";
import { AppError } from "../utils/errors";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` } });
}

/** Single place that turns errors into API responses. Internals never leak to clients. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.status >= 500) logger.error({ err, requestId: req.requestId }, err.message);
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
    return res.status(400).json({ error: { code: "UPLOAD_ERROR", message } });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Malformed JSON body" } });
  }
  logger.error({ err, requestId: req.requestId, path: req.path }, "Unhandled error");
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side", requestId: req.requestId },
  });
}
