import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1).max(64) });

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
