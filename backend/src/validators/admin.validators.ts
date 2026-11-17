import { z } from "zod";
import { Category, IncidentStatus, Role } from "../generated/prisma/enums";
import { pageQuery, trimmed } from "./common";

export const listUsersSchema = pageQuery.extend({
  q: z.string().trim().max(100).optional(),
  role: z.nativeEnum(Role).optional(),
});

export const updateUserSchema = z
  .object({
    role: z.nativeEnum(Role).optional(),
    teamId: z.string().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Nothing to update" });

export const teamSchema = z.object({
  name: trimmed(2, 80),
  description: trimmed(0, 300).optional(),
  category: z.nativeEnum(Category).nullable().optional(),
});
export const updateTeamSchema = teamSchema.partial();

export const settingsSchema = z
  .object({
    confidenceThreshold: z.number().min(0).max(1),
    similarTicketThreshold: z.number().min(0).max(1),
    ragMinSimilarity: z.number().min(0).max(1),
    ragMinKeywordCoverage: z.number().min(0).max(1),
    ragTopK: z.number().int().min(1).max(10),
    incidentWindowMinutes: z.number().int().min(5).max(24 * 60),
    incidentMinClusterSize: z.number().int().min(2).max(50),
    incidentSimilarityThreshold: z.number().min(0).max(1),
    incidentSpikeRatio: z.number().min(1).max(20),
  })
  .partial();

export const updateIncidentSchema = z.object({ status: z.nativeEnum(IncidentStatus) });

export const listIncidentsSchema = pageQuery.extend({ status: z.nativeEnum(IncidentStatus).optional() });

export const analyticsQuery = z.object({ days: z.coerce.number().int().min(7).max(365).default(30) });

export const documentUploadSchema = z.object({ title: trimmed(2, 200).optional() });

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type TeamDto = z.infer<typeof teamSchema>;
export type SettingsDto = z.infer<typeof settingsSchema>;
