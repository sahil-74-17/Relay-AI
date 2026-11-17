import type { Container } from "../container";
import { currentUser } from "../middleware/auth";
import { dto } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import {
  analyticsQuery,
  documentUploadSchema,
  listIncidentsSchema,
  listUsersSchema,
  settingsSchema,
  teamSchema,
  updateIncidentSchema,
  updateTeamSchema,
  updateUserSchema,
} from "../validators/admin.validators";
import { idParam } from "../validators/common";

export const adminController = (c: Container) => ({
  // Users & teams
  listUsers: asyncHandler(async (_req, res) => {
    const { q, role, page, pageSize } = dto(res, "query", listUsersSchema);
    res.json(await c.admin.listUsers({ q, role }, { page, pageSize }));
  }),
  updateUser: asyncHandler(async (req, res) => {
    res.json(await c.admin.updateUser(currentUser(req), dto(res, "params", idParam).id, dto(res, "body", updateUserSchema)));
  }),
  listAgents: asyncHandler(async (_req, res) => {
    res.json(await c.admin.listAgents());
  }),
  listTeams: asyncHandler(async (_req, res) => {
    res.json(await c.admin.listTeams());
  }),
  createTeam: asyncHandler(async (_req, res) => {
    res.status(201).json(await c.admin.createTeam(dto(res, "body", teamSchema)));
  }),
  updateTeam: asyncHandler(async (_req, res) => {
    res.json(await c.admin.updateTeam(dto(res, "params", idParam).id, dto(res, "body", updateTeamSchema)));
  }),
  // Knowledge base
  listDocuments: asyncHandler(async (_req, res) => {
    res.json(await c.documents.list());
  }),
  uploadDocument: asyncHandler(async (req, res) => {
    res.status(202).json(await c.documents.upload(currentUser(req), req.file, dto(res, "body", documentUploadSchema).title));
  }),
  deleteDocument: asyncHandler(async (_req, res) => {
    await c.documents.remove(dto(res, "params", idParam).id);
    res.status(204).end();
  }),
  reprocessDocument: asyncHandler(async (_req, res) => {
    res.status(202).json(await c.documents.reprocess(dto(res, "params", idParam).id));
  }),
  // Incidents
  listIncidents: asyncHandler(async (_req, res) => {
    const { status, page, pageSize } = dto(res, "query", listIncidentsSchema);
    res.json(await c.incidents.list(status, { page, pageSize }));
  }),
  getIncident: asyncHandler(async (_req, res) => {
    res.json(await c.incidents.get(dto(res, "params", idParam).id));
  }),
  updateIncident: asyncHandler(async (_req, res) => {
    res.json(await c.incidents.updateStatus(dto(res, "params", idParam).id, dto(res, "body", updateIncidentSchema).status));
  }),
  detectIncidents: asyncHandler(async (_req, res) => {
    res.json(await c.incidents.detect());
  }),
  // Analytics & settings
  overview: asyncHandler(async (_req, res) => {
    const { days } = dto(res, "query", analyticsQuery);
    res.json(await c.analytics.overview(days));
  }),
  dashboard: asyncHandler(async (req, res) => {
    res.json(await c.analytics.dashboard(currentUser(req)));
  }),
  getSettings: asyncHandler(async (_req, res) => {
    res.json({ settings: await c.settings.get(), llm: c.llmName });
  }),
  updateSettings: asyncHandler(async (_req, res) => {
    res.json({ settings: await c.settings.update(dto(res, "body", settingsSchema)), llm: c.llmName });
  }),
});
