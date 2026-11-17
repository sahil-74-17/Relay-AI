import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"];
  req.requestId = typeof incoming === "string" && incoming.length < 100 ? incoming : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}
