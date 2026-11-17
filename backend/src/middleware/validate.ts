import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";
import { ValidationError } from "../utils/errors";

type Source = "body" | "query" | "params";

/**
 * Validates and coerces a request part with a Zod schema. The parsed DTO is
 * stored on res.locals so controllers receive typed, sanitised input.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(new ValidationError(result.error.flatten()));
    res.locals[source] = result.data;
    next();
  };

export const dto = <S extends ZodTypeAny>(res: Response, source: Source, _schema: S): z.infer<S> =>
  res.locals[source] as z.infer<S>;
