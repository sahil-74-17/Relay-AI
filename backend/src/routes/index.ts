import { mkdirSync } from "node:fs";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import type { Container } from "../container";
import { adminController } from "../controllers/admin.controller";
import { authController } from "../controllers/auth.controller";
import { chatController } from "../controllers/chat.controller";
import { ticketController } from "../controllers/ticket.controller";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { authenticate, authorize } from "../middleware/auth";
import { authLimiter, chatLimiter, uploadLimiter } from "../middleware/rate-limit";
import { validate } from "../middleware/validate";
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
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "../validators/auth.validators";
import { createConversationSchema, messageFeedbackSchema, messageParam, sendMessageSchema } from "../validators/chat.validators";
import { idParam, pageQuery } from "../validators/common";
import { commentSchema, createTicketSchema, listTicketsSchema, reviewSchema, updateTicketSchema } from "../validators/ticket.validators";

mkdirSync(env.UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: env.UPLOAD_DIR,
    // Never trust the client filename on disk.
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});

const STAFF = ["AGENT", "ADMIN"] as const;

export function buildRouter(c: Container): Router {
  const router = Router();
  const auth = authController(c);
  const tickets = ticketController(c);
  const chat = chatController(c);
  const admin = adminController(c);

  router.get(
    "/health",
    asyncHandler(async (_req, res) => {
      const [db, cache, ml] = await Promise.all([
        prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        redis.ping().then(() => true).catch(() => false),
        c.ml.health(),
      ]);
      res.status(db && cache ? 200 : 503).json({ status: db && cache ? "ok" : "degraded", db, redis: cache, ml, llm: c.llmName });
    }),
  );

  // Auth
  router.post("/auth/login", authLimiter, validate(loginSchema), auth.login);
  router.post("/auth/register", authLimiter, validate(registerSchema), auth.register);
  router.post("/auth/forgot-password", authLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
  router.post("/auth/reset-password", authLimiter, validate(resetPasswordSchema), auth.resetPassword);
  router.post("/auth/logout", auth.logout);
  router.get("/auth/me", authenticate, auth.me);
  router.get("/auth/providers", auth.providers);
  router.get("/auth/google", authLimiter, auth.googleStart);
  router.get("/auth/google/callback", authLimiter, auth.googleCallback);

  // Everything below requires a session.
  router.use(authenticate);

  router.get("/dashboard", admin.dashboard);

  // Tickets
  router.get("/tickets", validate(listTicketsSchema, "query"), tickets.list);
  router.post("/tickets", validate(createTicketSchema), tickets.create);
  router.get("/tickets/:id", validate(idParam, "params"), tickets.get);
  router.patch("/tickets/:id", authorize(...STAFF), validate(idParam, "params"), validate(updateTicketSchema), tickets.update);
  router.post("/tickets/:id/comments", validate(idParam, "params"), validate(commentSchema), tickets.comment);
  router.post("/tickets/:id/reanalyze", authorize(...STAFF), validate(idParam, "params"), tickets.reanalyze);
  router.post("/tickets/:id/suggest-reply", authorize(...STAFF), validate(idParam, "params"), tickets.suggestReply);
  router.post("/tickets/:id/review", authorize(...STAFF), validate(idParam, "params"), validate(reviewSchema), tickets.review);

  // Human review queue
  router.get("/review-queue", authorize(...STAFF), validate(pageQuery, "query"), tickets.reviewQueue);
  router.get("/feedback", authorize(...STAFF), tickets.recentFeedback);

  // AI assistant (RAG)
  router.get("/conversations", chat.list);
  router.post("/conversations", validate(createConversationSchema), chat.create);
  router.get("/conversations/:id", validate(idParam, "params"), chat.get);
  router.delete("/conversations/:id", validate(idParam, "params"), chat.remove);
  router.post("/conversations/:id/messages", chatLimiter, validate(idParam, "params"), validate(sendMessageSchema), chat.send);
  router.post("/conversations/:id/messages/:messageId/feedback", validate(messageParam, "params"), validate(messageFeedbackSchema), chat.feedback);
  router.delete("/conversations/:id/messages", validate(idParam, "params"), chat.clear);
  router.post("/conversations/:id/escalate", chatLimiter, validate(idParam, "params"), chat.escalate);

  // Staff directory (assignment pickers)
  router.get("/agents", authorize(...STAFF), admin.listAgents);
  router.get("/teams", authorize(...STAFF), admin.listTeams);

  // Incidents
  router.get("/incidents", authorize(...STAFF), validate(listIncidentsSchema, "query"), admin.listIncidents);
  router.post("/incidents/detect", authorize(...STAFF), admin.detectIncidents);
  router.get("/incidents/:id", authorize(...STAFF), validate(idParam, "params"), admin.getIncident);
  router.patch("/incidents/:id", authorize(...STAFF), validate(idParam, "params"), validate(updateIncidentSchema), admin.updateIncident);

  // Admin
  router.get("/analytics/overview", authorize("ADMIN"), validate(analyticsQuery, "query"), admin.overview);
  router.get("/users", authorize("ADMIN"), validate(listUsersSchema, "query"), admin.listUsers);
  router.patch("/users/:id", authorize("ADMIN"), validate(idParam, "params"), validate(updateUserSchema), admin.updateUser);
  router.post("/teams", authorize("ADMIN"), validate(teamSchema), admin.createTeam);
  router.patch("/teams/:id", authorize("ADMIN"), validate(idParam, "params"), validate(updateTeamSchema), admin.updateTeam);
  router.get("/documents", authorize("ADMIN"), admin.listDocuments);
  router.post("/documents", authorize("ADMIN"), uploadLimiter, upload.single("file"), validate(documentUploadSchema), admin.uploadDocument);
  router.delete("/documents/:id", authorize("ADMIN"), validate(idParam, "params"), admin.deleteDocument);
  router.post("/documents/:id/reprocess", authorize("ADMIN"), validate(idParam, "params"), admin.reprocessDocument);
  router.get("/settings", authorize("ADMIN"), admin.getSettings);
  router.patch("/settings", authorize("ADMIN"), validate(settingsSchema), admin.updateSettings);

  return router;
}
