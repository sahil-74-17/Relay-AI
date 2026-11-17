export type Role = "USER" | "AGENT" | "ADMIN";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_FOR_USER" | "RESOLVED" | "CLOSED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Category = "ACCOUNT" | "BILLING" | "TECHNICAL" | "FEATURE_REQUEST" | "GENERAL";
export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type ReviewStatus = "NOT_REQUIRED" | "PENDING" | "ACCEPTED" | "CORRECTED";
export type SlaState = "met" | "on_track" | "due_soon" | "breached" | null;
export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";

export interface Ref { id: string; name: string }

export interface User {
  id: string; email: string; name: string; role: Role; isActive: boolean; teamId: string | null;
  team: Ref | null; createdAt: string; _count?: { assignedTickets: number };
}

export interface TicketListItem {
  id: string; number: number; title: string; status: TicketStatus; priority: Priority;
  category: Category | null; sentiment: Sentiment | null; mlConfidence: number | null;
  triageStatus: "PENDING" | "COMPLETED" | "FAILED"; reviewStatus: ReviewStatus; source: "WEB" | "CHATBOT";
  dueAt: string | null; resolvedAt: string | null; createdAt: string; updatedAt: string; incidentId: string | null;
  createdBy: Ref; assignedTeam: Ref | null; assignedAgent: Ref | null; _count: { comments: number }; sla?: SlaState;
}

export interface LabelPrediction<T extends string> { label: T; confidence: number; scores: Record<T, number> }

export interface AiAnalysis {
  ml?: {
    category: LabelPrediction<Category>; priority: LabelPrediction<Priority>;
    sentiment: { label: Sentiment; score: number; compound: number }; modelVersion: string;
  };
  priority?: { base: Priority; final: Priority; trace: { rule: string; from: Priority; to: Priority; reason: string }[] };
  review?: { required: boolean; threshold: number };
  routing?: { team: Ref | null; agent: Ref | null; reason: string };
  similar?: { id: string; number: number; title: string; similarity: number }[];
  recentSimilarCount?: number;
  userCategoryHint?: Category;
  analyzedAt?: string;
}

export interface Comment { id: string; body: string; isInternal: boolean; createdAt: string; author: Ref & { role: Role } }
export interface Activity { id: string; type: string; data: Record<string, unknown> | null; createdAt: string; actor: Ref | null }
export interface Feedback {
  id: string; accepted: boolean; note: string | null; createdAt: string; reviewer: Ref;
  predictedCategory: Category | null; correctedCategory: Category | null; predictedPriority: Priority | null; correctedPriority: Priority | null;
}
export interface SimilarTicket { id: string; number: number; title: string; status: TicketStatus; category: Category | null; priority: Priority; similarity: number }

export interface TicketDetail extends Omit<TicketListItem, "_count" | "createdBy" | "assignedTeam"> {
  description: string; resolution: string | null; aiAnalysis: AiAnalysis | null; sentimentScore: number | null;
  createdBy: Ref & { email: string }; assignedTeam: (Ref & { category: Category | null }) | null;
  incident: { id: string; number: number; title: string; status: IncidentStatus; severity: Priority } | null;
  conversation: { id: string; title: string } | null;
  comments: Comment[]; activities: Activity[]; feedback: Feedback[]; similar: SimilarTicket[]; sla: SlaState;
}

export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number }

export interface Source { ref: number; documentId: string; documentTitle: string; chunkIndex: number; snippet: string; similarity: number; matchedBy?: "semantic" | "keyword" | "hybrid" }
export type FeedbackVote = "HELPFUL" | "NOT_HELPFUL";
export type FeedbackReason = "INCORRECT" | "NOT_RELEVANT" | "MISSING_INFORMATION" | "OTHER";
export interface Message {
  id: string; role: "USER" | "ASSISTANT"; content: string; sources: Source[] | null; answerable: boolean | null; createdAt: string;
  feedbackVote: FeedbackVote | null; feedbackReason: FeedbackReason | null; feedbackAt?: string | null; feedbackById?: string | null;
}
export interface ReplySuggestion { text: string; generator: string; groundedIn: string[] }
export interface ConversationSummary { id: string; title: string; updatedAt: string; ticket: { id: string; number: number } | null; _count: { messages: number } }
export interface Conversation { id: string; title: string; messages: Message[]; ticket: { id: string; number: number; status: TicketStatus } | null }

export interface KbDocument {
  id: string; title: string; fileName: string; mimeType: string; sizeBytes: number;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED"; error: string | null; chunkCount: number; createdAt: string; uploadedBy: Ref;
}

export interface Incident {
  id: string; number: number; title: string; summary: string; category: Category; severity: Priority; status: IncidentStatus;
  signals: { clusterSize?: number; avgSimilarity?: number; spikeRatio?: number; isSpike?: boolean; windowMinutes?: number } | null;
  detectedAt: string; resolvedAt: string | null; _count?: { tickets: number };
}
export interface IncidentDetail extends Incident {
  tickets: { id: string; number: number; title: string; status: TicketStatus; priority: Priority; createdAt: string; createdBy: { name: string }; assignedAgent: { name: string } | null }[];
}

export interface Team { id: string; name: string; description: string | null; category: Category | null; _count: { members: number; tickets: number }; members: (Ref & { role: Role })[] }

export interface Settings {
  confidenceThreshold: number; similarTicketThreshold: number; ragMinSimilarity: number; ragMinKeywordCoverage: number; ragTopK: number;
  incidentWindowMinutes: number; incidentMinClusterSize: number; incidentSimilarityThreshold: number; incidentSpikeRatio: number;
}

export interface Overview {
  range: { days: number; from: string; to: string };
  kpis: {
    total: number; open: number; resolved: number; highPriority: number; avgResolutionHours: number | null;
    resolutionRate: number; automationRate: number; modelAgreement: number; feedbackCount: number;
    reviewQueue: number; activeIncidents: number; slaBreached: number; slaBreachRate: number;
    helpfulRate: number; answerFeedbackCount: number;
  };
  aiFeedback: { helpful: number; notHelpful: number; total: number; reasons: { key: FeedbackReason | null; count: number }[] };
  aiConfidence: { bucket: string; count: number }[];
  ticketsOverTime: { day: string; created: number; resolved: number }[];
  byCategory: { key: Category; count: number }[];
  byPriority: { key: Priority; count: number }[];
  bySentiment: { key: Sentiment; count: number }[];
  teamWorkload: { id: string; name: string; open: number }[];
  generatedAt: string;
}

export type Dashboard =
  | { role: "USER"; counts: { open: number; resolved: number; highPriority: number; waitingForYou: number }; recent: TicketListItem[] }
  | { role: "AGENT" | "ADMIN"; counts: { assigned: number; unassigned: number; highPriority: number; reviewQueue: number; breached: number; dueSoon: number; activeIncidents: number }; queue: TicketListItem[] };
