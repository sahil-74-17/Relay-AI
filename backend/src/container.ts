/**
 * Composition root: the only place that knows concrete implementations.
 * Everything else depends on constructor-injected abstractions (DIP).
 */
import { env } from "./config/env";
import { defaultPriorityEngine } from "./domain/priority-engine";
import { EventBus } from "./events/event-bus";
import { createLlmProvider } from "./integrations/llm/llm-factory";
import { createMailer } from "./integrations/mailer";
import { HttpMlClient, type MlClient } from "./integrations/ml-client";
import { prisma } from "./lib/prisma";
import { ConversationRepository } from "./repositories/conversation.repository";
import { DocumentRepository } from "./repositories/document.repository";
import { SettingsRepository } from "./repositories/settings.repository";
import { TeamRepository } from "./repositories/team.repository";
import { UserRepository } from "./repositories/user.repository";
import { AdminService } from "./services/admin.service";
import { AnalyticsService } from "./services/analytics.service";
import {
  type AnswerGenerator,
  ExtractiveAnswerGenerator,
  HeuristicTicketSummarizer,
  LlmAnswerGenerator,
  LlmTicketSummarizer,
  type TicketSummarizer,
} from "./services/answer-generation";
import { AuthService } from "./services/auth.service";
import { ChatService } from "./services/chat.service";
import { DocumentService } from "./services/document.service";
import { IncidentService } from "./services/incident.service";
import { IngestionService } from "./services/ingestion.service";
import { RagService } from "./services/rag.service";
import { ReplySuggestionService } from "./services/reply-suggestion.service";
import { ReviewService } from "./services/review.service";
import { LeastLoadedAssignment, RoutingService } from "./services/routing.service";
import { SettingsService } from "./services/settings.service";
import { TicketService } from "./services/ticket.service";
import { TriageService } from "./services/triage.service";

export function buildContainer(overrides: { ml?: MlClient } = {}) {
  const events = new EventBus();
  const ml = overrides.ml ?? new HttpMlClient();
  const llm = createLlmProvider(env);
  const mailer = createMailer(env);

  const users = new UserRepository(prisma);
  const teams = new TeamRepository(prisma);
  const documents = new DocumentRepository(prisma);
  const settings = new SettingsService(new SettingsRepository(prisma));

  const extractive = new ExtractiveAnswerGenerator();
  const answerGenerator: AnswerGenerator = llm ? new LlmAnswerGenerator(llm, extractive) : extractive;
  const heuristic = new HeuristicTicketSummarizer();
  const summarizer: TicketSummarizer = llm ? new LlmTicketSummarizer(llm, heuristic) : heuristic;

  const routing = new RoutingService(teams, new LeastLoadedAssignment(users));
  const tickets = new TicketService(prisma, events, settings);
  const rag = new RagService(ml, documents, answerGenerator, settings);

  return {
    events,
    ml,
    llmName: llm?.name ?? "extractive (no LLM configured)",
    settings,
    auth: new AuthService(users, mailer),
    tickets,
    triage: new TriageService(prisma, ml, defaultPriorityEngine(), routing, settings, events),
    review: new ReviewService(prisma, routing),
    rag,
    chat: new ChatService(new ConversationRepository(prisma), rag, summarizer, tickets),
    replySuggestions: new ReplySuggestionService(rag, tickets, llm),
    documents: new DocumentService(documents, events),
    ingestion: new IngestionService(prisma, ml),
    incidents: new IncidentService(prisma, settings),
    analytics: new AnalyticsService(prisma),
    admin: new AdminService(users, teams),
  };
}

export type Container = ReturnType<typeof buildContainer>;
