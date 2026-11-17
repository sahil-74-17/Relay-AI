# Relay AI — 12-Part Upgrade Report

**Project:** `C:\Users\ASUS\Downloads\support-intel\support-intel`
**Report date:** 2026-11-15
**Scope:** conversational answers, RAG follow-ups, answer feedback, citations, agent suggested replies, dark mode, Google Sign-In, analytics, security/consistency fixes, UI polish, test pass.

---

## 1. Summary

All twelve requested areas are implemented in the existing architecture (Next.js 15 / React 19 / Tailwind 3 frontend, Express + Prisma 7 + pgvector backend, FastAPI ML service). No framework or dependency changes were made, no files were deleted, and the demo flows still work as before.

| # | Area | What was delivered |
|---|------|--------------------|
| 1 | Conversational answers | Greetings, thanks, acknowledgements and farewells are answered directly and never touch retrieval, triage or the ticket pipeline. Mixed messages ("hi, my payment failed") are treated as support. Escalation stays available on the last genuine support reply even if the user then says "ok"/"thanks". |
| 2 | RAG follow-ups | A narrow `isContextDependentFollowUp` heuristic reuses the previous question only for genuine follow-ups ("how long does that take?", "and for invoices?"). A new unrelated question is embedded and retrieved on its own. When nothing is found the assistant says so and offers **Create support ticket**; it never fabricates. |
| 3 | Answer feedback | 👍 / 👎 on grounded AI answers with reasons (Incorrect answer / Not relevant / Missing information / Other). Stored on the message (`Message.feedbackVote/Reason/At/ById`) with the voting user and conversation linkage. Helpful votes need no reason; negative votes require one. No controls on small talk or "no answer" messages. |
| 4 | Citations | Sources render as cards with document title, a readable excerpt (600 chars) and an optional link. Answer text and sources are visually separated. Only retrieved documents are shown, and filesystem paths are stripped. |
| 5 | Suggested reply | Agent ticket detail gets **AI suggested reply** with Generate / Regenerate / Use reply / Edit. It is grounded in the ticket plus retrieved KB chunks, has a deterministic template fallback when no LLM is configured, and never sends anything automatically. |
| 6 | Dark mode | Light / dark / system switch in the sidebar, mobile header and login page. Persisted in `localStorage`, follows the OS while set to System, applied before first paint (no flash), consistent across pages, charts and toasts. No new dependency. |
| 7 | Google Sign-In | Authorization Code flow with `state` CSRF cookie, server-side client secret, new accounts created as `USER`, existing accounts matched by verified email with role/team preserved, deactivated accounts rejected. The button only appears when the backend reports Google as configured. Email/password still works. |
| 8 | Analytics | Date range (7/30/90 days), ticket volume, resolution rate, average resolution time, category and priority breakdowns, SLA breaches, AI confidence distribution, AI feedback score / helpful-vs-not, and click-through drill-downs. Everything comes from real database rows. |
| 9 | Fixes | Open redirect, token exposure in login/register JSON, spoofable proxy trust, repeated/invalid reviews, reanalysis overwriting human corrections, real reanalysis errors, incident transition consistency, stale seed timestamps, `robots.txt`. |
| 10 | UI/UX polish | Loading / empty / error states, accessible icon buttons with labels and tooltips, keyboard focus, Escape-to-close and focus management in dialogs, responsive layouts, consistent date formatting, existing visual style preserved. |
| 11 | Tests | Backend typecheck and 62 tests passed before the infrastructure restart; the two new unit suites (15 tests) were re-run successfully afterwards. ML suite 10 passed. Frontend typecheck and production build passed. Backend lint and frontend tests are not configured in this repository. |
| 12 | Report | This document, including the complete contents of every new and modified file. |

### Security fixes in detail

- **Open redirect:** post-login `next` values go through `safeNextPath`, which rejects `//host`, backslashes, schemes and control characters.
- **Token exposure:** `/auth/login` and `/auth/register` now return only `{ user }`; the JWT lives in the `httpOnly` cookie. `Authorization: Bearer` is still accepted for API clients.
- **Proxy trust:** `trust proxy` is `false` unless `TRUST_PROXY=true`, so `X-Forwarded-For` cannot spoof rate-limit identities by default.
- **Repeated/invalid reviews:** a ticket already `ACCEPTED` or `CORRECTED` cannot be reviewed again, and `accepted` must match the submitted action.
- **Reanalysis:** blocked for `CLOSED` tickets and for tickets a human has already reviewed, so corrections are not overwritten.
- **Reanalysis errors:** the UI now surfaces the real server error instead of silently succeeding, and hides the action once reviewed.
- **Incident transitions:** one `INCIDENT_TRANSITIONS` table is enforced server-side (`OPEN → INVESTIGATING → RESOLVED → CLOSED`, plus reopen paths).
- **Seed timestamps:** seeded tickets/messages use relative offsets from "now", so demo data never looks years old.
- **`robots.txt`:** generated at `/robots.txt`, disallowing every authenticated area and `/api/`.

---

## 2. Files

### New files (12)

| File |
|------|
| `backend/prisma/migrations/20261111000000_ai_answer_feedback/migration.sql` |
| `backend/src/domain/rag-followup.ts` |
| `backend/src/domain/reply-draft.ts` |
| `backend/src/services/reply-suggestion.service.ts` |
| `backend/src/integrations/google-auth.ts` |
| `backend/src/utils/safe-redirect.ts` |
| `backend/tests/conversational-rag.test.ts` |
| `backend/tests/google-auth.test.ts` |
| `frontend/src/hooks/use-theme.ts` |
| `frontend/src/components/app/theme-toggle.tsx` |
| `frontend/src/components/app/suggested-reply.tsx` |
| `frontend/src/app/robots.ts` |

### Modified files (40)

**Backend (25)**

| File | Change |
|------|--------|
| `backend/.env.example` | Google, `FRONTEND_URL`, `TRUST_PROXY` variables documented. |
| `backend/prisma/schema.prisma` | Feedback enums and nullable `Message` feedback columns. |
| `backend/prisma/seed.ts` | Relative timestamps and demo answer-feedback votes. |
| `backend/src/app.ts` | `trust proxy` only when configured. |
| `backend/src/config/constants.ts` | `INCIDENT_TRANSITIONS`, feedback/analytics constants. |
| `backend/src/config/env.ts` | Google OAuth, `FRONTEND_URL`, `TRUST_PROXY`. |
| `backend/src/container.ts` | Registers `ReplySuggestionService`. |
| `backend/src/controllers/admin.controller.ts` | Analytics range query, incident update wiring. |
| `backend/src/controllers/auth.controller.ts` | Cookie-only sessions, provider probe, Google start/callback, safe `next`. |
| `backend/src/controllers/chat.controller.ts` | Feedback endpoint. |
| `backend/src/controllers/ticket.controller.ts` | Suggested-reply endpoint. |
| `backend/src/lib/cache.ts` | `ANALYTICS_RANGE_KEYS` helper. |
| `backend/src/repositories/conversation.repository.ts` | Feedback update/read and message ownership checks. |
| `backend/src/routes/index.ts` | New feedback, suggested-reply, provider and Google routes. |
| `backend/src/services/analytics.service.ts` | Ranged metrics, AI feedback and confidence series. |
| `backend/src/services/auth.service.ts` | `googleLogin` account handling. |
| `backend/src/services/chat.service.ts` | Small talk before retrieval, escalation filtering, message feedback. |
| `backend/src/services/incident.service.ts` | Transition validation. |
| `backend/src/services/rag.service.ts` | Follow-up context fallback and 600-char citation excerpts. |
| `backend/src/services/review.service.ts` | Duplicate/invalid review guards and analytics invalidation. |
| `backend/src/services/ticket.service.ts` | Reanalysis guards, analytics invalidation. |
| `backend/src/services/triage.service.ts` | Analytics invalidation. |
| `backend/src/validators/admin.validators.ts` | `days` analytics query. |
| `backend/src/validators/chat.validators.ts` | Feedback schema and message params. |
| `backend/tests/api.integration.test.ts` | Feedback, suggested-reply and incident-transition coverage. |

**Frontend (15)**

| File | Change |
|------|--------|
| `frontend/tailwind.config.ts` | `darkMode: "class"` and theme colour tokens. |
| `frontend/src/app/globals.css` | RGB CSS variables, `.dark` overrides, chart/token colours. |
| `frontend/src/app/layout.tsx` | No-flash theme bootstrap script and metadata. |
| `frontend/src/app/page.tsx` | Theme-aware marketing page. |
| `frontend/src/app/not-found.tsx` | Theme-aware 404. |
| `frontend/src/app/login/page.tsx` | Google button, theme toggle, error feedback. |
| `frontend/src/app/(app)/assistant/page.tsx` | Feedback, citations and persisted escalation CTA. |
| `frontend/src/app/(app)/dashboard/page.tsx` | Date range, new KPIs, charts and drill-downs. |
| `frontend/src/app/(app)/tickets/[id]/page.tsx` | Suggested reply, reanalysis errors, composer integration. |
| `frontend/src/components/app/app-shell.tsx` | Theme toggle, stale-cookie handling, drawer a11y. |
| `frontend/src/components/app/chat-message.tsx` | Feedback controls and citation cards. |
| `frontend/src/components/app/charts.tsx` | Theme-aware chart colours and new chart types. |
| `frontend/src/components/ui/button.tsx` | Token-based variants and focus styles. |
| `frontend/src/components/ui/modal.tsx` | Escape, focus trap/restore, ARIA. |
| `frontend/src/lib/types.ts` | Feedback, suggested reply, analytics and provider types. |

> Note: `backend/src/domain/conversational-intent.ts` already existed and was reused unchanged; it is therefore not in either list.

### Deleted files

None.

---

## 3. Database migration

**Migration required: yes.**

`backend/prisma/migrations/20261111000000_ai_answer_feedback/migration.sql` adds:

- enums `MessageFeedbackVote` (`HELPFUL`, `NOT_HELPFUL`) and `MessageFeedbackReason` (`INCORRECT`, `NOT_RELEVANT`, `MISSING_INFORMATION`, `OTHER`);
- nullable `Message` columns `feedbackVote`, `feedbackReason`, `feedbackAt`, `feedbackById`;
- an index on `feedbackVote` and a `feedbackById → User.id` foreign key (`ON DELETE SET NULL`).

No existing column is dropped or rewritten, so existing rows stay valid. The migration was applied locally (`prisma migrate status` reported the database up to date) and the seed ran cleanly afterwards (43 tickets, 3 awaiting review, 2 incidents, 2 answer-feedback votes).

---

## 4. Environment variables

Only names are listed; no secrets are included.

**New / newly used**

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (optional; defaults to `http://localhost:${PORT}/api/v1/auth/google/callback`)
- `FRONTEND_URL` (defaults to `http://localhost:3000`)
- `TRUST_PROXY` (defaults to off/false)

**Existing variables unchanged**

- `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_SECURE`, `CORS_ORIGIN`
- `ML_SERVICE_URL`, `ML_TIMEOUT_MS`
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`, `LLM_TIMEOUT_MS`
- `UPLOAD_DIR`, `MAX_UPLOAD_MB`, `RUN_WORKERS`, `LOG_LEVEL`
- No frontend environment variables are required; the browser calls same-origin `/api/v1`.

---

## 5. How to run locally (exact commands)

Infrastructure (Postgres 16 + pgvector on 5433, Redis on 6379):

```powershell
cd C:\Users\ASUS\Downloads\support-intel\support-intel
docker compose up -d
```

Backend (port 4000):

```powershell
cd C:\Users\ASUS\Downloads\support-intel\support-intel\backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

ML service (port 8000):

```powershell
cd C:\Users\ASUS\Downloads\support-intel\support-intel\ml-service
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend (port 3000):

```powershell
cd C:\Users\ASUS\Downloads\support-intel\support-intel\frontend
npm install
npm run dev
```

Verification commands:

```powershell
cd C:\Users\ASUS\Downloads\support-intel\support-intel\backend
npm run typecheck
npm test

cd C:\Users\ASUS\Downloads\support-intel\support-intel\frontend
npm run typecheck
npm run build

cd C:\Users\ASUS\Downloads\support-intel\support-intel\ml-service
.\.venv\Scripts\python.exe -m pytest -q
```

Demo accounts: `user@demo.com`, `agent@demo.com`, `admin@demo.com`, password `Demo@1234`.

To enable Google Sign-In locally, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`, register `http://localhost:4000/api/v1/auth/google/callback` as an authorized redirect URI in Google Cloud Console, and restart the backend. Without credentials the button is hidden and email/password still works.

---

## 6. Manual browser checklist

1. **Login** — open `http://localhost:3000/login`. Email/password sign-in works; the Google button appears only when configured; no JWT is visible in the response body or local storage.
2. **Theme** — switch Light / Dark / System from login, sidebar and mobile header. Reload: choice persists. Set System and change the OS appearance: the UI follows. No white flash on load.
3. **Assistant small talk** — send "hi", "thanks", "ok", "bye". Each gets a direct conversational answer with no citations, no ticket CTA and no thumbs controls.
4. **Mixed message** — send "hi, my payment failed". It is treated as support and answered from the KB.
5. **Grounded answer** — ask about refunds or password reset. Answer shows inline citations, source cards with document titles and excerpts, and a clear separation between answer and sources.
6. **Follow-up** — ask "how long does that take?" after a refund answer: same context, correct sources. Ask an unrelated question (e.g. "Do you support SAML?"): retrieved independently, and if unsupported you get the honest fallback plus **Create support ticket**.
7. **Feedback** — click 👍, reload: it stays. Click 👎: a reason is required; choose one and submit; reload: the reason persists. Small-talk messages have no controls.
8. **Escalation** — on an unanswered question, click **Create support ticket**, then send "ok" or "thanks". The escalation control stays available on the last support reply.
9. **Agent suggested reply** — sign in as `agent@demo.com`, open a ticket, click **Generate**. Edit it, click **Use reply**, confirm text lands in the composer, then regenerate. Nothing is sent until **Send** is clicked.
10. **Reanalysis** — on an unreviewed ticket the reanalyze action works; on a reviewed or closed ticket it is hidden or returns a clear error message.
11. **Review queue** — review a ticket, then try to review it again: the second attempt is rejected. Invalid `accepted`/action combinations are rejected.
12. **Incidents** — change status through the allowed sequence; illegal jumps return an error; the UI reflects the server state.
13. **Analytics** — as `admin@demo.com`, switch 7 / 30 / 90 days. Volume, resolution rate, average resolution, category/priority, SLA breaches, AI confidence and AI feedback update. Click chart segments/drill-downs to open filtered ticket lists.
14. **Responsive & a11y** — narrow the window: sidebar becomes a drawer; buttons show tooltips and accessible names; Tab order is sensible; dialogs close on Escape and return focus.
15. **`robots.txt`** — open `http://localhost:3000/robots.txt`; authenticated areas and `/api/` are disallowed.
16. **Regression** — create a ticket, comment as agent, update status/priority/assignee, upload/reprocess a KB document, manage users/teams/settings.

---

## 7. Test and verification results

| Check | Result | Notes |
|-------|--------|-------|
| Backend `npm run typecheck` | **Pass** | Re-run on 2026-11-15 after the final edits. |
| Backend unit tests (`conversational-rag`, `google-auth`) | **15 passed / 2 files** | Re-run on 2026-11-15. |
| Backend full suite `npm test` | **62 passed / 5 files** | Captured before the environment restart. Requires Postgres + Redis; not re-run because Docker/Postgres/Redis are currently unavailable in this environment. |
| ML `pytest -q` | **10 passed** | Re-run on 2026-11-15. |
| Frontend `npm run typecheck` | **Pass** | Re-run on 2026-11-15. |
| Frontend `npm run build` | **Pass** | Re-run on 2026-11-15: 16 routes, `/robots.txt` generated. |
| Backend lint | **Not configured** | No lint script in `backend/package.json`. |
| Frontend lint / tests | **Not configured** | No lint or test script in `frontend/package.json`. |

Browser verification performed earlier in the session covered login, theme switching/persistence, assistant small talk and grounded answers, feedback persistence, escalation persistence, suggested reply without auto-send, analytics ranges, `robots.txt` and modal ARIA wiring. Escape-key behavior and pixel-level screenshots could not be exercised because the browser environment had no visible desktop window; the implementation was verified by inspection and the production build.

---

## 8. Remaining limitations

- **Full backend suite not re-runnable here.** The suite needs Postgres 5433 and Redis 6379; Docker Desktop is not installed at the expected path and the daemon is unavailable after the environment restart. The 62-pass result is from the run immediately before the restart.
- **Google Sign-In was not exercised against a real Google account.** The flow is implemented and unit-tested at the account-mapping level; end-to-end verification needs real client credentials. Locally the button is hidden because `backend/.env` has no Google credentials.
- **No frontend test runner or linter** exists in the repository, so none was added (the brief asked to avoid unrelated changes).
- **AI feedback score** is derived from stored message feedback votes, so it only covers answers users actually rated; small talk and unanswered messages are excluded by design.
- **Follow-up detection is heuristic.** Very terse topic changes that happen to share a content word with the previous answer may reuse context; unrelated questions are still retrieved on their own.
- **LLM-dependent quality.** Suggested replies and grounded answers use the configured LLM when present; without one they fall back to deterministic templates/extractive text, which is intentionally conservative.
- **Escape/focus behavior** is implemented and wired but was not visually confirmed in a desktop browser during this session.

---

## 9. Complete file contents

Every new and modified file is reproduced below in full, without snippets. Generated artifacts (`backend/src/generated/prisma/*`, `frontend/tsconfig.tsbuildinfo`, `.next`, `node_modules`, `.pytest_cache`) are excluded because they are build output, not source.

## New files

### `backend/prisma/migrations/20261111000000_ai_answer_feedback/migration.sql`

````sql
-- Reader feedback on grounded AI answers (small talk and "no answer" messages are never rated).

CREATE TYPE "MessageFeedbackVote" AS ENUM ('HELPFUL', 'NOT_HELPFUL');
CREATE TYPE "MessageFeedbackReason" AS ENUM ('INCORRECT', 'NOT_RELEVANT', 'MISSING_INFORMATION', 'OTHER');

ALTER TABLE "Message"
  ADD COLUMN "feedbackVote" "MessageFeedbackVote",
  ADD COLUMN "feedbackReason" "MessageFeedbackReason",
  ADD COLUMN "feedbackAt" TIMESTAMP(3),
  ADD COLUMN "feedbackById" TEXT;

CREATE INDEX "Message_feedbackVote_idx" ON "Message"("feedbackVote");

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_feedbackById_fkey"
  FOREIGN KEY ("feedbackById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
````

### `backend/src/domain/rag-followup.ts`

````ts
import type { ChatTurn } from "./rag-prompt";

/**
 * Decides whether a question only makes sense with the previous exchange
 * ("and on mobile?", "how long does that take?"). Retrieval must not reuse an
 * earlier question for a topic change ("I was charged twice" → "Can I get an
 * on-premise server for my bank?"), so the fallback is deliberately narrow.
 */
const ANAPHORA = /\b(it|its|it's|that|this|these|those|they|them|their|same|above|former|latter)\b/;
const CONNECTORS = /^(and|also|what about|how about|then|so|but|plus|ok(ay)? (and|so)|what if)\b/;

const STOP = new Set(
  "a an the is are was were to of in on for and or how do does did i my me we our you your can could would should what why when where who which with it this that these those be been being get got".split(
    " ",
  ),
);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Short messages with a reference to the previous turn, or a direct topical link to it. */
export function isContextDependentFollowUp(question: string, history: ChatTurn[]): boolean {
  const q = words(question);
  if (!q.length || q.length > 12) return false;

  const previous = [...history].reverse().find((t) => t.role === "user");
  if (!previous) return false;

  const raw = question.trim().toLowerCase();
  if (ANAPHORA.test(raw) || CONNECTORS.test(raw)) return true;

  // A short question that shares a content word with the previous exchange is a
  // follow-up; an unrelated question shares none and is retrieved independently.
  const lastAnswer = [...history].reverse().find((t) => t.role === "assistant")?.content ?? "";
  const topic = new Set(words(`${previous.content} ${lastAnswer}`));
  const content = q.filter((w) => !STOP.has(w) && w.length > 2);
  // Pure elliptical questions ("why?", "go on") have no topic of their own.
  if (!content.length) return q.length <= 5;
  return q.length <= 9 && content.some((w) => topic.has(w));
}
````

### `backend/src/domain/reply-draft.ts`

````ts
import { extractiveAnswer } from "./extractive-answer";
import type { RetrievedChunk } from "./rag-prompt";

export interface ReplyTicket {
  title: string;
  description: string;
  requesterName: string;
  category: string | null;
}

export interface ReplySuggestion {
  text: string;
  generator: string;
  /** Document titles the draft was grounded in; empty when the KB had nothing relevant. */
  groundedIn: string[];
}

export const REPLY_SYSTEM_PROMPT = `You draft a first reply for a human support agent to review and send.
Rules:
- Greet the customer by first name and acknowledge their specific problem.
- Use ONLY the numbered knowledge-base excerpts for policies, prices, steps or technical facts.
- Never invent policies, timelines, refunds, links or technical details.
- If the excerpts do not cover the question, say the team is investigating and will follow up; do not guess.
- 2-4 short paragraphs, plain text, no markdown headings, no citation markers, sign off as "The support team".
- Output only the reply text.`;

const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);

/** The knowledge-base text used for the draft, numbered like the RAG prompt. */
export function buildReplyPrompt(ticket: ReplyTicket, chunks: RetrievedChunk[], maxChars = 5000): string {
  let budget = maxChars;
  const excerpts: string[] = [];
  chunks.forEach((c, i) => {
    if (budget <= 0) return;
    const body = c.content.slice(0, budget);
    budget -= body.length;
    excerpts.push(`[${i + 1}] (${c.documentTitle})\n${body}`);
  });
  const firstName = ticket.requesterName.split(" ")[0] || "there";
  return [
    `Customer first name: ${firstName}`,
    `Ticket: ${clip(ticket.title, 200)}`,
    `Description: ${clip(ticket.description, 1200)}`,
    ticket.category ? `AI category: ${ticket.category}` : "",
    excerpts.length ? `Knowledge-base excerpts:\n${excerpts.join("\n\n")}` : "Knowledge-base excerpts: none retrieved.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Honest, KB-grounded draft used when no LLM is configured (or the LLM fails). */
export function heuristicReply(ticket: ReplyTicket, chunks: RetrievedChunk[]): string {
  const firstName = ticket.requesterName.split(" ")[0] || "there";
  const introduced = !!chunks.length;
  const quoted = introduced
    ? extractiveAnswer(`${ticket.title}\n${ticket.description}`, chunks, 2)
        .replace(/\[\d+\]/g, "")
        .replace(/\n{2,}/g, "\n\n")
        .trim()
    : "";

  const acknowledgement = `Thanks for reaching out about "${clip(ticket.title, 120)}".`;
  const nextStep = quoted
    ? "Based on our help documentation, this may be relevant:"
    : "I've passed the details to the right team, who are looking into this now. We'll follow up with the next steps as soon as we can.";
  const closing = "If you have any additional details in the meantime, just reply here.";
  return [firstName ? `Hi ${firstName},` : "Hi,", "", acknowledgement, quoted ? `${nextStep}\n\n${quoted}` : nextStep, "", closing, "", "The support team"].join("\n");
}

export function groundedTitles(chunks: RetrievedChunk[]): string[] {
  return [...new Set(chunks.map((c) => c.documentTitle))];
}
````

### `backend/src/services/reply-suggestion.service.ts`

````ts
import { logger } from "../config/logger";
import { buildReplyPrompt, groundedTitles, heuristicReply, REPLY_SYSTEM_PROMPT, type ReplySuggestion } from "../domain/reply-draft";
import type { LlmProvider } from "../integrations/llm/llm-provider";
import type { AuthUser } from "../types/auth";
import type { RagService } from "./rag.service";
import type { TicketService } from "./ticket.service";

/**
 * Drafts a first agent reply from the ticket + retrieved knowledge-base sections.
 * Never sends anything: the agent edits and sends from the normal composer.
 */
export class ReplySuggestionService {
  constructor(
    private readonly rag: RagService,
    private readonly tickets: TicketService,
    private readonly llm: LlmProvider | null,
  ) {}

  async suggest(user: AuthUser, ticketId: string): Promise<ReplySuggestion> {
    const ticket = await this.tickets.get(user, ticketId);
    const input = {
      title: ticket.title,
      description: ticket.description,
      requesterName: ticket.createdBy.name,
      category: ticket.category ?? null,
    };
    // Retrieval failures must not break the agent's workflow: fall back to a draft without KB claims.
    const chunks = await this.rag.retrieve(`${ticket.title}\n${ticket.description}`).catch((err) => {
      logger.warn({ err, ticketId }, "Suggested reply retrieval failed");
      return [];
    });

    if (this.llm) {
      try {
        const text = await this.llm.complete({
          system: REPLY_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildReplyPrompt(input, chunks) }],
          maxTokens: 500,
          temperature: 0.3,
        });
        if (text && text.trim().length >= 20) {
          return { text: text.trim(), generator: this.llm.name, groundedIn: groundedTitles(chunks) };
        }
      } catch (err) {
        logger.error({ err }, "Suggested reply LLM failed; using fallback");
      }
    }
    return { text: heuristicReply(input, chunks), generator: "template", groundedIn: groundedTitles(chunks) };
  }
}
````

### `backend/src/integrations/google-auth.ts`

````ts
import type { Env } from "../config/env";
import { UnauthorizedError } from "../utils/errors";

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

type GoogleConfig = Pick<Env, "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "GOOGLE_REDIRECT_URI" | "FRONTEND_URL" | "PORT">;

export const googleConfigured = (cfg: Partial<GoogleConfig>): boolean =>
  !!cfg.GOOGLE_CLIENT_ID && !!cfg.GOOGLE_CLIENT_SECRET;

export const googleRedirectUri = (cfg: GoogleConfig): string =>
  cfg.GOOGLE_REDIRECT_URI ?? `http://localhost:${cfg.PORT}/api/v1/auth/google/callback`;

/** Authorization-code URL. The `state` parameter is verified on callback (CSRF). */
export function googleAuthUrl(cfg: GoogleConfig, state: string): string {
  if (!googleConfigured(cfg)) throw new Error("Google OAuth is not configured");
  const params = new URLSearchParams({
    client_id: cfg.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(cfg),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Exchanges the authorization code for an ID token, then reads the verified profile. */
export async function exchangeGoogleCode(cfg: GoogleConfig, code: string): Promise<GoogleProfile> {
  if (!googleConfigured(cfg)) throw new UnauthorizedError("Google sign-in is not configured");
  const body = new URLSearchParams({
    code,
    client_id: cfg.GOOGLE_CLIENT_ID!,
    client_secret: cfg.GOOGLE_CLIENT_SECRET!,
    redirect_uri: googleRedirectUri(cfg),
    grant_type: "authorization_code",
  });

  let idToken: string;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`token endpoint returned ${res.status}`);
    const json = (await res.json()) as { id_token?: string };
    if (!json.id_token) throw new Error("token response had no id_token");
    idToken = json.id_token;
  } catch {
    throw new UnauthorizedError("Google sign-in failed. Please try again.");
  }

  const claims = decodeIdToken(idToken);
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  // The token came straight from Google over TLS; still verify it was minted for this app.
  if (!issuerOk || claims.aud !== cfg.GOOGLE_CLIENT_ID) throw new UnauthorizedError("Google sign-in failed. Please try again.");
  if (!claims.sub || !claims.email) throw new UnauthorizedError("Google did not return an email address");
  return {
    sub: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified === true,
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : claims.email.split("@")[0],
  };
}

/** Reads the claims from Google's signed ID token. The token arrives over TLS directly from Google. */
export function decodeIdToken(idToken: string): { sub?: string; email?: string; email_verified?: boolean; name?: string; aud?: string; iss?: string } {
  const part = idToken.split(".")[1];
  if (!part) return {};
  try {
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  } catch {
    return {};
  }
}
````

### `backend/src/utils/safe-redirect.ts`

````ts
/**
 * Only same-origin, absolute paths are safe post-login destinations.
 * Rejects `//evil.com`, `/\evil.com`, schemes and control characters (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
````

### `backend/tests/conversational-rag.test.ts`

````ts
import { describe, expect, it } from "vitest";
import { detectConversationalIntent } from "../src/domain/conversational-intent";
import { isContextDependentFollowUp } from "../src/domain/rag-followup";
import type { ChatTurn, RetrievedChunk } from "../src/domain/rag-prompt";
import type { HybridCandidate } from "../src/domain/hybrid-retrieval";
import { NO_ANSWER_MESSAGE, RagService } from "../src/services/rag.service";
import type { AnswerGenerator } from "../src/services/answer-generation";
import type { DocumentRepository } from "../src/repositories/document.repository";
import type { MlClient } from "../src/integrations/ml-client";
import type { SettingsService } from "../src/services/settings.service";

/** Detects small talk so it never reaches retrieval or the ticket pipeline. */
describe("conversational intent", () => {
  it("recognises greetings, thanks, acknowledgements and farewells", () => {
    for (const text of ["hi", "hii", "hello!", "hey", "heyyy", "good morning", "Good Morning!"]) {
      expect(detectConversationalIntent(text)).toBe("greeting");
    }
    expect(detectConversationalIntent("thanks")).toBe("thanks");
    expect(detectConversationalIntent("thank you so much")).toBe("thanks");
    expect(detectConversationalIntent("ok")).toBe("acknowledgement");
    expect(detectConversationalIntent("okay, got it")).toBe("acknowledgement");
    expect(detectConversationalIntent("sure")).toBe("acknowledgement");
    expect(detectConversationalIntent("bye")).toBe("farewell");
    expect(detectConversationalIntent("goodbye!")).toBe("farewell");
    expect(detectConversationalIntent("how are you?")).toBe("pleasantry");
  });

  it("treats mixed messages as real support questions", () => {
    expect(detectConversationalIntent("hi, my payment failed")).toBeNull();
    expect(detectConversationalIntent("thanks, but my password still doesn't work")).toBeNull();
    expect(detectConversationalIntent("ok but I still can't login")).toBeNull();
  });
});

/** The previous question may only be reused for genuinely related follow-ups. */
describe("follow-up detection", () => {
  const history: ChatTurn[] = [
    { role: "user", content: "How do refunds work?" },
    { role: "assistant", content: "Refunds take 5 to 7 business days [1]." },
  ];

  it("accepts anaphoric and elliptical follow-ups", () => {
    expect(isContextDependentFollowUp("How long does that take?", history)).toBe(true);
    expect(isContextDependentFollowUp("and for invoices?", history)).toBe(true);
    expect(isContextDependentFollowUp("why?", history)).toBe(true);
  });

  it("rejects a new, unrelated question", () => {
    expect(isContextDependentFollowUp("Can I get an on-premise server for my bank?", history)).toBe(false);
    expect(isContextDependentFollowUp("Do you support SAML single sign-on?", history)).toBe(false);
    // Short does not mean related: a new topic is still retrieved on its own.
    expect(isContextDependentFollowUp("Do you support SAML?", history)).toBe(false);
  });

  it("returns false when there is no history", () => {
    expect(isContextDependentFollowUp("How long does that take?", [])).toBe(false);
  });
});

const chunk = (id: string, documentTitle: string, content: string): HybridCandidate => ({
  chunkId: id,
  documentId: `doc-${id}`,
  documentTitle,
  index: 0,
  content,
  similarity: 0.9,
  keywordRank: 1,
  matchedTerms: 2,
  queryTerms: 2,
});

/**
 * Fake retrieval: only refund and password questions find knowledge-base chunks.
 * Every query is recorded so tests can prove which question was embedded.
 */
class RagHarness {
  queries: string[] = [];
  private ml: MlClient = {
    analyze: async () => {
      throw new Error("not used");
    },
    embed: async (texts: string[]) => texts.map(() => new Array(384).fill(0)),
    health: async () => true,
  };
  private documents = {
    hybridCandidates: async (_vector: string, query: string) => {
      this.queries.push(query);
      if (/refund/i.test(query)) return [chunk("refund", "Billing & payments", "Billing & payments > Refunds\nRefunds take 5 to 7 business days.")];
      if (/password/i.test(query)) return [chunk("password", "Account & access", "Account & access > Password reset\nUse the Forgot password link on the sign-in page.")];
      return [];
    },
  } as unknown as DocumentRepository;
  private generator: AnswerGenerator = {
    name: "test",
    answer: async (question, chunks) => {
      const text = chunks.length ? `Here is the answer [1].` : "";
      return { text, answerable: !!text, generator: "test" };
    },
  };
  private settings = { get: async () => ({ ragTopK: 4, ragMinSimilarity: 0.3, ragMinKeywordCoverage: 0.5 }) } as unknown as SettingsService;
  readonly service = new RagService(this.ml, this.documents, this.generator, this.settings);
}

describe("RAG follow-up handling", () => {
  it("answers a related follow-up using the previous question's context", async () => {
    const h = new RagHarness();
    const history: ChatTurn[] = [
      { role: "user", content: "How do refunds work?" },
      { role: "assistant", content: "Refunds take 5 to 7 business days [1]." },
    ];
    const answer = await h.service.answer("How long does that take?", history);
    expect(answer.answerable).toBe(true);
    expect(answer.sources[0].documentTitle).toBe("Billing & payments");
    expect(h.queries).toHaveLength(2);
    expect(h.queries[1]).toContain("How do refunds work?");
  });

  it("retrieves an unrelated new question independently and never reuses the old context", async () => {
    const h = new RagHarness();
    const history: ChatTurn[] = [
      { role: "user", content: "I was charged twice." },
      { role: "assistant", content: "Refunds take 5 to 7 business days [1]." },
    ];
    const answer = await h.service.answer("Can I get an on-premise server for my bank?", history);
    expect(answer.answerable).toBe(false);
    expect(answer.content).toBe(NO_ANSWER_MESSAGE);
    expect(answer.sources).toEqual([]);
    expect(h.queries).toEqual(["Can I get an on-premise server for my bank?"]);
  });

  it("falls back honestly for an unsupported new question", async () => {
    const h = new RagHarness();
    const answer = await h.service.answer("Is there a moon base?", []);
    expect(answer.answerable).toBe(false);
    expect(answer.content).toBe(NO_ANSWER_MESSAGE);
  });

  it("answers a support question that follows small talk", async () => {
    const h = new RagHarness();
    const history: ChatTurn[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "Hi! I'm the Relay support assistant." },
    ];
    const answer = await h.service.answer("How do I reset my password?", history);
    expect(answer.answerable).toBe(true);
    expect(answer.sources[0].documentTitle).toBe("Account & access");
    expect(h.queries).toHaveLength(1);
  });

  it("keeps small-talk follow-ups conversational", async () => {
    const h = new RagHarness();
    const history: ChatTurn[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "Hi! I'm the Relay support assistant." },
    ];
    const answer = await h.service.answer("thanks", history);
    expect(answer.answerable).toBeNull();
    expect(answer.sources).toEqual([]);
    expect(h.queries).toEqual([]); // no embedding, no retrieval, no LLM
  });
});
````

### `backend/tests/google-auth.test.ts`

````ts
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/services/auth.service";
import type { UserRepository } from "../src/repositories/user.repository";
import type { GoogleProfile } from "../src/integrations/google-auth";
import { safeNextPath } from "../src/utils/safe-redirect";

const profile = (overrides: Partial<GoogleProfile> = {}): GoogleProfile => ({
  sub: "google-123",
  email: "person@example.com",
  emailVerified: true,
  name: "Person Example",
  ...overrides,
});

const staff = {
  id: "u1",
  email: "agent@demo.com",
  name: "Agent",
  role: "AGENT" as const,
  isActive: true,
  passwordHash: "existing-hash",
  teamId: null,
  createdAt: new Date(),
};

function repo(overrides: Partial<Record<keyof UserRepository, unknown>> = {}) {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    ...overrides,
  } as unknown as UserRepository;
}

describe("Google sign-in account handling", () => {
  it("matches an existing account by email and keeps its role and team", async () => {
    const users = repo({
      findByEmail: vi.fn().mockResolvedValue(staff),
      findById: vi.fn().mockResolvedValue({ ...staff, passwordHash: undefined }),
    });
    const result = await new AuthService(users).googleLogin(profile({ email: "AGENT@demo.com" }));
    expect(result.user.role).toBe("AGENT");
    expect(typeof result.token).toBe("string");
    expect(users.create).not.toHaveBeenCalled();
  });

  it("creates a normal customer account for a new verified email", async () => {
    const users = repo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => ({ ...staff, ...data, id: "u2", role: "USER" })),
      findById: vi.fn().mockResolvedValue({ ...staff, id: "u2", email: "new@example.com", role: "USER" }),
    });
    const result = await new AuthService(users).googleLogin(profile({ email: "New@Example.com" }));
    expect(result.user.role).toBe("USER");
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com", name: "Person Example", role: "USER" }),
    );
    // A random placeholder password is stored: Google users never use password login.
    const created = (users.create as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(created.passwordHash).not.toBe("existing-hash");
    expect(created.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("rejects unverified Google emails and deactivated accounts", async () => {
    await expect(new AuthService(repo()).googleLogin(profile({ emailVerified: false }))).rejects.toThrow(/verify/i);
    const users = repo({ findByEmail: vi.fn().mockResolvedValue({ ...staff, isActive: false }) });
    await expect(new AuthService(users).googleLogin(profile({ email: "agent@demo.com" }))).rejects.toThrow(/deactivated/i);
  });
});

describe("safe post-login redirect", () => {
  it("allows only same-origin absolute paths", () => {
    expect(safeNextPath("/tickets?status=OPEN")).toBe("/tickets?status=OPEN");
    expect(safeNextPath(null)).toBe("/dashboard");
  });

  it("blocks open-redirect tricks", () => {
    for (const bad of ["//evil.example", "/\\evil.example", "https://evil.example", "javascript:alert(1)", "/ok\nSet-Cookie: x=1"]) {
      expect(safeNextPath(bad)).toBe("/dashboard");
    }
  });
});
````

### `frontend/src/hooks/use-theme.ts`

````ts
"use client";
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "relay-theme";
const EVENT = "relay-theme-change";

const prefersDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  } catch {
    return "system";
  }
}

/** Applies the class used by Tailwind's dark: variants. */
function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/**
 * Light / dark / system theme, persisted in localStorage. Multiple toggles on
 * the page stay in sync through a custom event, and System follows the OS.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = readTheme();
      setThemeState(next);
      applyTheme(next);
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    sync();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readTheme() !== "system") return;
      applyTheme("system");
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
    applyTheme(next);
    setThemeState(next);
    setIsDark(document.documentElement.classList.contains("dark"));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { theme, isDark, setTheme };
}
````

### `frontend/src/components/app/theme-toggle.tsx`

````tsx
"use client";
import { clsx } from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";
import { type Theme, useTheme } from "@/hooks/use-theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Visible light / dark / system switch, used in the sidebar, mobile header and login page. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="group" aria-label="Colour theme" className={clsx("inline-flex items-center gap-0.5 rounded-md border border-line bg-surface p-0.5", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded transition-colors",
            theme === value ? "bg-paper text-pine-600 ring-1 ring-line" : "text-ink-muted hover:bg-paper hover:text-ink",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
````

### `frontend/src/components/app/suggested-reply.tsx`

````tsx
"use client";
import { AlertTriangle, Pencil, RefreshCw, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { ReplySuggestion } from "@/lib/types";

/**
 * Agent-only first draft. It is never sent automatically: the agent edits it,
 * then uses the normal reply composer and explicitly clicks Send.
 */
export function SuggestedReply({ ticketId, onUse }: { ticketId: string; onUse: (text: string) => void }) {
  const toast = useToast();
  const [suggestion, setSuggestion] = useState<ReplySuggestion | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api<ReplySuggestion>(`/tickets/${ticketId}/suggest-reply`, { method: "POST" });
      setSuggestion(next);
      setDraft(next.text);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate a suggested reply. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const use = () => {
    if (!draft.trim()) return;
    onUse(draft.trim());
    toast.success("Draft moved to the reply box. Review it, then click Send.");
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-pine-600" aria-hidden />AI suggested reply</span>}
        description="Drafted from this ticket and the knowledge base. Review and edit before sending."
        action={
          <Button size="sm" variant={suggestion ? "ghost" : "secondary"} onClick={generate} loading={loading} aria-label={suggestion ? "Regenerate suggested reply" : "Generate suggested reply"}>
            {!loading && <RefreshCw className="h-3.5 w-3.5" aria-hidden />}{suggestion ? "Regenerate" : "Generate"}
          </Button>
        }
      />
      <div className="px-4 py-3 sm:px-5">
        {error ? (
          <div role="alert" className="flex flex-col gap-2 rounded-md border border-critical-line bg-critical-bg px-3 py-2.5 text-sm text-critical-fg sm:flex-row sm:items-center">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="secondary" onClick={generate}>Retry</Button>
          </div>
        ) : loading && !suggestion ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted" role="status">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />Drafting from the ticket and knowledge base…
          </p>
        ) : !suggestion ? (
          <p className="text-sm text-ink-muted">Generate a first draft, then edit it in your own words or send it as-is.</p>
        ) : (
          <>
            {editing ? (
              <>
                <label htmlFor={`suggested-reply-${ticketId}`} className="sr-only">Edit suggested reply</label>
                <Textarea
                  id={`suggested-reply-${ticketId}`}
                  rows={8}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[160px] text-sm"
                />
              </>
            ) : (
              <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-paper/60 px-3 py-2.5 text-sm leading-relaxed text-ink-soft">{draft}</p>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              {suggestion.groundedIn.length
                ? `Grounded in: ${suggestion.groundedIn.join(", ")}.`
                : "No matching knowledge-base section was found, so this draft only acknowledges the request."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={use} disabled={!draft.trim()}><Send className="h-3.5 w-3.5" aria-hidden />Use reply</Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />{editing ? "Done editing" : "Edit"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-faint">Nothing is sent until you click Send in the reply box.</p>
          </>
        )}
      </div>
    </Card>
  );
}
````

### `frontend/src/app/robots.ts`

````ts
import type { MetadataRoute } from "next";

/**
 * The public marketing page may be indexed; everything behind sign-in (customer
 * conversations, tickets, knowledge base, admin) must stay out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/tickets",
        "/assistant",
        "/review",
        "/incidents",
        "/knowledge",
        "/admin",
        "/login",
        "/api/",
      ],
    },
  };
}
````

## Modified backend files

### `backend/.env.example`

````text
# ---- Server ----
NODE_ENV=development
PORT=4000
# Comma-separated list of allowed browser origins.
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info

# ---- Data stores (match docker-compose.yml) ----
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/support_intel
REDIS_URL=redis://localhost:6379

# ---- Auth ----
# Use a long random string, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
# Set to true when serving over HTTPS.
COOKIE_SECURE=false
# Only enable behind a reverse proxy you control, so rate limits use the real client IP.
TRUST_PROXY=false

# ---- Google Sign-In (optional) ----
# Leave blank to hide the Google button; email/password keeps working.
# Authorised redirect URI: http://localhost:4000/api/v1/auth/google/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/auth/google/callback
# Where users return after sign-in (the Next.js app).
FRONTEND_URL=http://localhost:3000

# ---- ML service ----
ML_SERVICE_URL=http://localhost:8000
ML_TIMEOUT_MS=20000

# ---- LLM (answer generation + chat-to-ticket summaries) ----
# none      → no LLM: the assistant quotes the best matching sentences with citations.
# anthropic → Claude (set LLM_API_KEY; default model claude-haiku-4-5-20251001).
# openai    → any OpenAI-compatible API (set LLM_API_KEY; LLM_BASE_URL for non-OpenAI providers):
#   Groq:   LLM_BASE_URL=https://api.groq.com/openai/v1                        LLM_MODEL=llama-3.1-8b-instant
#   Gemini: LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai  LLM_MODEL=gemini-2.0-flash
#   Ollama: LLM_BASE_URL=http://localhost:11434/v1                             LLM_MODEL=llama3.1  (no key needed)
LLM_PROVIDER=none
LLM_API_KEY=
LLM_MODEL=
LLM_BASE_URL=
LLM_TIMEOUT_MS=30000

# ---- Knowledge base uploads ----
UPLOAD_DIR=uploads
MAX_UPLOAD_MB=10

# ---- Background jobs ----
# true: BullMQ workers run inside the API process (simplest).
# false: run them separately with `npm run worker` (scales independently).
RUN_WORKERS=true
````

### `backend/prisma/schema.prisma`

````prisma
// Support & Incident Intelligence Platform: data model.
// The Ticket is the central entity; chat, ML feedback and incidents all hang off it.
// Vector columns use pgvector and are read/written through the repositories via raw SQL.

generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "esm"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  USER
  AGENT
  ADMIN
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_FOR_USER
  RESOLVED
  CLOSED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum Category {
  ACCOUNT
  BILLING
  TECHNICAL
  FEATURE_REQUEST
  GENERAL
}

enum Sentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}

enum TriageStatus {
  PENDING
  COMPLETED
  FAILED
}

enum ReviewStatus {
  NOT_REQUIRED
  PENDING
  ACCEPTED
  CORRECTED
}

enum TicketSource {
  WEB
  CHATBOT
}

enum ActivityType {
  CREATED
  TRIAGED
  STATUS_CHANGED
  PRIORITY_CHANGED
  ASSIGNED
  COMMENTED
  REVIEWED
  ESCALATED_FROM_CHAT
  INCIDENT_LINKED
}

enum DocumentStatus {
  PENDING
  PROCESSING
  READY
  FAILED
}

enum MessageRole {
  USER
  ASSISTANT
}

enum MessageFeedbackVote {
  HELPFUL
  NOT_HELPFUL
}

enum MessageFeedbackReason {
  INCORRECT
  NOT_RELEVANT
  MISSING_INFORMATION
  OTHER
}

enum IncidentStatus {
  OPEN
  INVESTIGATING
  RESOLVED
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         Role     @default(USER)
  isActive     Boolean  @default(true)
  teamId       String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  team             Team?            @relation(fields: [teamId], references: [id], onDelete: SetNull)
  createdTickets   Ticket[]         @relation("TicketCreator")
  assignedTickets  Ticket[]         @relation("TicketAssignee")
  comments         TicketComment[]
  activities       TicketActivity[]
  feedback         TicketFeedback[]
  conversations    Conversation[]
  uploadedDocuments Document[]
  answerFeedback   Message[]        @relation("MessageFeedback")

  @@index([role])
  @@index([teamId])
}

model Team {
  id          String    @id @default(cuid())
  name        String    @unique
  description String?
  // The ML-predicted category this team handles; drives automatic routing.
  category    Category? @unique
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  members User[]
  tickets Ticket[]
}

model Ticket {
  id              String       @id @default(cuid())
  number          Int          @unique @default(autoincrement())
  title           String
  description     String
  status          TicketStatus @default(OPEN)
  priority        Priority     @default(MEDIUM)
  category        Category?
  sentiment       Sentiment?
  sentimentScore  Float?
  mlConfidence    Float?
  // Raw ML output + rule trace, kept for explainability and audit.
  aiAnalysis      Json?
  triageStatus    TriageStatus @default(PENDING)
  reviewStatus    ReviewStatus @default(NOT_REQUIRED)
  source          TicketSource @default(WEB)
  embedding       Unsupported("vector(384)")?
  resolution      String?
  dueAt           DateTime?
  resolvedAt      DateTime?
  createdById     String
  assignedTeamId  String?
  assignedAgentId String?
  incidentId      String?
  conversationId  String?      @unique
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  createdBy     User             @relation("TicketCreator", fields: [createdById], references: [id], onDelete: Cascade)
  assignedTeam  Team?            @relation(fields: [assignedTeamId], references: [id], onDelete: SetNull)
  assignedAgent User?            @relation("TicketAssignee", fields: [assignedAgentId], references: [id], onDelete: SetNull)
  incident      Incident?        @relation(fields: [incidentId], references: [id], onDelete: SetNull)
  conversation  Conversation?    @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  comments      TicketComment[]
  activities    TicketActivity[]
  feedback      TicketFeedback[]

  @@index([status])
  @@index([priority])
  @@index([category])
  @@index([reviewStatus])
  @@index([createdById])
  @@index([assignedTeamId])
  @@index([assignedAgentId])
  @@index([incidentId])
  @@index([createdAt])
}

model TicketComment {
  id         String   @id @default(cuid())
  ticketId   String
  authorId   String
  body       String
  // Internal notes are visible to agents/admins only.
  isInternal Boolean  @default(false)
  createdAt  DateTime @default(now())

  ticket Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author User   @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([ticketId, createdAt])
}

model TicketActivity {
  id        String       @id @default(cuid())
  ticketId  String
  actorId   String?
  type      ActivityType
  data      Json?
  createdAt DateTime     @default(now())

  ticket Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  actor  User?  @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([ticketId, createdAt])
}

// Human corrections of ML predictions: the training signal for future retraining.
model TicketFeedback {
  id                String    @id @default(cuid())
  ticketId          String
  reviewerId        String
  predictedCategory Category?
  correctedCategory Category?
  predictedPriority Priority?
  correctedPriority Priority?
  confidence        Float?
  accepted          Boolean
  note              String?
  createdAt         DateTime  @default(now())

  ticket   Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  reviewer User   @relation(fields: [reviewerId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@index([createdAt])
}

model Document {
  id           String         @id @default(cuid())
  title        String
  fileName     String
  mimeType     String
  sizeBytes    Int
  storagePath  String
  status       DocumentStatus @default(PENDING)
  error        String?
  chunkCount   Int            @default(0)
  uploadedById String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  uploadedBy User            @relation(fields: [uploadedById], references: [id], onDelete: Cascade)
  chunks     DocumentChunk[]

  @@index([status])
}

model DocumentChunk {
  id         String                      @id @default(cuid())
  documentId String
  index      Int
  content    String
  tokenCount Int
  embedding  Unsupported("vector(384)")?
  /// Generated full-text vector (see migration hybrid_search); never written by the app.
  search     Unsupported("tsvector")?
  createdAt  DateTime                    @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, index])
}

model Conversation {
  id        String   @id @default(cuid())
  userId    String
  title     String   @default("New conversation")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]
  ticket   Ticket?

  @@index([userId, updatedAt])
}

model Message {
  id             String      @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String
  // Retrieved chunks used to ground the answer (citations).
  sources        Json?
  // False when the assistant could not answer from the knowledge base.
  answerable     Boolean?
  // Reader feedback on a grounded answer (never on small talk or "no answer" messages).
  feedbackVote   MessageFeedbackVote?
  feedbackReason MessageFeedbackReason?
  feedbackAt     DateTime?
  feedbackById   String?
  createdAt      DateTime    @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  feedbackBy   User?        @relation("MessageFeedback", fields: [feedbackById], references: [id], onDelete: SetNull)

  @@index([conversationId, createdAt])
  @@index([feedbackVote])
}

model Incident {
  id          String         @id @default(cuid())
  number      Int            @unique @default(autoincrement())
  title       String
  summary     String
  category    Category
  severity    Priority
  status      IncidentStatus @default(OPEN)
  // Detection evidence: cluster similarity, spike ratio, window.
  signals     Json?
  detectedAt  DateTime       @default(now())
  resolvedAt  DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  tickets Ticket[]

  @@index([status, category])
}

// Runtime-tunable configuration (thresholds), editable by admins.
model SystemSetting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
````

### `backend/prisma/seed.ts`

````ts
/**
 * Demo seed. Runs the REAL pipelines instead of inserting fake predictions:
 *   tickets → TriageService (ML service), docs → IngestionService (embeddings),
 *   chat → RagService, incidents → IncidentService.detect().
 * Requires the ML service to be running. Safe to re-run (it truncates first).
 */
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { env } from "../src/config/env";
import { buildContainer } from "../src/container";
import type { Category, Priority, TicketStatus } from "../src/generated/prisma/enums";
import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";
import { AuthService } from "../src/services/auth.service";
import type { AuthUser } from "../src/types/auth";

const PASSWORD = "Demo@1234";
const HOUR = 3_600_000;
const now = Date.now();
const log = (msg: string) => console.log(`  ${msg}`);

const TEAMS: { name: string; category: Category; description: string }[] = [
  { name: "Account Support", category: "ACCOUNT", description: "Sign-in, 2FA, SSO and account security" },
  { name: "Billing & Payments", category: "BILLING", description: "Payments, invoices, refunds and plans" },
  { name: "Technical Support", category: "TECHNICAL", description: "Bugs, API, integrations and performance" },
  { name: "Product Team", category: "FEATURE_REQUEST", description: "Feature requests and product feedback" },
  { name: "General Support", category: "GENERAL", description: "Questions, onboarding and everything else" },
];

const STAFF = [
  { email: "admin@demo.com", name: "Aditi Rao", role: "ADMIN", team: null },
  { email: "agent@demo.com", name: "Priya Sharma", role: "AGENT", team: "Billing & Payments" },
  { email: "arjun@demo.com", name: "Arjun Nair", role: "AGENT", team: "Technical Support" },
  { email: "rahul@demo.com", name: "Rahul Verma", role: "AGENT", team: "Technical Support" },
  { email: "neha@demo.com", name: "Neha Gupta", role: "AGENT", team: "Account Support" },
  { email: "meera@demo.com", name: "Meera Iyer", role: "AGENT", team: "Product Team" },
  { email: "kabir@demo.com", name: "Kabir Singh", role: "AGENT", team: "General Support" },
] as const;

const CUSTOMERS = [
  { email: "user@demo.com", name: "Aarav Mehta" },
  { email: "sneha@demo.com", name: "Sneha Kulkarni" },
  { email: "vikram@demo.com", name: "Vikram Joshi" },
  { email: "ananya@demo.com", name: "Ananya Das" },
  { email: "rohan@demo.com", name: "Rohan Malhotra" },
  { email: "isha@demo.com", name: "Isha Patel" },
];

/** [title, description, hoursAgo, customerIndex, finalStatus] */
type SeedTicket = [string, string, number, number, TicketStatus];

const HISTORY: SeedTicket[] = [
  ["Charged twice for my monthly subscription", "My card was charged two times for the same invoice this month. Please refund the duplicate payment.", 690, 1, "CLOSED"],
  ["Password reset email never arrives", "I requested a password reset three times but the email never arrives. I checked spam too.", 670, 0, "RESOLVED"],
  ["API returns 500 error on orders endpoint", "Our integration gets HTTP 500 internal server error from the orders endpoint since this morning.", 650, 2, "RESOLVED"],
  ["Please add dark mode to the dashboard", "It would be great to have a dark mode option, our team works late and the white screen is tiring.", 620, 3, "CLOSED"],
  ["Need GST invoice for last quarter", "Where can I download invoices for the last quarter with our GST number on them?", 600, 4, "RESOLVED"],
  ["Locked out after too many attempts", "My account got locked after too many login attempts and I need access urgently for a client meeting.", 560, 5, "RESOLVED"],
  ["Webhooks stopped being delivered", "Webhooks to our endpoint stopped arriving two days ago. Nothing changed on our side.", 530, 2, "RESOLVED"],
  ["Refund for annual plan bought by mistake", "I bought the annual plan by mistake instead of monthly yesterday. Please refund it.", 500, 1, "CLOSED"],
  ["What are your support hours?", "Hi, what are your support hours and do you offer phone support?", 470, 3, "CLOSED"],
  ["Mobile app crashes on reports screen", "The Android app crashes every time I open the reports screen after the latest update.", 440, 0, "RESOLVED"],
  ["Bulk editing for records", "We would like bulk editing so we can update many records at once, it would save hours every week.", 410, 4, "RESOLVED"],
  ["2FA code not accepted", "The two-factor authentication code from my authenticator app is not accepted. Time on my phone is correct.", 380, 5, "RESOLVED"],
  ["CSV export produces an empty file", "Data export to CSV produces an empty file even though the table has hundreds of rows.", 350, 2, "RESOLVED"],
  ["Promo code not applied at checkout", "The promo code from your newsletter is not being applied at checkout, says invalid.", 320, 3, "CLOSED"],
  ["Student discount", "Do you offer discounts for students? I am building a college project with my team.", 300, 0, "RESOLVED"],
  ["Slack integration stopped syncing", "The integration with Slack stopped syncing messages to our channel. Reconnecting did not help.", 270, 4, "RESOLVED"],
  ["Card declined when upgrading plan", "My card gets declined when trying to upgrade my plan, but it works everywhere else.", 240, 5, "RESOLVED"],
  ["Calendar view for tasks", "A calendar view for tasks would be really helpful for planning our sprints.", 220, 1, "OPEN"],
  ["Unknown sign-ins on my account", "I see sign-ins from a city I have never been to. Someone else may have access to my account. Possible security breach!", 200, 0, "RESOLVED"],
  ["Dashboard takes forever to load", "The analytics dashboard takes forever to load and then times out. This is blocking our weekly review.", 180, 2, "RESOLVED"],
  ["How do I invite my team?", "Can I invite my team to try the product before we buy a plan?", 150, 3, "CLOSED"],
  ["Switch from monthly to yearly billing", "I want to switch from monthly to yearly billing. Is there a discount?", 130, 4, "RESOLVED"],
  ["Search not showing recent items", "Search results are not showing items we added in the last two days.", 110, 5, "IN_PROGRESS"],
  ["Rate limit errors under quota", "We get 429 rate limit errors even though we are well under our quota.", 96, 2, "WAITING_FOR_USER"],
  ["Export reports as PDF", "Please add the ability to export reports as PDF so we can share them with management.", 80, 1, "OPEN"],
  ["SSO login with Google fails", "SSO login with Google fails with an invalid account error for two of our new employees.", 70, 4, "IN_PROGRESS"],
  ["Invoice shows wrong company name", "The invoice shows the wrong company name, it should be Mehta Traders Pvt Ltd.", 52, 0, "WAITING_FOR_USER"],
  ["File upload fails above 10MB", "File upload fails for files larger than 10MB with a generic error.", 40, 3, "IN_PROGRESS"],
  ["Something is not right with my account invoice", "Not sure what I am doing wrong, the account page and the invoice don't match. Could you help?", 30, 5, "OPEN"],
  ["Is my data stored in India?", "Is my data stored in India or abroad? Our compliance team is asking.", 20, 1, "OPEN"],
  ["Terrible experience, app keeps logging me out", "This is so frustrating. My session expires every few minutes and logs me out. Awful, I lose my work every time!", 8, 0, "OPEN"],
  ["Question about the app and pricing", "general question about how things work and the pricing, whenever convenient", 5, 4, "OPEN"],
  ["Login works but the plan page errors", "I can sign in fine but the subscription page throws an error and I can't see my plan or invoices.", 4, 2, "OPEN"],
  ["Help with my workspace", "Hi, I need some help with my workspace settings, not sure where to start.", 3, 5, "OPEN"],
  ["Team members can't see the reports I shared", "I shared reports with my team but they say access denied, maybe a permissions thing or a bug?", 2, 3, "OPEN"],
];

/** A burst of near-duplicate payment failures in the last hour: drives incident detection. */
const PAYMENT_BURST: SeedTicket[] = [
  ["Payment failed at checkout", "Payment failed at checkout with an error but money was deducted from my bank account.", 0.75, 0, "OPEN"],
  ["Checkout payment failing", "Checkout payment failing with a gateway error for my card. Money deducted, order not confirmed.", 0.65, 1, "OPEN"],
  ["Payment failed but amount deducted", "My payment failed at checkout but the amount was deducted. Payment gateway error.", 0.55, 2, "OPEN"],
  ["UPI payment failed at checkout", "UPI payment failed at checkout, money deducted from bank, payment gateway shows error.", 0.45, 3, "OPEN"],
  ["Payment gateway error on checkout", "Payment gateway error on checkout page, payment failed and money deducted twice.", 0.35, 4, "OPEN"],
  ["Card payment failed during checkout", "Card payment failed during checkout with gateway timeout error, amount deducted from account.", 0.25, 5, "OPEN"],
  ["Payment failing for all customers at checkout", "All our customers say payment is failing at checkout with a gateway error. Money deducted, orders failing.", 0.15, 1, "OPEN"],
];

const RESOLUTIONS: Record<Category, string> = {
  ACCOUNT: "Verified the account owner, unlocked access and confirmed the user can sign in.",
  BILLING: "Processed the correction in the billing system; refund/adjustment confirmed with the customer.",
  TECHNICAL: "Identified the root cause, deployed a fix and confirmed with the customer that it works.",
  FEATURE_REQUEST: "Logged on the product roadmap and shared the public roadmap link with the customer.",
  GENERAL: "Answered the question and shared the relevant help-centre article.",
};

async function ensureMlService(c: ReturnType<typeof buildContainer>) {
  if (!(await c.ml.health())) {
    console.error(`\n✖ ML service is not reachable at ${env.ML_SERVICE_URL}. Start it first:\n    cd ml-service && uvicorn app.main:app --port 8000\n`);
    process.exit(1);
  }
}

async function truncateAll() {
  await prisma.$executeRawUnsafe(`TRUNCATE "TicketFeedback","TicketActivity","TicketComment","Message","DocumentChunk","Document","Ticket","Conversation","Incident","User","Team","SystemSetting" RESTART IDENTITY CASCADE`);
  await redis.flushdb();
}

async function main() {
  console.log("Seeding demo data…");
  const c = buildContainer();
  await ensureMlService(c);
  await truncateAll();

  const teams = new Map<string, string>();
  for (const t of TEAMS) teams.set(t.name, (await prisma.team.create({ data: t })).id);
  log(`${TEAMS.length} teams`);

  const passwordHash = await AuthService.hashPassword(PASSWORD);
  const staff = new Map<string, AuthUser>();
  for (const s of STAFF) {
    const u = await prisma.user.create({ data: { email: s.email, name: s.name, role: s.role, passwordHash, teamId: s.team ? teams.get(s.team) : null } });
    staff.set(s.email, { id: u.id, email: u.email, name: u.name, role: u.role, teamId: u.teamId });
  }
  const customers: AuthUser[] = [];
  for (const cu of CUSTOMERS) {
    const u = await prisma.user.create({ data: { ...cu, role: "USER", passwordHash } });
    customers.push({ id: u.id, email: u.email, name: u.name, role: u.role, teamId: null });
  }
  log(`${STAFF.length} staff + ${CUSTOMERS.length} customers (password: ${PASSWORD})`);

  // Knowledge base: real extraction → chunking → embeddings.
  const admin = staff.get("admin@demo.com")!;
  const docsDir = resolve(import.meta.dirname, "seed-data/docs");
  await mkdir(env.UPLOAD_DIR, { recursive: true });
  for (const file of await readdir(docsDir)) {
    const target = join(env.UPLOAD_DIR, `seed-${file}`);
    await copyFile(join(docsDir, file), target);
    const title = file.replace(/\.md$/, "").replace(/-/g, " ").replace(/\b\w/, (ch) => ch.toUpperCase());
    const doc = await prisma.document.create({
      data: { title, fileName: file, mimeType: "text/markdown", sizeBytes: (await stat(target)).size, storagePath: target, uploadedById: admin.id },
    });
    await c.ingestion.process(doc.id);
  }
  log(`${(await readdir(docsDir)).length} knowledge-base documents ingested (${await prisma.documentChunk.count()} chunks)`);

  // Tickets through the real triage pipeline.
  const agent = staff.get("agent@demo.com")!;
  const createTicket = async ([title, description, hoursAgo, who]: SeedTicket) => {
    const createdAt = new Date(now - hoursAgo * HOUR);
    const t = await prisma.ticket.create({ data: { title, description, createdById: customers[who].id, createdAt, updatedAt: createdAt } });
    await prisma.ticketActivity.create({ data: { ticketId: t.id, actorId: customers[who].id, type: "CREATED", data: { source: "WEB" }, createdAt } });
    await c.triage.triage(t.id);
    await prisma.ticketActivity.updateMany({
      where: { ticketId: t.id, type: { in: ["TRIAGED", "ASSIGNED"] } },
      data: { createdAt: new Date(createdAt.getTime() + 2000) },
    });
    return t.id;
  };

  const historyIds: string[] = [];
  for (const row of HISTORY) historyIds.push(await createTicket(row));

  // Lifecycle: move tickets to their final status with timeline, comments and reviews.
  for (const [i, id] of historyIds.entries()) {
    const [, , hoursAgo, who, finalStatus] = HISTORY[i];
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id }, include: { assignedAgent: true } });
    const handler = ticket.assignedAgentId ? { id: ticket.assignedAgentId } : agent;
    const at = (h: number) => new Date(now - Math.max(hoursAgo - h, 0.1) * HOUR);

    // Reviews for older low-confidence tickets (recent ones stay in the queue for the demo).
    if (ticket.reviewStatus === "PENDING" && hoursAgo > 48) {
      const correct = i % 3 === 0 && ticket.category !== "GENERAL";
      await c.review.review(staff.get("agent@demo.com")!, id, correct ? { action: "CORRECT", category: "GENERAL", note: "Customer was asking a general question" } : { action: "ACCEPT" });
    }

    // Agents also spot-check confident predictions; mostly confirmed, sometimes adjusted.
    if (ticket.reviewStatus === "NOT_REQUIRED" && hoursAgo > 48 && i % 3 === 1) {
      const adjust = i % 9 === 4;
      await c.review.review(agent, id, adjust ? { action: "CORRECT", priority: ticket.priority === "HIGH" ? "MEDIUM" : "HIGH", note: "Adjusted urgency after talking to the customer" } : { action: "ACCEPT" });
    }

    if (finalStatus === "OPEN") continue;
    await prisma.ticketComment.create({
      data: { ticketId: id, authorId: handler.id, body: "Thanks for reaching out. I'm looking into this now and will update you shortly.", createdAt: at(1) },
    });
    await prisma.ticketActivity.create({ data: { ticketId: id, actorId: handler.id, type: "STATUS_CHANGED", data: { from: "OPEN", to: "IN_PROGRESS" }, createdAt: at(1) } });

    if (finalStatus === "WAITING_FOR_USER") {
      await prisma.ticketComment.create({ data: { ticketId: id, authorId: handler.id, body: "Could you share a screenshot and the exact time this happened?", createdAt: at(3) } });
      await prisma.ticketActivity.create({ data: { ticketId: id, actorId: handler.id, type: "STATUS_CHANGED", data: { from: "IN_PROGRESS", to: "WAITING_FOR_USER" }, createdAt: at(3) } });
    }
    if (finalStatus === "RESOLVED" || finalStatus === "CLOSED") {
      const resolvedAt = at(2 + (i % 5) * 3);
      await prisma.ticketComment.create({ data: { ticketId: id, authorId: customers[who].id, body: "That worked, thank you!", createdAt: resolvedAt } });
      await prisma.ticketActivity.create({ data: { ticketId: id, actorId: handler.id, type: "STATUS_CHANGED", data: { from: "IN_PROGRESS", to: "RESOLVED" }, createdAt: resolvedAt } });
      if (finalStatus === "CLOSED") {
        await prisma.ticketActivity.create({ data: { ticketId: id, actorId: handler.id, type: "STATUS_CHANGED", data: { from: "RESOLVED", to: "CLOSED" }, createdAt: at(30) } });
      }
      await prisma.ticket.update({ where: { id }, data: { resolvedAt, resolution: RESOLUTIONS[ticket.category ?? "GENERAL"] } });
    }
    await prisma.ticket.update({ where: { id }, data: { status: finalStatus } });
  }
  await prisma.ticketComment.create({
    data: { ticketId: historyIds[22], authorId: agent.id, body: "Re-index job for this workspace is queued; engineering ticket ENG-412.", isInternal: true },
  });
  log(`${HISTORY.length} tickets triaged by the ML pipeline`);

  // A historical, resolved incident for context.
  const loginIds = historyIds.filter((_, i) => [1, 5, 11].includes(i));
  await prisma.incident.create({
    data: {
      title: "Account & access: Password reset and 2FA emails delayed",
      summary: "3 related account & access reports within 60 minutes.",
      category: "ACCOUNT",
      severity: "MEDIUM",
      status: "RESOLVED",
      signals: { clusterSize: 3, spikeRatio: 2.1, isSpike: false, windowMinutes: 60 },
      detectedAt: new Date(now - 560 * HOUR),
      resolvedAt: new Date(now - 548 * HOUR),
      tickets: { connect: loginIds.map((id) => ({ id })) },
    },
  });

  // Live payment incident: real clustering over embeddings.
  for (const row of PAYMENT_BURST) await createTicket(row);
  const detection = await c.incidents.detect();
  log(`Incident detection: ${JSON.stringify(detection)}`);
  if (!detection.created) console.warn("  ⚠ No live incident detected; lower incidentSimilarityThreshold in Settings if your embedder differs.");

  // Example conversations through the real RAG pipeline.
  const user = customers[0];
  const answered = await c.chat.create(user);
  const firstAnswer = await c.chat.send(user, answered.id, "How do I reset my password?");
  const secondAnswer = await c.chat.send(user, answered.id, "How long is the reset link valid?");
  // A couple of votes so the analytics feedback cards show real data.
  if (firstAnswer.assistantMessage.answerable) {
    await c.chat.rateMessage(user, answered.id, firstAnswer.assistantMessage.id, { vote: "HELPFUL" });
  }
  if (secondAnswer.assistantMessage.answerable) {
    await c.chat.rateMessage(user, answered.id, secondAnswer.assistantMessage.id, { vote: "NOT_HELPFUL", reason: "MISSING_INFORMATION" });
  }
  const escalated = await c.chat.create(user);
  await c.chat.send(user, escalated.id, "Can I get a custom on-premise deployment with a dedicated server for my bank?");
  const fromChat = await c.chat.escalate(user, escalated.id);
  await c.triage.triage(fromChat.id);
  log("2 example conversations (1 answered with sources, 1 escalated to a ticket)");

  const [tickets, review, incidents] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { reviewStatus: "PENDING" } }),
    prisma.incident.count(),
  ]);
  console.log(`\n✔ Done: ${tickets} tickets, ${review} awaiting review, ${incidents} incidents.`);
  console.log(`  Sign in as admin@demo.com / agent@demo.com / user@demo.com with password ${PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit();
  });
````

### `backend/src/app.ts`

````ts
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
````

### `backend/src/config/constants.ts`

````ts
import type { Category, Priority, TicketStatus, IncidentStatus } from "../generated/prisma/enums";

export const PRIORITY_ORDER: readonly Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** SLA resolution targets, in hours, by priority. */
export const SLA_HOURS: Record<Priority, number> = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };

export const OPEN_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER"];
export const CLOSED_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED"];

/** Allowed ticket status transitions (state machine). */
export const STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  WAITING_FOR_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
};

/** Allowed incident status transitions, shared by the API and the UI. */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  OPEN: ["INVESTIGATING", "RESOLVED"],
  INVESTIGATING: ["RESOLVED"],
  RESOLVED: ["OPEN"],
};

export const CATEGORY_LABELS: Record<Category, string> = {
  ACCOUNT: "Account & access",
  BILLING: "Billing & payments",
  TECHNICAL: "Technical issue",
  FEATURE_REQUEST: "Feature request",
  GENERAL: "General",
};

export const EMBEDDING_DIM = 384;

export const QUEUES = {
  triage: "ticket-triage",
  ingestion: "document-ingestion",
  incidents: "incident-detection",
} as const;

export const AUTH_COOKIE = "si_token";

/** Human-facing ticket reference, identical to the frontend format. */
export const ticketRef = (n: number) => `TCK-${String(n).padStart(4, "0")}`;
````

### `backend/src/config/env.ts`

````ts
import "dotenv/config";
import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  COOKIE_SECURE: bool,
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  ML_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  ML_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  LLM_PROVIDER: z.enum(["anthropic", "openai", "none"]).default("none"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  // Google OAuth is optional: without these the email/password flow is unaffected.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  // Only trust X-Forwarded-For when the API sits behind a proxy you control.
  TRUST_PROXY: bool,
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  RUN_WORKERS: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast at boot with a readable message instead of failing later at runtime.
  console.error("Invalid environment configuration:\n", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
export const isProd = env.NODE_ENV === "production";
````

### `backend/src/container.ts`

````ts
/**
 * Composition root: the only place that knows concrete implementations.
 * Everything else depends on constructor-injected abstractions (DIP).
 */
import { env } from "./config/env";
import { defaultPriorityEngine } from "./domain/priority-engine";
import { EventBus } from "./events/event-bus";
import { createLlmProvider } from "./integrations/llm/llm-factory";
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
    auth: new AuthService(users),
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
````

### `backend/src/controllers/admin.controller.ts`

````ts
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
````

### `backend/src/controllers/auth.controller.ts`

````ts
import type { CookieOptions, Response } from "express";
import { randomUUID } from "node:crypto";
import { AUTH_COOKIE } from "../config/constants";
import { env } from "../config/env";
import type { Container } from "../container";
import { exchangeGoogleCode, googleAuthUrl, googleConfigured } from "../integrations/google-auth";
import { currentUser } from "../middleware/auth";
import { dto } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { safeNextPath } from "../utils/safe-redirect";
import { loginSchema, registerSchema } from "../validators/auth.validators";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.COOKIE_SECURE,
  maxAge: 24 * 3_600_000,
  path: "/",
};

const OAUTH_STATE_COOKIE = "si_oauth_state";
const OAUTH_NEXT_COOKIE = "si_oauth_next";
const oauthCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.COOKIE_SECURE,
  maxAge: 10 * 60_000,
  path: "/api/v1/auth/google",
};

// The session lives in the httpOnly cookie; the token is deliberately not exposed to JavaScript.
const sendSession = (res: Response, status: number, { token, user }: { token: string; user: unknown }) =>
  res.cookie(AUTH_COOKIE, token, cookieOptions).status(status).json({ user });

const redirectToLogin = (res: Response, reason: string) => res.redirect(`${env.FRONTEND_URL}/login?error=${reason}`);

export const authController = ({ auth }: Container) => ({
  login: asyncHandler(async (_req, res) => sendSession(res, 200, await auth.login(dto(res, "body", loginSchema)))),
  register: asyncHandler(async (_req, res) => sendSession(res, 201, await auth.register(dto(res, "body", registerSchema)))),
  logout: asyncHandler(async (_req, res) => {
    res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined }).status(204).end();
  }),
  me: asyncHandler(async (req, res) => {
    res.json({ user: await auth.me(currentUser(req).id) });
  }),

  providers: asyncHandler(async (_req, res) => {
    res.json({ google: googleConfigured(env) });
  }),

  /** Starts the Authorization Code flow; state is stored in an httpOnly cookie (CSRF guard). */
  googleStart: asyncHandler(async (req, res) => {
    if (!googleConfigured(env)) return redirectToLogin(res, "google_unconfigured");
    const state = randomUUID();
    const next = safeNextPath(typeof req.query.next === "string" ? req.query.next : null);
    res.cookie(OAUTH_STATE_COOKIE, state, oauthCookieOptions);
    res.cookie(OAUTH_NEXT_COOKIE, next, oauthCookieOptions);
    res.redirect(googleAuthUrl(env, state));
  }),

  googleCallback: asyncHandler(async (req, res) => {
    if (!googleConfigured(env)) return redirectToLogin(res, "google_unconfigured");
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const expected = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    const next = safeNextPath(req.cookies?.[OAUTH_NEXT_COOKIE]);
    res.clearCookie(OAUTH_STATE_COOKIE, { ...oauthCookieOptions, maxAge: undefined });
    res.clearCookie(OAUTH_NEXT_COOKIE, { ...oauthCookieOptions, maxAge: undefined });

    if (!state || !expected || state !== expected) return redirectToLogin(res, "google_state");
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) return redirectToLogin(res, "google_cancelled");

    try {
      const profile = await exchangeGoogleCode(env, code);
      const session = await auth.googleLogin(profile);
      res.cookie(AUTH_COOKIE, session.token, cookieOptions);
      return res.redirect(`${env.FRONTEND_URL}${next}`);
    } catch {
      return redirectToLogin(res, "google_failed");
    }
  }),
});
````

### `backend/src/controllers/chat.controller.ts`

````ts
import type { Container } from "../container";
import { currentUser } from "../middleware/auth";
import { dto } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { createConversationSchema, messageFeedbackSchema, messageParam, sendMessageSchema } from "../validators/chat.validators";
import { idParam } from "../validators/common";

export const chatController = ({ chat }: Container) => ({
  list: asyncHandler(async (req, res) => {
    res.json(await chat.list(currentUser(req)));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await chat.create(currentUser(req), dto(res, "body", createConversationSchema).title));
  }),
  get: asyncHandler(async (req, res) => {
    res.json(await chat.get(currentUser(req), dto(res, "params", idParam).id));
  }),
  send: asyncHandler(async (req, res) => {
    res.status(201).json(await chat.send(currentUser(req), dto(res, "params", idParam).id, dto(res, "body", sendMessageSchema).content));
  }),
  clear: asyncHandler(async (req, res) => {
    await chat.clear(currentUser(req), dto(res, "params", idParam).id);
    res.status(204).end();
  }),
  remove: asyncHandler(async (req, res) => {
    await chat.remove(currentUser(req), dto(res, "params", idParam).id);
    res.status(204).end();
  }),
  feedback: asyncHandler(async (req, res) => {
    const { id, messageId } = dto(res, "params", messageParam);
    res.json(await chat.rateMessage(currentUser(req), id, messageId, dto(res, "body", messageFeedbackSchema)));
  }),
  escalate: asyncHandler(async (req, res) => {
    res.status(201).json(await chat.escalate(currentUser(req), dto(res, "params", idParam).id));
  }),
});
````

### `backend/src/controllers/ticket.controller.ts`

````ts
import type { Container } from "../container";
import { currentUser } from "../middleware/auth";
import { dto } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { idParam, pageQuery } from "../validators/common";
import { commentSchema, createTicketSchema, listTicketsSchema, reviewSchema, updateTicketSchema } from "../validators/ticket.validators";

export const ticketController = ({ tickets, review, replySuggestions }: Container) => ({
  list: asyncHandler(async (req, res) => {
    res.json(await tickets.list(currentUser(req), dto(res, "query", listTicketsSchema)));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await tickets.create(currentUser(req), dto(res, "body", createTicketSchema)));
  }),
  get: asyncHandler(async (req, res) => {
    res.json(await tickets.get(currentUser(req), dto(res, "params", idParam).id));
  }),
  update: asyncHandler(async (req, res) => {
    res.json(await tickets.update(currentUser(req), dto(res, "params", idParam).id, dto(res, "body", updateTicketSchema)));
  }),
  comment: asyncHandler(async (req, res) => {
    res.status(201).json(await tickets.addComment(currentUser(req), dto(res, "params", idParam).id, dto(res, "body", commentSchema)));
  }),
  reanalyze: asyncHandler(async (req, res) => {
    res.status(202).json(await tickets.reanalyze(currentUser(req), dto(res, "params", idParam).id));
  }),
  suggestReply: asyncHandler(async (req, res) => {
    res.json(await replySuggestions.suggest(currentUser(req), dto(res, "params", idParam).id));
  }),
  reviewQueue: asyncHandler(async (_req, res) => {
    res.json(await review.queue(dto(res, "query", pageQuery)));
  }),
  review: asyncHandler(async (req, res) => {
    res.json(await review.review(currentUser(req), dto(res, "params", idParam).id, dto(res, "body", reviewSchema)));
  }),
  recentFeedback: asyncHandler(async (_req, res) => {
    res.json(await review.recentFeedback());
  }),
});
````

### `backend/src/lib/cache.ts`

````ts
import { logger } from "../config/logger";
import { redis } from "./redis";

/**
 * Read-through cache. Cache failures never break the request: we log and fall
 * back to the source of truth.
 */
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch (err) {
    logger.warn({ err, key }, "Cache read failed");
  }
  const value = await load();
  redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch((err) => logger.warn({ err, key }, "Cache write failed"));
  return value;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length) await redis.del(...keys).catch((err) => logger.warn({ err }, "Cache invalidation failed"));
}

export const CacheKeys = {
  analyticsOverview: "analytics:overview",
  settings: "settings:all",
} as const;

/** The analytics endpoint caches one entry per selectable range; writes clear them all. */
export const ANALYTICS_RANGE_KEYS = [7, 30, 90].map((days) => `${CacheKeys.analyticsOverview}:${days}`);
````

### `backend/src/repositories/conversation.repository.ts`

````ts
import type { Prisma } from "../generated/prisma/client";
import type { MessageRole } from "../generated/prisma/enums";
import type { Db } from "../lib/prisma";

export class ConversationRepository {
  constructor(private readonly db: Db) {}

  create(userId: string, title?: string) {
    return this.db.conversation.create({ data: { userId, ...(title && { title }) } });
  }

  listForUser(userId: string) {
    return this.db.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        ticket: { select: { id: true, number: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  findWithMessages(id: string) {
    return this.db.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        ticket: { select: { id: true, number: true, status: true } },
      },
    });
  }

  addMessage(conversationId: string, role: MessageRole, content: string, extra: { sources?: Prisma.InputJsonValue; answerable?: boolean | null } = {}) {
    return this.db.message.create({ data: { conversationId, role, content, ...extra } });
  }

  /** Reader feedback on a grounded answer; one vote per message, changed in place. */
  setMessageFeedback(id: string, vote: "HELPFUL" | "NOT_HELPFUL", reason: "INCORRECT" | "NOT_RELEVANT" | "MISSING_INFORMATION" | "OTHER" | null, userId: string) {
    return this.db.message.update({
      where: { id },
      data: { feedbackVote: vote, feedbackReason: reason, feedbackAt: new Date(), feedbackById: userId },
    });
  }

  touch(id: string, title?: string) {
    return this.db.conversation.update({ where: { id }, data: { updatedAt: new Date(), ...(title && { title }) } });
  }

  clearMessages(conversationId: string) {
    return this.db.message.deleteMany({ where: { conversationId } });
  }

  delete(id: string) {
    return this.db.conversation.delete({ where: { id } });
  }
}
````

### `backend/src/routes/index.ts`

````ts
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
import { loginSchema, registerSchema } from "../validators/auth.validators";
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
````

### `backend/src/services/analytics.service.ts`

````ts
import type { PrismaClient } from "../generated/prisma/client";
import { OPEN_STATUSES } from "../config/constants";
import { CacheKeys, cached } from "../lib/cache";
import type { AuthUser } from "../types/auth";
import { TicketPolicy } from "../domain/ticket-policy";
import { slaState } from "../domain/sla";
import { ticketListSelect } from "../repositories/ticket.repository";

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

export const ANALYTICS_DAYS = [7, 30, 90] as const;

/**
 * Admin analytics over a real date range. Every number is computed from the
 * database (tickets, human reviews and AI answer feedback); nothing is demo data.
 */
export class AnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  overview(days = 30) {
    return cached(`${CacheKeys.analyticsOverview}:${days}`, 60, () => this.computeOverview(days));
  }

  private async computeOverview(days: number) {
    const db = this.prisma;
    const now = new Date();
    const from = new Date(now);
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (days - 1));

    const range = { createdAt: { gte: from, lte: now } };
    const open = { status: { in: OPEN_STATUSES } };

    const [total, openCount, resolved, highPriority, triaged, autoRouted, feedbackTotal, feedbackAccepted, reviewQueue, activeIncidents, helpful, notHelpful, reasons] =
      await Promise.all([
        db.ticket.count({ where: range }),
        db.ticket.count({ where: { ...range, ...open } }),
        db.ticket.count({ where: { ...range, status: { in: ["RESOLVED", "CLOSED"] } } }),
        db.ticket.count({ where: { ...range, ...open, priority: { in: ["HIGH", "CRITICAL"] } } }),
        db.ticket.count({ where: { ...range, triageStatus: "COMPLETED" } }),
        db.ticket.count({ where: { ...range, triageStatus: "COMPLETED", aiAnalysis: { path: ["review", "required"], equals: false } } }),
        db.ticketFeedback.count({ where: { createdAt: { gte: from, lte: now } } }),
        db.ticketFeedback.count({ where: { createdAt: { gte: from, lte: now }, accepted: true } }),
        // Current queues are "now" states, not range-bound.
        db.ticket.count({ where: { reviewStatus: "PENDING" } }),
        db.incident.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
        db.message.count({ where: { feedbackVote: "HELPFUL", feedbackAt: { gte: from, lte: now } } }),
        db.message.count({ where: { feedbackVote: "NOT_HELPFUL", feedbackAt: { gte: from, lte: now } } }),
        db.message.groupBy({ by: ["feedbackReason"], _count: { _all: true }, where: { feedbackReason: { not: null }, feedbackAt: { gte: from, lte: now } } }),
      ]);

    const [avg] = await db.$queryRaw<{ hours: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::float AS "hours"
      FROM "Ticket"
      WHERE "resolvedAt" >= ${from} AND "resolvedAt" <= ${now}`;

    const [breached] = await db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS "count" FROM "Ticket"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${now} AND "dueAt" IS NOT NULL
        AND (("resolvedAt" IS NULL AND "dueAt" < ${now}) OR ("resolvedAt" > "dueAt"))`;

    const overTime = await db.$queryRaw<{ day: Date; created: number; resolved: number }[]>`
      SELECT d::date AS "day",
        (SELECT COUNT(*)::int FROM "Ticket" t WHERE t."createdAt"::date = d::date) AS "created",
        (SELECT COUNT(*)::int FROM "Ticket" t WHERE t."resolvedAt"::date = d::date) AS "resolved"
      FROM generate_series(${from}::date, ${now}::date, INTERVAL '1 day') d
      ORDER BY d`;

    const aiConfidence = await db.$queryRaw<{ bucket: string; count: number }[]>`
      SELECT CASE
          WHEN "mlConfidence" < 0.5 THEN '<50%'
          WHEN "mlConfidence" < 0.7 THEN '50–69%'
          WHEN "mlConfidence" < 0.85 THEN '70–84%'
          ELSE '85–100%'
        END AS "bucket",
        COUNT(*)::int AS "count"
      FROM "Ticket"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${now}
        AND "triageStatus" = 'COMPLETED' AND "mlConfidence" IS NOT NULL
      GROUP BY 1`;

    const [byCategory, byPriority, bySentiment, teams] = await Promise.all([
      db.ticket.groupBy({ by: ["category"], _count: { _all: true }, where: { ...range, category: { not: null } } }),
      db.ticket.groupBy({ by: ["priority"], _count: { _all: true }, where: range }),
      db.ticket.groupBy({ by: ["sentiment"], _count: { _all: true }, where: { ...range, sentiment: { not: null } } }),
      db.team.findMany({ select: { id: true, name: true, _count: { select: { tickets: { where: open } } } }, orderBy: { name: "asc" } }),
    ]);

    const answerFeedbackTotal = helpful + notHelpful;
    return {
      range: { days, from: from.toISOString(), to: now.toISOString() },
      kpis: {
        total,
        open: openCount,
        resolved,
        highPriority,
        avgResolutionHours: avg?.hours ? Math.round(avg.hours * 10) / 10 : null,
        resolutionRate: pct(resolved, total),
        automationRate: pct(autoRouted, triaged),
        modelAgreement: pct(feedbackAccepted, feedbackTotal),
        feedbackCount: feedbackTotal,
        reviewQueue,
        activeIncidents,
        slaBreached: breached?.count ?? 0,
        slaBreachRate: pct(breached?.count ?? 0, total),
        helpfulRate: pct(helpful, answerFeedbackTotal),
        answerFeedbackCount: answerFeedbackTotal,
      },
      aiFeedback: {
        helpful,
        notHelpful,
        total: answerFeedbackTotal,
        reasons: reasons.map((r) => ({ key: r.feedbackReason, count: r._count._all })),
      },
      aiConfidence: ["<50%", "50–69%", "70–84%", "85–100%"].map((bucket) => ({
        bucket,
        count: aiConfidence.find((b) => b.bucket === bucket)?.count ?? 0,
      })),
      ticketsOverTime: overTime.map((r) => ({ day: r.day.toISOString().slice(0, 10), created: r.created, resolved: r.resolved })),
      byCategory: byCategory.map((r) => ({ key: r.category, count: r._count._all })),
      byPriority: byPriority.map((r) => ({ key: r.priority, count: r._count._all })),
      bySentiment: bySentiment.map((r) => ({ key: r.sentiment, count: r._count._all })),
      teamWorkload: teams.map((t) => ({ id: t.id, name: t.name, open: t._count.tickets })),
      generatedAt: new Date().toISOString(),
    };
  }

  /** Role-aware summary for the home dashboard. */
  async dashboard(user: AuthUser) {
    const db = this.prisma;
    const open = { status: { in: OPEN_STATUSES } };
    if (!TicketPolicy.isStaff(user)) {
      const mine = { createdById: user.id };
      const [openCount, resolved, highPriority, waitingForYou, recent] = await Promise.all([
        db.ticket.count({ where: { ...mine, ...open } }),
        db.ticket.count({ where: { ...mine, status: { in: ["RESOLVED", "CLOSED"] } } }),
        db.ticket.count({ where: { ...mine, ...open, priority: { in: ["HIGH", "CRITICAL"] } } }),
        db.ticket.count({ where: { ...mine, status: "WAITING_FOR_USER" } }),
        db.ticket.findMany({ where: mine, orderBy: { updatedAt: "desc" }, take: 5, select: ticketListSelect }),
      ]);
      return { role: user.role, counts: { open: openCount, resolved, highPriority, waitingForYou }, recent };
    }

    const now = new Date();
    const soon = new Date(now.getTime() + 2 * 3_600_000);
    const [assigned, unassigned, highPriority, reviewQueue, breached, dueSoon, activeIncidents, queue] = await Promise.all([
      db.ticket.count({ where: { ...open, assignedAgentId: user.id } }),
      db.ticket.count({ where: { ...open, assignedAgentId: null } }),
      db.ticket.count({ where: { ...open, priority: { in: ["HIGH", "CRITICAL"] } } }),
      db.ticket.count({ where: { reviewStatus: "PENDING" } }),
      db.ticket.count({ where: { ...open, dueAt: { lt: now } } }),
      db.ticket.count({ where: { ...open, dueAt: { gte: now, lt: soon } } }),
      db.incident.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
      db.ticket.findMany({
        where: { ...open, assignedAgentId: user.id },
        orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }],
        take: 6,
        select: ticketListSelect,
      }),
    ]);
    return {
      role: user.role,
      counts: { assigned, unassigned, highPriority, reviewQueue, breached, dueSoon, activeIncidents },
      queue: queue.map((t) => ({ ...t, sla: slaState(t.dueAt, t.resolvedAt) })),
    };
  }
}
````

### `backend/src/services/auth.service.ts`

````ts
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { GoogleProfile } from "../integrations/google-auth";
import { signToken } from "../middleware/auth";
import type { UserRepository } from "../repositories/user.repository";
import { ConflictError, UnauthorizedError } from "../utils/errors";
import type { LoginDto, RegisterDto } from "../validators/auth.validators";

const BCRYPT_ROUNDS = 10;

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  static hashPassword(password: string) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async login({ email, password }: LoginDto) {
    const user = await this.users.findByEmail(email);
    // Same error for unknown email and wrong password: no account enumeration.
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid) throw new UnauthorizedError("Email or password is incorrect");
    if (!user.isActive) throw new UnauthorizedError("This account has been deactivated");
    const profile = await this.users.findById(user.id);
    return { token: signToken(user.id, user.role), user: profile! };
  }

  async register(dto: RegisterDto) {
    if (await this.users.findByEmail(dto.email)) throw new ConflictError("An account with this email already exists");
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash: await AuthService.hashPassword(dto.password),
      role: "USER",
    });
    return { token: signToken(user.id, user.role), user };
  }

  /**
   * Google sign-in. Matches an existing account by verified email (roles and team
   * stay untouched), and creates a normal customer account on first sign-in.
   */
  async googleLogin(profile: GoogleProfile) {
    if (!profile.emailVerified) throw new UnauthorizedError("Google did not verify this email address");
    const email = profile.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing && !existing.isActive) throw new UnauthorizedError("This account has been deactivated");

    const account =
      existing ??
      (await this.users.create({
        email,
        name: profile.name,
        // Google users never sign in with a password; store an unguessable placeholder.
        passwordHash: await AuthService.hashPassword(randomUUID()),
        role: "USER",
      }));

    const user = await this.users.findById(account.id);
    return { token: signToken(account.id, account.role), user: user! };
  }

  me(userId: string) {
    return this.users.findById(userId);
  }
}
````

### `backend/src/services/chat.service.ts`

````ts
import { ticketRef } from "../config/constants";
import { ANALYTICS_RANGE_KEYS, invalidate } from "../lib/cache";
import type { Prisma } from "../generated/prisma/client";
import { detectConversationalIntent } from "../domain/conversational-intent";
import type { ChatTurn } from "../domain/rag-prompt";
import type { ConversationRepository } from "../repositories/conversation.repository";
import type { AuthUser } from "../types/auth";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors";
import type { TicketSummarizer } from "./answer-generation";
import type { RagService } from "./rag.service";
import type { TicketService } from "./ticket.service";
import type { MessageFeedbackDto } from "../validators/chat.validators";

export class ChatService {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly rag: RagService,
    private readonly summarizer: TicketSummarizer,
    private readonly tickets: TicketService,
  ) {}

  list(user: AuthUser) {
    return this.conversations.listForUser(user.id);
  }

  create(user: AuthUser, title?: string) {
    return this.conversations.create(user.id, title);
  }

  async get(user: AuthUser, id: string) {
    const conversation = await this.conversations.findWithMessages(id);
    if (!conversation || conversation.userId !== user.id) throw new NotFoundError("Conversation");
    return conversation;
  }

  async send(user: AuthUser, id: string, content: string) {
    const conversation = await this.get(user, id);
    const history: ChatTurn[] = conversation.messages.map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));
    const userMessage = await this.conversations.addMessage(id, "USER", content);
    const answer = await this.rag.answer(content, history);
    const assistantMessage = await this.conversations.addMessage(id, "ASSISTANT", answer.content, {
      sources: answer.sources as unknown as Prisma.InputJsonValue,
      answerable: answer.answerable,
    });
    const isFirst = conversation.messages.length === 0;
    await this.conversations.touch(id, isFirst ? content.slice(0, 60) : undefined);
    return { userMessage, assistantMessage, generator: answer.generator };
  }

  async clear(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.conversations.clearMessages(id);
  }

  /** 👍/👎 on a grounded answer. Small talk and "no answer" messages are not rateable. */
  async rateMessage(user: AuthUser, conversationId: string, messageId: string, dto: MessageFeedbackDto) {
    const conversation = await this.get(user, conversationId);
    const message = conversation.messages.find((m) => m.id === messageId);
    if (!message) throw new NotFoundError("Message");
    if (message.role !== "ASSISTANT" || message.answerable !== true) {
      throw new BadRequestError("Only answers from the knowledge base can be rated");
    }
    const updated = await this.conversations.setMessageFeedback(
      messageId,
      dto.vote,
      dto.vote === "NOT_HELPFUL" ? (dto.reason ?? "OTHER") : null,
      user.id,
    );
    await invalidate(...ANALYTICS_RANGE_KEYS);
    return updated;
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.conversations.delete(id);
  }

  /** Chatbot → ticket: summarise the conversation and send it through the normal ML pipeline. */
  async escalate(user: AuthUser, id: string) {
    const conversation = await this.get(user, id);
    if (conversation.ticket) {
      throw new ConflictError(`This conversation is already ${ticketRef(conversation.ticket.number)}`, { ticketId: conversation.ticket.id });
    }
    // Small talk is not part of the support request: drop casual user messages and their
    // small-talk replies (answerable === null) so they never become ticket content.
    const turns: ChatTurn[] = conversation.messages
      .filter((m) => (m.role === "USER" ? !detectConversationalIntent(m.content) : m.answerable !== null))
      .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content }));
    if (!turns.some((t) => t.role === "user")) {
      throw new BadRequestError("Ask a support question first, then I can turn it into a ticket");
    }

    const draft = await this.summarizer.summarize(turns);
    const title = draft.title.length >= 5 ? draft.title : `Support request: ${draft.title}`;
    const description = draft.description.length >= 10 ? draft.description : `${draft.description}\n\n(created from chat)`;

    const ticket = await this.tickets.create(user, { title, description }, { source: "CHATBOT", conversationId: id });
    await this.conversations.addMessage(id, "ASSISTANT", `I've created ${ticketRef(ticket.number)} from this conversation. The support team will follow up there.`, {
      answerable: true,
    });
    await this.conversations.touch(id);
    return ticket;
  }
}
````

### `backend/src/services/incident.service.ts`

````ts
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { Category, IncidentStatus } from "../generated/prisma/enums";
import { CATEGORY_LABELS, INCIDENT_TRANSITIONS } from "../config/constants";
import { logger } from "../config/logger";
import { clusterBySimilarity, incidentSeverity, spikeRatio } from "../domain/incident-clustering";
import { IncidentRepository } from "../repositories/incident.repository";
import { TicketRepository } from "../repositories/ticket.repository";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { type PageParams, paginate } from "../utils/pagination";
import type { SettingsService } from "./settings.service";

const BASELINE_MINUTES = 7 * 24 * 60;
const SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;

export interface DetectionResult {
  created: number;
  updated: number;
  ticketsLinked: number;
}

/**
 * Compact incident intelligence over tickets (no log ingestion):
 * recent window → same-category embedding clusters → spike ratio → incident.
 */
export class IncidentService {
  private readonly incidents: IncidentRepository;
  private readonly tickets: TicketRepository;

  constructor(private readonly prisma: PrismaClient, private readonly settings: SettingsService) {
    this.incidents = new IncidentRepository(prisma);
    this.tickets = new TicketRepository(prisma);
  }

  async list(status: IncidentStatus | undefined, page: PageParams) {
    const { items, total } = await this.incidents.list(status, page);
    return paginate(items, total, page);
  }

  async get(id: string) {
    const incident = await this.incidents.findDetail(id);
    if (!incident) throw new NotFoundError("Incident");
    return incident;
  }

  async updateStatus(id: string, status: IncidentStatus) {
    const incident = await this.get(id);
    if (incident.status !== status && !INCIDENT_TRANSITIONS[incident.status].includes(status)) {
      throw new BadRequestError(`An ${incident.status.toLowerCase()} incident can't move to ${status.toLowerCase()}`);
    }
    return this.incidents.update(id, { status, resolvedAt: status === "RESOLVED" ? new Date() : null });
  }

  async detect(now = new Date()): Promise<DetectionResult> {
    const cfg = await this.settings.get();
    const since = new Date(now.getTime() - cfg.incidentWindowMinutes * 60_000);
    const windowTickets = await this.tickets.windowTickets(since);
    const result: DetectionResult = { created: 0, updated: 0, ticketsLinked: 0 };

    const byCategory = new Map<Category, typeof windowTickets>();
    for (const t of windowTickets) byCategory.set(t.category!, [...(byCategory.get(t.category!) ?? []), t]);

    for (const [category, tickets] of byCategory) {
      if (tickets.length < cfg.incidentMinClusterSize) continue;
      const ids = tickets.map((t) => t.id);
      const edges = (await this.tickets.similarityEdges(ids, cfg.incidentSimilarityThreshold)).map((e) => ({
        ...e,
        similarity: Number(e.similarity),
      }));
      const baseline = await this.tickets.countByCategorySince(category, new Date(since.getTime() - BASELINE_MINUTES * 60_000), since);
      const ratio = spikeRatio(tickets.length, baseline, cfg.incidentWindowMinutes, BASELINE_MINUTES);
      const isSpike = ratio >= cfg.incidentSpikeRatio;

      const clusters = clusterBySimilarity(ids, edges).filter((c) => c.ids.length >= cfg.incidentMinClusterSize);
      // Unusual volume with no tight cluster is still worth a look.
      if (!clusters.length && isSpike && tickets.length >= cfg.incidentMinClusterSize * 2) {
        clusters.push({ ids, medoidId: tickets[tickets.length - 1].id, avgSimilarity: 0 });
      }

      const byId = new Map(tickets.map((t) => [t.id, t]));
      for (const cluster of clusters) {
        const outcome = await this.upsertIncident(category, cluster, byId, { ratio, isSpike, windowMinutes: cfg.incidentWindowMinutes, spikeThreshold: cfg.incidentSpikeRatio });
        result.created += outcome.created ? 1 : 0;
        result.updated += outcome.created ? 0 : 1;
        result.ticketsLinked += outcome.linked;
      }
    }
    if (result.created || result.ticketsLinked) logger.info(result, "Incident detection finished");
    return result;
  }

  private async upsertIncident(
    category: Category,
    cluster: { ids: string[]; medoidId: string; avgSimilarity: number },
    byId: Map<string, { id: string; title: string; incidentId: string | null }>,
    s: { ratio: number; isSpike: boolean; windowMinutes: number; spikeThreshold: number },
  ) {
    const active = await this.incidents.findActive(category);
    const clusterSet = new Set(cluster.ids);
    const existing = active.find((i) => i.tickets.some((t) => clusterSet.has(t.id)));
    const activeIds = new Set(active.map((a) => a.id));
    // Never steal tickets from another active incident; re-link tickets of resolved ones.
    const linkable = cluster.ids.filter((id) => {
      const current = byId.get(id)?.incidentId;
      return !current || current === existing?.id || !activeIds.has(current);
    });
    const label = CATEGORY_LABELS[category];
    const size = new Set([...(existing?.tickets.map((t) => t.id) ?? []), ...linkable]).size;
    const severity = incidentSeverity(size, s.ratio, s.spikeThreshold);
    const summary =
      `${size} related ${label.toLowerCase()} reports within ${s.windowMinutes} minutes` +
      (s.isSpike ? `. Volume is ${s.ratio}× the normal rate.` : ".");
    const signals = {
      clusterSize: size,
      avgSimilarity: Number(cluster.avgSimilarity.toFixed(3)),
      spikeRatio: s.ratio,
      isSpike: s.isSpike,
      windowMinutes: s.windowMinutes,
    } satisfies Prisma.InputJsonObject;

    return this.prisma.$transaction(async (tx) => {
      const incidents = new IncidentRepository(tx);
      const tickets = new TicketRepository(tx);
      let incidentId: string;
      let created = false;
      if (existing) {
        incidentId = existing.id;
        const keep = SEVERITY_RANK[existing.severity] >= SEVERITY_RANK[severity] ? existing.severity : severity;
        await incidents.update(existing.id, { summary, severity: keep, signals });
      } else {
        const medoid = byId.get(cluster.medoidId);
        const incident = await incidents.create({ title: `${label}: ${medoid?.title ?? "related reports"}`, summary, category, severity, signals });
        incidentId = incident.id;
        created = true;
      }
      const newlyLinked = linkable.filter((id) => byId.get(id)?.incidentId !== incidentId);
      if (newlyLinked.length) {
        await incidents.linkTickets(incidentId, newlyLinked);
        for (const id of newlyLinked) await tickets.addActivity(id, null, "INCIDENT_LINKED", { incidentId });
      }
      return { created, linked: newlyLinked.length };
    });
  }
}
````

### `backend/src/services/rag.service.ts`

````ts
import { conversationalReply, detectConversationalIntent } from "../domain/conversational-intent";
import { fuseHybrid } from "../domain/hybrid-retrieval";
import { isContextDependentFollowUp } from "../domain/rag-followup";
import type { ChatTurn, RetrievedChunk } from "../domain/rag-prompt";
import type { MlClient } from "../integrations/ml-client";
import type { DocumentRepository } from "../repositories/document.repository";
import { toPgVector } from "../utils/vector";
import type { AnswerGenerator } from "./answer-generation";
import type { SettingsService } from "./settings.service";

export interface RagSource {
  ref: number;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  snippet: string;
  similarity: number;
  matchedBy: RetrievedChunk["matchedBy"];
}

export interface RagAnswer {
  content: string;
  /** true: grounded answer. false: support question with no reliable answer (ticket offered). null: small talk. */
  answerable: boolean | null;
  sources: RagSource[];
  generator: string;
}

export const NO_ANSWER_MESSAGE =
  "I couldn't find a reliable answer to that in the knowledge base. I can turn this conversation into a support ticket so a specialist can help.";

/** Retrieve → filter by relevance → generate grounded answer → attach citations. */
export class RagService {
  constructor(
    private readonly ml: MlClient,
    private readonly documents: DocumentRepository,
    private readonly generator: AnswerGenerator,
    private readonly settings: SettingsService,
  ) {}

  async retrieve(question: string, history: ChatTurn[] = []): Promise<RetrievedChunk[]> {
    const direct = await this.search(question);
    if (direct.length) return direct;
    // Only genuinely related follow-ups may borrow the previous question. A new,
    // unrelated question is retrieved on its own and may legitimately have no answer.
    if (!isContextDependentFollowUp(question, history)) return [];
    const previous = [...history].reverse().find((t) => t.role === "user")?.content;
    return previous ? this.search(`${previous}\n${question}`) : [];
  }

  private async search(query: string): Promise<RetrievedChunk[]> {
    const config = await this.settings.get();
    const [embedding] = await this.ml.embed([query]);
    const candidates = await this.documents.hybridCandidates(toPgVector(embedding), query);
    return fuseHybrid(candidates, {
      topK: config.ragTopK,
      minSimilarity: config.ragMinSimilarity,
      minKeywordCoverage: config.ragMinKeywordCoverage,
    });
  }

  async answer(question: string, history: ChatTurn[]): Promise<RagAnswer> {
    // Greetings, thanks, acknowledgements: reply directly. No embedding call, no retrieval,
    // no LLM, and no "create a ticket" offer, because there is nothing to escalate.
    const intent = detectConversationalIntent(question);
    if (intent) return { content: conversationalReply(intent), answerable: null, sources: [], generator: `conversational:${intent}` };

    const chunks = await this.retrieve(question, history);
    if (!chunks.length) return { content: NO_ANSWER_MESSAGE, answerable: false, sources: [], generator: "retrieval" };

    const result = await this.generator.answer(question, chunks, history);
    if (!result.answerable) return { content: NO_ANSWER_MESSAGE, answerable: false, sources: [], generator: result.generator };

    return { content: result.text, answerable: true, sources: RagService.citedSources(result.text, chunks), generator: result.generator };
  }

  /** Keeps only the excerpts the answer actually cites (all of them if none are cited). */
  static citedSources(text: string, chunks: RetrievedChunk[]): RagSource[] {
    const cited = new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
    return chunks
      .map((c, i) => ({
        ref: i + 1,
        documentId: c.documentId,
        documentTitle: c.documentTitle,
        chunkIndex: c.index,
        // Enough surrounding context for the reader to judge the citation. The UI adds an
        // ellipsis when this reaches the cap; it never shows a fabricated source.
        snippet: c.content.slice(0, 600),
        similarity: Number(c.similarity.toFixed(3)),
        matchedBy: c.matchedBy,
      }))
      .filter((s) => !cited.size || cited.has(s.ref));
  }
}
````

### `backend/src/services/review.service.ts`

````ts
import { ANALYTICS_RANGE_KEYS, invalidate } from "../lib/cache";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { Category, Priority } from "../generated/prisma/enums";
import { computeDueAt } from "../domain/sla";
import { FeedbackRepository } from "../repositories/feedback.repository";
import { TicketRepository, ticketListSelect } from "../repositories/ticket.repository";
import type { AuthUser } from "../types/auth";
import { NotFoundError, ConflictError } from "../utils/errors";
import { type PageParams, paginate, toSkipTake } from "../utils/pagination";
import type { ReviewDto } from "../validators/ticket.validators";
import type { RoutingService } from "./routing.service";

/**
 * Human-in-the-loop: agents accept or correct ML predictions. Every decision
 * is stored as TicketFeedback, the labelled data for future retraining.
 */
export class ReviewService {
  constructor(private readonly prisma: PrismaClient, private readonly routing: RoutingService) {}

  async queue(page: PageParams) {
    const where: Prisma.TicketWhereInput = { reviewStatus: "PENDING", status: { notIn: ["CLOSED"] } };
    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: { ...ticketListSelect, description: true, aiAnalysis: true },
        ...toSkipTake(page),
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return paginate(items, total, page);
  }

  async review(user: AuthUser, ticketId: string, dto: ReviewDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const tickets = new TicketRepository(tx);
      const ticket = await tickets.findRaw(ticketId);
      if (!ticket) throw new NotFoundError("Ticket");
      // A decision is final: re-reviewing would duplicate feedback and silently re-route.
      if (ticket.reviewStatus === "ACCEPTED" || ticket.reviewStatus === "CORRECTED") {
        throw new ConflictError("This ticket has already been reviewed");
      }

      const analysis = (ticket.aiAnalysis ?? {}) as { ml?: { category?: { label: Category } } };
      const predictedCategory = analysis.ml?.category?.label ?? ticket.category;
      const predictedPriority = ticket.priority;
      const accepted = dto.action === "ACCEPT";
      const finalCategory: Category | null = accepted ? ticket.category : (dto.category ?? ticket.category);
      const finalPriority: Priority = accepted ? ticket.priority : (dto.priority ?? ticket.priority);

      await new FeedbackRepository(tx).create({
        ticketId,
        reviewerId: user.id,
        predictedCategory,
        correctedCategory: finalCategory,
        predictedPriority,
        correctedPriority: finalPriority,
        confidence: ticket.mlConfidence,
        accepted,
        note: dto.note,
      });

      const data: Prisma.TicketUncheckedUpdateInput = {
        category: finalCategory,
        priority: finalPriority,
        reviewStatus: accepted ? "ACCEPTED" : "CORRECTED",
      };
      if (finalPriority !== ticket.priority) data.dueAt = computeDueAt(finalPriority, ticket.createdAt);

      // Route now if the category changed or the ticket was held without an agent.
      const categoryChanged = finalCategory && finalCategory !== ticket.category;
      if (finalCategory && (categoryChanged || !ticket.assignedAgentId)) {
        const route = await this.routing.route(finalCategory, { assignAgent: true });
        data.assignedTeamId = route.team?.id ?? null;
        if (route.agent) {
          data.assignedAgentId = route.agent.id;
          await tickets.addActivity(ticketId, user.id, "ASSIGNED", { agentId: route.agent.id, agentName: route.agent.name, teamName: route.team?.name, afterReview: true });
        }
      }

      await tickets.addActivity(ticketId, user.id, "REVIEWED", {
        action: dto.action,
        category: { from: ticket.category, to: finalCategory },
        priority: { from: ticket.priority, to: finalPriority },
      });
      return tickets.update(ticketId, data);
    });
    await invalidate(...ANALYTICS_RANGE_KEYS);
    return result;
  }

  recentFeedback() {
    return new FeedbackRepository(this.prisma).recent();
  }
}
````

### `backend/src/services/ticket.service.ts`

````ts
import { ANALYTICS_RANGE_KEYS, invalidate } from "../lib/cache";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { TicketSource } from "../generated/prisma/enums";
import { CLOSED_STATUSES, OPEN_STATUSES } from "../config/constants";
import { computeDueAt, slaState } from "../domain/sla";
import { TicketPolicy } from "../domain/ticket-policy";
import type { EventBus } from "../events/event-bus";
import { TicketRepository } from "../repositories/ticket.repository";
import { UserRepository } from "../repositories/user.repository";
import type { AuthUser } from "../types/auth";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";
import { paginate } from "../utils/pagination";
import type { CommentDto, CreateTicketDto, ListTicketsDto, UpdateTicketDto } from "../validators/ticket.validators";
import type { SettingsService } from "./settings.service";

const SORTS: Record<ListTicketsDto["sort"], Prisma.TicketOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  priority: [{ priority: "desc" }, { createdAt: "desc" }],
  due: [{ dueAt: { sort: "asc", nulls: "last" } }],
};

export class TicketService {
  private readonly tickets: TicketRepository;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly events: EventBus,
    private readonly settings: SettingsService,
  ) {
    this.tickets = new TicketRepository(prisma);
  }

  async create(user: AuthUser, dto: CreateTicketDto, opts: { source?: TicketSource; conversationId?: string } = {}) {
    const source = opts.source ?? "WEB";
    const ticket = await this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      const created = await repo.create({
        title: dto.title,
        description: dto.description,
        createdById: user.id,
        source,
        conversationId: opts.conversationId,
        aiAnalysis: dto.category ? { userCategoryHint: dto.category } : undefined,
      });
      await repo.addActivity(created.id, user.id, source === "CHATBOT" ? "ESCALATED_FROM_CHAT" : "CREATED", {
        source,
      });
      return created;
    });
    await invalidate(...ANALYTICS_RANGE_KEYS);
    this.events.emit("ticket.created", { ticketId: ticket.id });
    return ticket;
  }

  async list(user: AuthUser, q: ListTicketsDto) {
    const where: Prisma.TicketWhereInput = {
      status: q.status,
      priority: q.priority,
      category: q.category,
      ...this.scopeFilter(user, q.scope),
    };
    if (q.q) {
      const asNumber = Number(q.q.replace(/^#|^TCK-/i, ""));
      where.OR = [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
        ...(Number.isInteger(asNumber) && asNumber > 0 ? [{ number: asNumber }] : []),
      ];
    }
    const { items, total } = await this.tickets.list(where, SORTS[q.sort], q);
    return paginate(
      items.map((t) => ({ ...t, sla: slaState(t.dueAt, t.resolvedAt) })),
      total,
      q,
    );
  }

  private scopeFilter(user: AuthUser, scope: ListTicketsDto["scope"]): Prisma.TicketWhereInput {
    if (!TicketPolicy.isStaff(user)) return { createdById: user.id };
    switch (scope) {
      case "mine":
        return { createdById: user.id };
      case "assigned":
        return { assignedAgentId: user.id };
      case "unassigned":
        return { assignedAgentId: null, status: { in: OPEN_STATUSES } };
      case "team":
        return user.teamId ? { assignedTeamId: user.teamId } : { id: "__none__" };
      default:
        return {};
    }
  }

  async get(user: AuthUser, id: string) {
    const ticket = await this.tickets.findDetail(id);
    if (!ticket) throw new NotFoundError("Ticket");
    if (!TicketPolicy.canView(user, ticket)) throw new NotFoundError("Ticket"); // don't reveal existence
    const staff = TicketPolicy.isStaff(user);
    const config = await this.settings.get();
    const similar = staff
      ? await this.tickets.findSimilarToTicket(id, { limit: 5, minSimilarity: config.similarTicketThreshold })
      : [];
    return {
      ...ticket,
      comments: staff ? ticket.comments : ticket.comments.filter((c) => !c.isInternal),
      feedback: staff ? ticket.feedback : [],
      sla: slaState(ticket.dueAt, ticket.resolvedAt),
      similar: similar.map((s) => ({ ...s, similarity: Number(Number(s.similarity).toFixed(3)) })),
    };
  }

  async update(user: AuthUser, id: string, dto: UpdateTicketDto) {
    if (!TicketPolicy.canManage(user)) throw new ForbiddenError();
    const updated = await this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      const ticket = await repo.findRaw(id);
      if (!ticket) throw new NotFoundError("Ticket");
      const data: Prisma.TicketUncheckedUpdateInput = {};

      if (dto.status && dto.status !== ticket.status) {
        if (!TicketPolicy.canTransition(ticket.status, dto.status)) {
          throw new BadRequestError(`A ${ticket.status.toLowerCase()} ticket can't move to ${dto.status.toLowerCase()}`);
        }
        data.status = dto.status;
        if (dto.status === "RESOLVED") {
          data.resolvedAt = new Date();
          data.resolution = dto.resolution ?? ticket.resolution;
        } else if (!CLOSED_STATUSES.includes(dto.status)) {
          data.resolvedAt = null;
        }
        await repo.addActivity(id, user.id, "STATUS_CHANGED", { from: ticket.status, to: dto.status });
      } else if (dto.resolution) {
        data.resolution = dto.resolution;
      }

      if (dto.priority && dto.priority !== ticket.priority) {
        data.priority = dto.priority;
        data.dueAt = computeDueAt(dto.priority, ticket.createdAt);
        await repo.addActivity(id, user.id, "PRIORITY_CHANGED", { from: ticket.priority, to: dto.priority });
      }

      if (dto.assignedTeamId !== undefined && dto.assignedTeamId !== ticket.assignedTeamId) {
        data.assignedTeamId = dto.assignedTeamId;
      }

      if (dto.assignedAgentId !== undefined && dto.assignedAgentId !== ticket.assignedAgentId) {
        let agentName: string | null = null;
        if (dto.assignedAgentId) {
          const agent = await new UserRepository(tx).findById(dto.assignedAgentId);
          if (!agent || agent.role === "USER" || !agent.isActive) throw new BadRequestError("Pick an active agent");
          agentName = agent.name;
          if (dto.assignedTeamId === undefined && agent.teamId) data.assignedTeamId = agent.teamId;
        }
        data.assignedAgentId = dto.assignedAgentId;
        await repo.addActivity(id, user.id, "ASSIGNED", { agentId: dto.assignedAgentId, agentName });
      }

      if (!Object.keys(data).length) return repo.update(id, {});
      return repo.update(id, data);
    });
    await invalidate(...ANALYTICS_RANGE_KEYS);
    return updated;
  }

  async addComment(user: AuthUser, id: string, dto: CommentDto) {
    const ticket = await this.tickets.findRaw(id);
    if (!ticket || !TicketPolicy.canView(user, ticket)) throw new NotFoundError("Ticket");
    if (!TicketPolicy.canComment(user, ticket)) throw new BadRequestError("Closed tickets can't receive new comments");
    const isInternal = TicketPolicy.isStaff(user) ? dto.isInternal : false;

    return this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      const comment = await repo.addComment(id, user.id, dto.body, isInternal);
      await repo.addActivity(id, user.id, "COMMENTED", { internal: isInternal });
      // A customer reply moves a waiting ticket back into the agent's active work.
      if (!TicketPolicy.isStaff(user) && ticket.status === "WAITING_FOR_USER") {
        await repo.update(id, { status: "IN_PROGRESS" });
        await repo.addActivity(id, user.id, "STATUS_CHANGED", { from: "WAITING_FOR_USER", to: "IN_PROGRESS", automatic: true });
      }
      return comment;
    });
  }

  async reanalyze(user: AuthUser, id: string) {
    if (!TicketPolicy.canManage(user)) throw new ForbiddenError();
    const ticket = await this.tickets.findRaw(id);
    if (!ticket) throw new NotFoundError("Ticket");
    if (ticket.status === "CLOSED") throw new BadRequestError("Closed tickets can't be re-analysed");
    if (ticket.reviewStatus === "ACCEPTED" || ticket.reviewStatus === "CORRECTED") {
      throw new BadRequestError("A human already reviewed this ticket. Re-analysis would overwrite that decision.");
    }
    await this.tickets.update(id, { triageStatus: "PENDING" });
    this.events.emit("ticket.reanalyze", { ticketId: id });
    return { queued: true };
  }
}
````

### `backend/src/services/triage.service.ts`

````ts
import { ANALYTICS_RANGE_KEYS, invalidate } from "../lib/cache";
import type { PrismaClient } from "../generated/prisma/client";
import type { Prisma } from "../generated/prisma/client";
import { logger } from "../config/logger";
import type { PriorityEngine } from "../domain/priority-engine";
import { computeDueAt } from "../domain/sla";
import type { EventBus } from "../events/event-bus";
import type { MlClient } from "../integrations/ml-client";
import { TicketRepository } from "../repositories/ticket.repository";
import { toPgVector } from "../utils/vector";
import type { RoutingService } from "./routing.service";
import type { SettingsService } from "./settings.service";

const DAY_MS = 86_400_000;

/**
 * The ML-to-business-logic bridge:
 *   ML analysis → related tickets → hybrid priority → confidence gate → routing → SLA.
 * Every decision is written to `aiAnalysis` so the UI can explain it.
 */
export class TriageService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ml: MlClient,
    private readonly priorityEngine: PriorityEngine,
    private readonly routing: RoutingService,
    private readonly settings: SettingsService,
    private readonly events: EventBus,
  ) {}

  async triage(ticketId: string): Promise<void> {
    const tickets = new TicketRepository(this.prisma);
    const ticket = await tickets.findRaw(ticketId);
    if (!ticket) return;
    const config = await this.settings.get();

    const ml = await this.ml.analyze(ticket.title, ticket.description);
    const vector = toPgVector(ml.embedding);

    const similar = await tickets.findSimilarByVector(vector, {
      limit: 5,
      minSimilarity: config.similarTicketThreshold,
      excludeId: ticket.id,
    });
    const recentSimilar = await tickets.findSimilarByVector(vector, {
      limit: 50,
      minSimilarity: config.similarTicketThreshold,
      excludeId: ticket.id,
      since: new Date(Date.now() - DAY_MS),
      onlyOpen: true,
    });

    const priority = this.priorityEngine.evaluate({
      text: `${ticket.title}\n${ticket.description}`,
      mlPriority: ml.priority.label,
      mlPriorityConfidence: ml.priority.confidence,
      sentiment: ml.sentiment.label,
      sentimentCompound: ml.sentiment.compound,
      recentSimilarCount: recentSimilar.length,
    });

    const needsReview = ml.category.confidence < config.confidenceThreshold;
    const route = await this.routing.route(ml.category.label, { assignAgent: !needsReview && !ticket.assignedAgentId });
    const previousAnalysis = (ticket.aiAnalysis ?? {}) as Prisma.JsonObject;

    const analysis = {
      ...previousAnalysis,
      ml: { category: ml.category, priority: ml.priority, sentiment: ml.sentiment, modelVersion: ml.modelVersion },
      priority,
      review: { required: needsReview, threshold: config.confidenceThreshold },
      routing: { team: route.team, agent: route.agent, reason: route.reason },
      similar: similar.map((s) => ({ id: s.id, number: s.number, title: s.title, similarity: Number(s.similarity.toFixed(3)) })),
      recentSimilarCount: recentSimilar.length,
      analyzedAt: new Date().toISOString(),
    };

    await this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      await repo.update(ticket.id, {
        category: ml.category.label,
        priority: priority.final,
        sentiment: ml.sentiment.label,
        sentimentScore: ml.sentiment.score,
        mlConfidence: ml.category.confidence,
        aiAnalysis: JSON.parse(JSON.stringify(analysis)) as Prisma.InputJsonValue,
        triageStatus: "COMPLETED",
        reviewStatus: needsReview ? "PENDING" : "NOT_REQUIRED",
        assignedTeamId: route.team?.id ?? null,
        ...(route.agent && { assignedAgentId: route.agent.id }),
        dueAt: computeDueAt(priority.final, ticket.createdAt),
      });
      await repo.setEmbedding(ticket.id, vector);
      await repo.addActivity(ticket.id, null, "TRIAGED", {
        category: ml.category.label,
        confidence: ml.category.confidence,
        priority: priority.final,
        needsReview,
      });
      if (route.agent) {
        await repo.addActivity(ticket.id, null, "ASSIGNED", { agentId: route.agent.id, agentName: route.agent.name, teamName: route.team?.name, automatic: true });
      }
    });

    await invalidate(...ANALYTICS_RANGE_KEYS);
    logger.info({ ticketId, category: ml.category.label, priority: priority.final, needsReview }, "Ticket triaged");
    this.events.emit("ticket.triaged", { ticketId });
  }

  /** Graceful degradation after all retries fail: send to General team for a human. */
  async markFailed(ticketId: string, reason: string): Promise<void> {
    const route = await this.routing.route("GENERAL", { assignAgent: false });
    await this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      await repo.update(ticketId, { triageStatus: "FAILED", reviewStatus: "PENDING", assignedTeamId: route.team?.id ?? null });
      await repo.addActivity(ticketId, null, "TRIAGED", { failed: true, reason });
    });
  }
}
````

### `backend/src/validators/admin.validators.ts`

````ts
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
````

### `backend/src/validators/chat.validators.ts`

````ts
import { z } from "zod";
import { trimmed } from "./common";

export const sendMessageSchema = z.object({ content: trimmed(1, 2000) });
export const createConversationSchema = z.object({ title: trimmed(1, 120).optional() });

export const messageFeedbackSchema = z
  .object({
    vote: z.enum(["HELPFUL", "NOT_HELPFUL"]),
    reason: z.enum(["INCORRECT", "NOT_RELEVANT", "MISSING_INFORMATION", "OTHER"]).optional(),
  })
  .refine((v) => v.vote !== "NOT_HELPFUL" || !!v.reason, {
    message: "Choose a reason for the negative feedback",
    path: ["reason"],
  });

export const messageParam = z.object({ id: z.string().min(1).max(64), messageId: z.string().min(1).max(64) });

export type MessageFeedbackDto = z.infer<typeof messageFeedbackSchema>;
````

### `backend/tests/api.integration.test.ts`

````ts
/**
 * Integration tests: real Express app + PostgreSQL (seeded demo data), with the
 * ML service replaced by a deterministic fake via the composition root.
 * Run `npm run db:seed` first. Created records are removed afterwards.
 */
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "../src/types/auth";
import { createApp } from "../src/app";
import { buildContainer } from "../src/container";
import type { MlClient, TicketAnalysis } from "../src/integrations/ml-client";
import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

const vector = (seed: number) => Array.from({ length: 384 }, (_, i) => Math.sin(seed * (i + 1)));

/** Fake ML: billing words → confident BILLING; anything vague → low-confidence GENERAL. */
class FakeMl implements MlClient {
  async analyze(title: string, description: string): Promise<TicketAnalysis> {
    const billing = /payment|refund|invoice|charged/i.test(`${title} ${description}`);
    const confidence = billing ? 0.95 : 0.3;
    return {
      category: { label: billing ? "BILLING" : "GENERAL", confidence, scores: {} as never },
      priority: { label: "MEDIUM", confidence: 0.8, scores: {} as never },
      sentiment: { label: "NEGATIVE", score: 0.9, compound: -0.85 },
      embedding: vector(title.length),
      modelVersion: "test",
    };
  }
  async embed(texts: string[]) {
    return texts.map((t) => vector(t.length));
  }
  async health() {
    return true;
  }
}

const container = buildContainer({ ml: new FakeMl() });
const app = createApp(container);
const created: string[] = [];

async function login(email: string) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: "Demo@1234" });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeUndefined();
  const cookie = res.headers["set-cookie"]?.[0];
  expect(cookie).toBeTruthy();
  return cookie.split(";")[0];
}

let user: string, agent: string, admin: string;
beforeAll(async () => {
  [user, agent, admin] = await Promise.all([login("user@demo.com"), login("agent@demo.com"), login("admin@demo.com")]);
});
afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
  redis.disconnect();
});

describe("auth", () => {
  it("rejects wrong passwords without revealing whether the email exists", async () => {
    const a = await request(app).post("/api/v1/auth/login").send({ email: "user@demo.com", password: "wrong" });
    const b = await request(app).post("/api/v1/auth/login").send({ email: "nobody@demo.com", password: "wrong" });
    expect(a.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it("sets an httpOnly session cookie and never returns the token to JavaScript", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "user@demo.com", password: "Demo@1234" });
    expect(res.headers["set-cookie"][0]).toMatch(/si_token=.*HttpOnly/);
    expect(res.body.token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("reports whether Google sign-in is configured without exposing secrets", async () => {
    const res = await request(app).get("/api/v1/auth/providers");
    expect(res.status).toBe(200);
    expect(typeof res.body.google).toBe("boolean");
    expect(JSON.stringify(res.body)).not.toMatch(/client_secret|clientSecret/);
  });

  it("redirects gracefully when Google sign-in is not configured", async () => {
    const res = await request(app).get("/api/v1/auth/google").redirects(0);
    expect([302, 303]).toContain(res.status);
    // With no credentials the start route sends the browser back to the login page.
    expect(res.headers.location).toContain("error=google_unconfigured");
  });

  it("requires authentication", async () => {
    expect((await request(app).get("/api/v1/tickets")).status).toBe(401);
  });
});

describe("RBAC", () => {
  it("blocks customers from admin and agent endpoints", async () => {
    expect((await request(app).get("/api/v1/users").set("cookie", user)).status).toBe(403);
    expect((await request(app).get("/api/v1/review-queue").set("cookie", user)).status).toBe(403);
    expect((await request(app).get("/api/v1/analytics/overview").set("cookie", agent)).status).toBe(403);
    expect((await request(app).get("/api/v1/analytics/overview").set("cookie", admin)).status).toBe(200);
  });

  it("scopes ticket lists: customers only see their own tickets", async () => {
    const res = await request(app).get("/api/v1/tickets?pageSize=100").set("cookie", user);
    const me = await request(app).get("/api/v1/auth/me").set("cookie", user);
    expect(res.body.items.every((t: { createdBy: { id: string } }) => t.createdBy.id === me.body.user.id)).toBe(true);
  });

  it("hides other customers' tickets as not found", async () => {
    const other = await prisma.ticket.findFirst({ where: { createdBy: { email: { not: "user@demo.com" } } } });
    expect((await request(app).get(`/api/v1/tickets/${other!.id}`).set("cookie", user)).status).toBe(404);
  });
});

describe("ticket creation + ML triage", () => {
  it("validates input with field-level errors", async () => {
    const res = await request(app).post("/api/v1/tickets").set("cookie", user).send({ title: "x" });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details.fieldErrors)).toEqual(expect.arrayContaining(["title", "description"]));
  });

  it("routes a confident prediction straight to the owning team and an agent", async () => {
    const res = await request(app).post("/api/v1/tickets").set("cookie", user)
      .send({ title: "Refund not received", description: "I was charged but the refund never arrived." });
    expect(res.status).toBe(201);
    created.push(res.body.id);
    await container.triage.triage(res.body.id);

    const t = (await request(app).get(`/api/v1/tickets/${res.body.id}`).set("cookie", agent)).body;
    expect(t.triageStatus).toBe("COMPLETED");
    expect(t.category).toBe("BILLING");
    expect(t.assignedTeam.name).toBe("Billing & Payments");
    expect(t.assignedAgent).not.toBeNull();
    expect(t.reviewStatus).toBe("NOT_REQUIRED");
    // MEDIUM from the model, raised by the negative-sentiment rule.
    expect(t.priority).toBe("HIGH");
    expect(t.aiAnalysis.priority.trace[0].rule).toBe("negative-sentiment");
    expect(t.dueAt).not.toBeNull();
  });

  it("holds a low-confidence prediction for human review, then routes it after correction", async () => {
    const res = await request(app).post("/api/v1/tickets").set("cookie", user)
      .send({ title: "Something odd", description: "Not sure what is happening with things." });
    created.push(res.body.id);
    await container.triage.triage(res.body.id);

    let t = (await request(app).get(`/api/v1/tickets/${res.body.id}`).set("cookie", agent)).body;
    expect(t.reviewStatus).toBe("PENDING");
    expect(t.assignedAgent).toBeNull();
    const queue = (await request(app).get("/api/v1/review-queue?pageSize=100").set("cookie", agent)).body;
    expect(queue.items.some((q: { id: string }) => q.id === res.body.id)).toBe(true);

    const review = await request(app).post(`/api/v1/tickets/${res.body.id}/review`).set("cookie", agent)
      .send({ action: "CORRECT", category: "TECHNICAL", note: "It's a bug" });
    expect(review.status).toBe(200);
    t = (await request(app).get(`/api/v1/tickets/${res.body.id}`).set("cookie", agent)).body;
    expect(t.category).toBe("TECHNICAL");
    expect(t.reviewStatus).toBe("CORRECTED");
    expect(t.assignedTeam.name).toBe("Technical Support");
    expect(t.feedback[0]).toMatchObject({ predictedCategory: "GENERAL", correctedCategory: "TECHNICAL", accepted: false });
  });

  it("enforces the status state machine and records resolution", async () => {
    const id = created[0];
    const ok = await request(app).patch(`/api/v1/tickets/${id}`).set("cookie", agent).send({ status: "RESOLVED", resolution: "Refund issued" });
    expect(ok.status).toBe(200);
    expect(ok.body.resolvedAt).not.toBeNull();
    const bad = await request(app).patch(`/api/v1/tickets/${id}`).set("cookie", agent).send({ status: "WAITING_FOR_USER" });
    expect(bad.status).toBe(400);
    expect((await request(app).patch(`/api/v1/tickets/${id}`).set("cookie", user).send({ status: "CLOSED" })).status).toBe(403);
  });

  it("keeps internal notes away from customers", async () => {
    const id = created[0];
    await request(app).post(`/api/v1/tickets/${id}/comments`).set("cookie", agent).send({ body: "secret note", isInternal: true });
    const t = (await request(app).get(`/api/v1/tickets/${id}`).set("cookie", user)).body;
    expect(t.comments.some((c: { body: string }) => c.body === "secret note")).toBe(false);
  });
});

describe("chatbot → ticket escalation", () => {
  it("creates exactly one ticket from a conversation", async () => {
    const convo = (await request(app).post("/api/v1/conversations").set("cookie", user).send({})).body;
    const msg = await request(app).post(`/api/v1/conversations/${convo.id}/messages`).set("cookie", user)
      .send({ content: "zzqx unrelated qwerty topic" });
    expect(msg.body.assistantMessage.answerable).toBe(false);

    const t = await request(app).post(`/api/v1/conversations/${convo.id}/escalate`).set("cookie", user);
    expect(t.status).toBe(201);
    expect(t.body.source).toBe("CHATBOT");
    created.push(t.body.id);
    expect((await request(app).post(`/api/v1/conversations/${convo.id}/escalate`).set("cookie", user)).status).toBe(409);
    await prisma.conversation.delete({ where: { id: convo.id } });
  });

  it("doesn't let one user read another user's conversation", async () => {
    const convo = (await request(app).post("/api/v1/conversations").set("cookie", user).send({})).body;
    expect((await request(app).get(`/api/v1/conversations/${convo.id}`).set("cookie", agent)).status).toBe(404);
    await prisma.conversation.delete({ where: { id: convo.id } });
  });

  it("answers small talk conversationally and refuses to escalate it", async () => {
    const convo = (await request(app).post("/api/v1/conversations").set("cookie", user).send({})).body;
    for (const content of ["hi", "thanks!", "ok", "goodbye"]) {
      const res = await request(app).post(`/api/v1/conversations/${convo.id}/messages`).set("cookie", user).send({ content });
      expect(res.status).toBe(201);
      expect(res.body.assistantMessage.answerable).toBeNull();
      expect(res.body.assistantMessage.sources).toEqual([]);
    }
    const escalate = await request(app).post(`/api/v1/conversations/${convo.id}/escalate`).set("cookie", user);
    expect(escalate.status).toBe(400);
    await prisma.conversation.delete({ where: { id: convo.id } });
  });

  it("keeps an unanswered support question escalatable after a later 'ok'", async () => {
    const convo = (await request(app).post("/api/v1/conversations").set("cookie", user).send({})).body;
    await request(app).post(`/api/v1/conversations/${convo.id}/messages`).set("cookie", user)
      .send({ content: "zzqx unrelated qwerty topic" });
    const ok = await request(app).post(`/api/v1/conversations/${convo.id}/messages`).set("cookie", user).send({ content: "ok" });
    expect(ok.body.assistantMessage.answerable).toBeNull();

    const t = await request(app).post(`/api/v1/conversations/${convo.id}/escalate`).set("cookie", user);
    expect(t.status).toBe(201);
    created.push(t.body.id);
    // The small talk is filtered out: the ticket is about the real question, not "ok".
    expect(t.body.title.toLowerCase()).not.toBe("ok");
    await prisma.conversation.delete({ where: { id: convo.id } });
  });
});

describe("AI answer feedback", () => {
  it("stores helpful and negative feedback with a reason", async () => {
    const convo = (await request(app).post("/api/v1/conversations").set("cookie", user).send({})).body;
    const message = await prisma.message.create({
      data: { conversationId: convo.id, role: "ASSISTANT", content: "Refunds take 5–7 days [1].", answerable: true },
    });

    const helpful = await request(app).post(`/api/v1/conversations/${convo.id}/messages/${message.id}/feedback`)
      .set("cookie", user).send({ vote: "HELPFUL" });
    expect(helpful.status).toBe(200);
    expect(helpful.body.feedbackVote).toBe("HELPFUL");

    const negative = await request(app).post(`/api/v1/conversations/${convo.id}/messages/${message.id}/feedback`)
      .set("cookie", user).send({ vote: "NOT_HELPFUL", reason: "MISSING_INFORMATION" });
    expect(negative.status).toBe(200);
    expect(negative.body.feedbackReason).toBe("MISSING_INFORMATION");

    const stored = (await request(app).get(`/api/v1/conversations/${convo.id}`).set("cookie", user)).body.messages[0];
    expect(stored).toMatchObject({ feedbackVote: "NOT_HELPFUL", feedbackReason: "MISSING_INFORMATION" });
    expect(stored.feedbackById).toBeTruthy();

    // Negative feedback must carry a reason.
    const invalid = await request(app).post(`/api/v1/conversations/${convo.id}/messages/${message.id}/feedback`)
      .set("cookie", user).send({ vote: "NOT_HELPFUL" });
    expect(invalid.status).toBe(422);

    await prisma.conversation.delete({ where: { id: convo.id } });
  });

  it("doesn't allow rating small talk or another user's messages", async () => {
    const convo = (await request(app).post("/api/v1/conversations").set("cookie", user).send({})).body;
    const smallTalk = (await request(app).post(`/api/v1/conversations/${convo.id}/messages`).set("cookie", user).send({ content: "hi" })).body.assistantMessage;
    const res = await request(app).post(`/api/v1/conversations/${convo.id}/messages/${smallTalk.id}/feedback`)
      .set("cookie", user).send({ vote: "HELPFUL" });
    expect(res.status).toBe(400);

    const other = await request(app).post(`/api/v1/conversations/${convo.id}/messages/${smallTalk.id}/feedback`)
      .set("cookie", agent).send({ vote: "HELPFUL" });
    expect(other.status).toBe(404);

    await prisma.conversation.delete({ where: { id: convo.id } });
  });
});

describe("review queue guards", () => {
  it("rejects a repeated review and never overwrites a human correction", async () => {
    const id = created[1]; // reviewed as CORRECTED in the triage test
    const again = await request(app).post(`/api/v1/tickets/${id}/review`).set("cookie", agent)
      .send({ action: "ACCEPT" });
    expect(again.status).toBe(409);

    const reanalyze = await request(app).post(`/api/v1/tickets/${id}/reanalyze`).set("cookie", agent);
    expect(reanalyze.status).toBe(400);
    const t = (await request(app).get(`/api/v1/tickets/${id}`).set("cookie", agent)).body;
    expect(t.category).toBe("TECHNICAL");
    expect(t.reviewStatus).toBe("CORRECTED");
  });
});

describe("AI suggested replies", () => {
  it("drafts a reply without sending it, and regenerates on demand", async () => {
    const id = created[0];
    const before = (await request(app).get(`/api/v1/tickets/${id}`).set("cookie", agent)).body;
    const res = await request(app).post(`/api/v1/tickets/${id}/suggest-reply`).set("cookie", agent);
    expect(res.status).toBe(200);
    expect(res.body.text.length).toBeGreaterThan(40);
    expect(typeof res.body.generator).toBe("string");
    expect(Array.isArray(res.body.groundedIn)).toBe(true);
    expect(res.body.text).not.toMatch(/\[\d+\]/); // citation markers are for the assistant, not the customer

    const second = await request(app).post(`/api/v1/tickets/${id}/suggest-reply`).set("cookie", agent);
    expect(second.status).toBe(200);
    expect(second.body.text.length).toBeGreaterThan(40);

    const after = (await request(app).get(`/api/v1/tickets/${id}`).set("cookie", agent)).body;
    expect(after.comments.length).toBe(before.comments.length); // nothing was auto-sent
  });

  it("is staff-only", async () => {
    expect((await request(app).post(`/api/v1/tickets/${created[0]}/suggest-reply`).set("cookie", user)).status).toBe(403);
  });
});

describe("incident status transitions", () => {
  it("only allows the documented transitions and keeps resolvedAt in sync", async () => {
    const incident = await prisma.incident.create({
      data: { title: "Test incident", summary: "Transitions only", category: "TECHNICAL", severity: "HIGH", status: "OPEN" },
    });
    try {
      expect((await request(app).patch(`/api/v1/incidents/${incident.id}`).set("cookie", user).send({ status: "INVESTIGATING" })).status).toBe(403);

      const resolved = await request(app).patch(`/api/v1/incidents/${incident.id}`).set("cookie", agent).send({ status: "RESOLVED" });
      expect(resolved.status).toBe(200);
      expect(resolved.body.resolvedAt).toBeTruthy();

      // Resolved incidents can be reopened, but can't jump back to investigating.
      const invalid = await request(app).patch(`/api/v1/incidents/${incident.id}`).set("cookie", agent).send({ status: "INVESTIGATING" });
      expect(invalid.status).toBe(400);

      const reopened = await request(app).patch(`/api/v1/incidents/${incident.id}`).set("cookie", agent).send({ status: "OPEN" });
      expect(reopened.status).toBe(200);
      expect(reopened.body.resolvedAt).toBeNull();
    } finally {
      await prisma.incident.delete({ where: { id: incident.id } });
    }
  });
});
````

## Modified frontend files

### `frontend/tailwind.config.ts`

````ts
import type { Config } from "tailwindcss";

/**
 * Design tokens. A calm, cool workspace with one pine accent; priority and
 * status signals always pair colour with icon and text (never colour alone).
 *
 * Colours are CSS variables (see globals.css) so the same class names work in
 * both light and dark themes. `brand` is the filled-surface accent (buttons,
 * user bubbles); `pine-600` stays the accent for text and icons, which needs a
 * lighter value in dark mode than a filled button with white text does.
 */
const rgb = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: rgb("--paper"),
        surface: rgb("--surface"),
        ink: { DEFAULT: rgb("--ink"), soft: rgb("--ink-soft"), muted: rgb("--ink-muted"), faint: rgb("--ink-faint") },
        line: { DEFAULT: rgb("--line"), strong: rgb("--line-strong") },
        pine: {
          50: rgb("--pine-50"),
          100: rgb("--pine-100"),
          200: rgb("--pine-200"),
          500: rgb("--pine-500"),
          600: rgb("--pine-600"),
          700: rgb("--pine-700"),
          800: rgb("--pine-800"),
        },
        brand: { DEFAULT: rgb("--brand"), hover: rgb("--brand-hover") },
        danger: { DEFAULT: rgb("--danger"), hover: rgb("--danger-hover") },
        overlay: rgb("--overlay"),
        critical: { bg: rgb("--critical-bg"), fg: rgb("--critical-fg"), line: rgb("--critical-line") },
        high: { bg: rgb("--high-bg"), fg: rgb("--high-fg"), line: rgb("--high-line") },
        medium: { bg: rgb("--medium-bg"), fg: rgb("--medium-fg"), line: rgb("--medium-line") },
        low: { bg: rgb("--low-bg"), fg: rgb("--low-fg"), line: rgb("--low-line") },
        positive: { bg: rgb("--positive-bg"), fg: rgb("--positive-fg") },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: { DEFAULT: "6px", md: "8px", lg: "10px", xl: "14px" },
      boxShadow: {
        card: "0 1px 0 rgba(0,0,0,0.06)",
        pop: "0 12px 32px -8px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.12)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        "fill-bar": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "rise-in": "rise-in 220ms cubic-bezier(.2,.8,.2,1)",
        "fill-bar": "fill-bar 600ms cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
````

### `frontend/src/app/globals.css`

````css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --paper: 245 246 248;
    --surface: 255 255 255;
    --ink: 23 27 36;
    --ink-soft: 58 66 80;
    --ink-muted: 93 102 117;
    --ink-faint: 138 146 160;
    --line: 227 230 235;
    --line-strong: 205 210 218;
    --pine-50: 236 245 242;
    --pine-100: 211 233 225;
    --pine-200: 169 211 196;
    --pine-500: 42 134 112;
    --pine-600: 31 111 92;
    --pine-700: 24 90 75;
    --pine-800: 18 70 58;
    --brand: 31 111 92;
    --brand-hover: 24 90 75;
    --danger: 166 39 28;
    --danger-hover: 138 31 22;
    --overlay: 23 27 36;
    --critical-bg: 253 236 234;
    --critical-fg: 166 39 28;
    --critical-line: 244 197 192;
    --high-bg: 254 241 230;
    --high-fg: 168 72 8;
    --high-line: 247 210 179;
    --medium-bg: 251 245 225;
    --medium-fg: 122 92 0;
    --medium-line: 235 221 168;
    --low-bg: 238 242 246;
    --low-fg: 64 86 107;
    --low-line: 213 222 231;
    --positive-bg: 233 246 238;
    --positive-fg: 29 107 63;

    --chart-axis: #5d6675;
    --chart-grid: #eef0f3;
    --chart-label: #3a4250;
    --chart-cursor: rgba(23, 27, 36, 0.04);
    --chart-tooltip-bg: #ffffff;
    --chart-tooltip-border: #e3e6eb;
    --chart-tooltip-text: #171b24;
    --chart-created: #1f6f5c;
    --chart-created-fill: rgba(42, 134, 112, 0.22);
    --chart-resolved: #40566b;
    --chart-critical: #a6271c;
    --chart-high: #c4520a;
    --chart-medium: #b8900f;
    --chart-low: #6c8297;
    --chart-positive: #1d6b3f;
    --chart-neutral: #8a92a0;
    color-scheme: light;
  }

  .dark {
    --paper: 15 18 24;
    --surface: 22 26 33;
    --ink: 232 235 240;
    --ink-soft: 197 203 213;
    --ink-muted: 150 159 173;
    --ink-faint: 116 125 139;
    --line: 47 53 63;
    --line-strong: 66 74 86;
    --pine-50: 18 44 38;
    --pine-100: 25 63 54;
    --pine-200: 42 100 85;
    --pine-500: 63 179 152;
    --pine-600: 92 195 166;
    --pine-700: 124 212 187;
    --pine-800: 167 226 211;
    --brand: 38 122 103;
    --brand-hover: 46 143 120;
    --danger: 178 58 46;
    --danger-hover: 194 72 58;
    --overlay: 0 0 0;
    --critical-bg: 58 25 24;
    --critical-fg: 240 138 126;
    --critical-line: 94 43 38;
    --high-bg: 62 39 20;
    --high-fg: 240 165 94;
    --high-line: 95 60 31;
    --medium-bg: 56 48 22;
    --medium-fg: 227 197 92;
    --medium-line: 88 75 32;
    --low-bg: 34 42 51;
    --low-fg: 147 168 189;
    --low-line: 55 66 78;
    --positive-bg: 21 50 35;
    --positive-fg: 111 211 148;

    --chart-axis: #969fad;
    --chart-grid: #2f353f;
    --chart-label: #c5cbd5;
    --chart-cursor: rgba(255, 255, 255, 0.05);
    --chart-tooltip-bg: #161a21;
    --chart-tooltip-border: #2f353f;
    --chart-tooltip-text: #e8ebf0;
    --chart-created: #5cc3a6;
    --chart-created-fill: rgba(92, 195, 166, 0.22);
    --chart-resolved: #8fa8c4;
    --chart-critical: #f08a7e;
    --chart-high: #f0a55e;
    --chart-medium: #e3c55c;
    --chart-low: #93a8bd;
    --chart-positive: #6fd394;
    --chart-neutral: #969fad;
    color-scheme: dark;
  }

  html { -webkit-text-size-adjust: 100%; background-color: rgb(var(--paper)); }
  body { @apply bg-paper text-ink antialiased; font-feature-settings: "ss02"; }
  ::selection { @apply bg-pine-100 text-ink; }
  :focus-visible { @apply outline-none ring-2 ring-pine-500 ring-offset-2 ring-offset-paper; }
  h1, h2, h3 { @apply tracking-tight; }
}

@layer components {
  .card { @apply rounded-lg border border-line bg-surface shadow-card; }
  .field-input {
    @apply w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint
      transition-colors hover:border-ink-faint focus-visible:border-pine-600 focus-visible:ring-2 focus-visible:ring-pine-100 focus-visible:ring-offset-0
      disabled:cursor-not-allowed disabled:bg-paper aria-[invalid=true]:border-critical-fg;
  }
  .prose-chat p + p { @apply mt-2; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
````

### `frontend/src/app/layout.tsx`

````tsx
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: { default: "Relay: AI support & incident intelligence", template: "%s · Relay" },
  description: "AI triage, a knowledge-base assistant and incident detection for support teams.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1218" },
  ],
};

/**
 * Applies the saved theme before first paint so dark-mode users never see a
 * white flash. The same logic lives in use-theme.ts for later changes.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("relay-theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
````

### `frontend/src/app/page.tsx`

````tsx
import { ArrowRight, BookOpen, Radar, Workflow } from "lucide-react";
import Link from "next/link";
import { PriorityBadge } from "@/components/app/badges";
import { Logo } from "@/components/app/logo";

function HeroTriage() {
  return (
    <div className="card overflow-hidden text-sm" aria-label="Example of an incoming ticket being triaged">
      <div className="border-b border-line px-5 py-4">
        <p className="font-mono text-xs text-ink-muted">TCK-0042, new, 2 seconds ago</p>
        <p className="mt-1 font-medium">UPI payment failed at checkout</p>
        <p className="mt-1 text-ink-muted">Money was deducted from my bank but the order isn't confirmed. Third time today.</p>
      </div>
      <dl className="divide-y divide-line">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <dt className="text-ink-muted">Category</dt>
          <dd className="flex items-center gap-3"><span className="font-medium">Billing & payments</span>
            <span className="relative h-1.5 w-20 rounded-full bg-ink/[0.07]"><span className="absolute inset-y-0 left-0 w-[97%] origin-left animate-fill-bar rounded-full bg-pine-600" /></span>
            <span className="font-mono text-xs">97%</span></dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <dt className="text-ink-muted">Priority</dt>
          <dd className="flex items-center gap-1.5"><PriorityBadge priority="HIGH" /><ArrowRight className="h-3 w-3 text-ink-muted" aria-label="raised to" /><PriorityBadge priority="CRITICAL" /></dd>
        </div>
        <div className="px-5 py-3 text-xs text-ink-muted">Raised because 4 similar tickets arrived in the last 30 minutes.</div>
        <div className="flex items-center justify-between gap-4 bg-pine-50 px-5 py-3">
          <dt className="text-pine-800">Routed to</dt>
          <dd className="font-medium text-pine-800">Billing & Payments, Priya Sharma</dd>
        </div>
      </dl>
    </div>
  );
}

const FLOWS = [
  { icon: Workflow, title: "Triage that explains itself", body: "Each ticket is classified for category, priority and sentiment. Business rules adjust the model's call, and low-confidence predictions wait for an agent to confirm. Every decision is shown, never hidden." },
  { icon: BookOpen, title: "An assistant grounded in your docs", body: "Upload FAQs and policies. Answers come only from those documents, with sources. When the answer isn't there, the conversation becomes a ticket in one click." },
  { icon: Radar, title: "Incidents spotted early", body: "Similar tickets arriving close together are grouped into a potential incident, with the volume compared to a normal week, so one outage doesn't become fifty separate tickets." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link href="/login" className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">Sign in</Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <h1 className="max-w-xl text-[2.5rem] font-semibold leading-[1.08] text-ink sm:text-5xl">
              Every ticket read, ranked and routed before anyone opens it.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
              Relay is a support desk where machine learning does the sorting. Agents get the right tickets in the right order, and customers get answers from your own documentation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
                Open the demo <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a href="#how" className="inline-flex h-10 items-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-paper">See how it works</a>
            </div>
          </div>
          <HeroTriage />
        </section>

        <section id="how" className="border-t border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
            {FLOWS.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="h-5 w-5 text-pine-600" aria-hidden />
                <h2 className="mt-3 text-base font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-xl font-semibold">What happens to a ticket</h2>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Submitted", "From the web form, or summarised from a chat the assistant couldn't answer."],
              ["Analysed", "Category, priority and sentiment models run, and the text is embedded for similarity search."],
              ["Adjusted", "Rules raise priority for critical keywords, angry customers and repeated issues."],
              ["Routed", "Sent to the owning team's least busy agent, or held for review if confidence is low."],
              ["Learned from", "Agent corrections are stored as labelled feedback for the next model."],
            ].map(([t, d], i) => (
              <li key={t} className="bg-surface p-5">
                <span className="font-mono text-xs text-ink-muted">{i + 1}</span>
                <h3 className="mt-1 text-sm font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:justify-between sm:px-6">
          <span>Relay, an AI support & incident intelligence platform.</span>
          <span>Next.js, Express, FastAPI, PostgreSQL + pgvector, Redis</span>
        </div>
      </footer>
    </div>
  );
}
````

### `frontend/src/app/not-found.tsx`

````tsx
import Link from "next/link";
import { Logo } from "@/components/app/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold">This page doesn't exist</h1>
      <p className="mt-2 text-sm text-ink-muted">The link may be broken, or the page may have moved.</p>
      <Link href="/dashboard" className="mt-6 inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">Go to dashboard</Link>
    </main>
  );
}
````

### `frontend/src/app/login/page.tsx`

````tsx
"use client";
import { Headset, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import useSWR, { mutate } from "swr";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ApiError, api, fetcher } from "@/lib/api";

const DEMO = [
  { email: "user@demo.com", label: "Customer", detail: "Raise tickets and chat with the assistant", icon: UserRound },
  { email: "agent@demo.com", label: "Agent", detail: "Work the queue and review AI predictions", icon: Headset },
  { email: "admin@demo.com", label: "Admin", detail: "Analytics, knowledge base and incidents", icon: ShieldCheck },
];
const DEMO_PASSWORD = "Demo@1234";

const AUTH_ERRORS: Record<string, string> = {
  google_unconfigured: "Google sign-in isn't configured on this server. Use email and password instead.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again or use email and password.",
  google_state: "That Google sign-in link expired. Please try again.",
};

/** Same-origin destinations only: blocks //evil.com and backslash tricks. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/dashboard";
  return next;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden focusable="false">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.51h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.86Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const initialError = AUTH_ERRORS[params.get("error") ?? ""] ?? null;
  const { data: providers } = useSWR<{ google: boolean }>("/auth/providers", fetcher, { revalidateOnFocus: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function signIn(creds: { email: string; password: string }, key: string) {
    setLoading(key);
    setError(null);
    try {
      await api("/auth/login", { method: "POST", body: creds });
      await mutate("/auth/me");
      router.replace(safeNext(next));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign-in failed. Try again.");
      setLoading(null);
    }
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    signIn({ email, password }, "form");
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Relay home"><Logo /></Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">Use a demo account below, or your own credentials.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Field label="Email">{(p) => <Input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
            <Field label="Password">{(p) => <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
            {(error ?? initialError) && <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-sm text-critical-fg">{error ?? initialError}</p>}
            <Button type="submit" className="w-full" loading={loading === "form"} disabled={!email || !password}>Sign in</Button>
          </form>

          {providers?.google && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-line" aria-hidden />or<span className="h-px flex-1 bg-line" aria-hidden />
              </div>
              <a
                href={`/api/v1/auth/google${next ? `?next=${encodeURIComponent(safeNext(next))}` : ""}`}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:bg-paper"
              >
                <GoogleMark />Continue with Google
              </a>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center border-t border-line bg-surface px-4 py-10 sm:px-10 lg:border-l lg:border-t-0">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-sm font-semibold">Demo accounts</h2>
          <p className="mt-1 text-sm text-ink-muted">Each role sees a different part of the product. Password: <span className="font-mono">{DEMO_PASSWORD}</span></p>
          <ul className="mt-5 space-y-2">
            {DEMO.map(({ email: e, label, detail, icon: Icon }) => (
              <li key={e}>
                <button
                  onClick={() => signIn({ email: e, password: DEMO_PASSWORD }, e)}
                  disabled={!!loading}
                  className="flex w-full items-center gap-3 rounded-lg border border-line px-4 py-3 text-left transition-colors hover:border-pine-200 hover:bg-pine-50 disabled:opacity-60"
                >
                  <Icon className="h-5 w-5 shrink-0 text-pine-600" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Continue as {label.toLowerCase()}</span>
                    <span className="block truncate text-xs text-ink-muted">{detail}</span>
                  </span>
                  {loading === e && <span className="text-xs text-ink-muted">Signing in…</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
````

### `frontend/src/app/(app)/assistant/page.tsx`

````tsx
"use client";
import { clsx } from "clsx";
import { ArrowUp, Eraser, History, MessageSquarePlus, MessageSquareText, MoreHorizontal, Ticket, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ChatMessage, TypingIndicator } from "@/components/app/chat-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, fetcher } from "@/lib/api";
import { ticketRef, timeAgo } from "@/lib/format";
import type { Conversation, ConversationSummary, Message, TicketListItem } from "@/lib/types";

const STARTERS = ["How do I reset my password?", "I was charged twice, when do I get a refund?", "What is the API rate limit?", "Where is my data stored?"];

function ConversationList({ items, activeId, onSelect, onNew }: { items?: ConversationSummary[]; activeId: string | null; onSelect: (id: string) => void; onNew: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3"><Button variant="secondary" className="w-full" onClick={onNew}><MessageSquarePlus className="h-4 w-4" />New conversation</Button></div>
      <nav aria-label="Conversation history" className="flex-1 overflow-y-auto px-2 pb-3">
        {!items ? <div className="space-y-2 px-1">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          : !items.length ? <p className="px-2 py-4 text-sm text-ink-muted">No conversations yet.</p>
          : (
            <ul className="space-y-0.5">
              {items.map((c) => (
                <li key={c.id}>
                  <button onClick={() => onSelect(c.id)} aria-current={c.id === activeId ? "true" : undefined}
                    className={clsx("w-full rounded-md px-2.5 py-2 text-left", c.id === activeId ? "bg-paper ring-1 ring-line" : "hover:bg-paper/70")}>
                    <span className="block truncate text-sm">{c.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                      {timeAgo(c.updatedAt)}
                      {c.ticket && <span className="inline-flex items-center gap-0.5 text-pine-700"><Ticket className="h-3 w-3" aria-hidden />{ticketRef(c.ticket.number)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </nav>
    </div>
  );
}

function AssistantView() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("c");
  const list = useSWR<ConversationSummary[]>("/conversations", fetcher);
  const convo = useSWR<Conversation>(activeId ? `/conversations/${activeId}` : null, fetcher);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Message | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [confirm, setConfirm] = useState<"clear" | "delete" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyClose = useRef<HTMLButtonElement>(null);

  const messages = [...(convo.data?.messages ?? []), ...(pending ? [pending] : [])];
  useEffect(() => {
  bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
}, [messages.length, sendError]);

  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHistoryOpen(false);
    document.addEventListener("keydown", onKey);
    historyClose.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [historyOpen]);

  const select = (id: string | null) => {
    setHistoryOpen(false);
    setSendError(null);
    router.replace(id ? `/assistant?c=${id}` : "/assistant", { scroll: false });
  };

  async function send(text = input) {
    const content = text.trim();
    if (!content || pending) return;
    setSendError(null);
    setInput("");
    let id = activeId;
    try {
      if (!id) {
        id = (await api<{ id: string }>("/conversations", { method: "POST", body: {} })).id;
        router.replace(`/assistant?c=${id}`, { scroll: false });
      }
      setPending({ id: "pending", role: "USER", content, sources: null, answerable: null, feedbackVote: null, feedbackReason: null, createdAt: new Date().toISOString() });
      await api(`/conversations/${id}/messages`, { method: "POST", body: { content } });
      await Promise.all([convo.mutate(), list.mutate()]);
    } catch (e) {
      setInput(content);
      setSendError(e instanceof ApiError && e.status === 429 ? "You're sending messages too quickly. Wait a moment and try again." : e instanceof Error ? e.message : "The assistant couldn't respond.");
    } finally {
      setPending(null);
      inputRef.current?.focus();
    }
  }

  async function escalate() {
    if (!activeId) return;
    setEscalating(true);
    try {
      const t = await api<TicketListItem>(`/conversations/${activeId}/escalate`, { method: "POST" });
      await Promise.all([convo.mutate(), list.mutate()]);
      toast.success(`Ticket ${ticketRef(t.number)} created from this conversation`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the ticket");
    } finally {
      setEscalating(false);
    }
  }

  async function rate(m: Message, vote: "HELPFUL" | "NOT_HELPFUL", reason?: "INCORRECT" | "NOT_RELEVANT" | "MISSING_INFORMATION" | "OTHER") {
    if (!activeId) return;
    await api(`/conversations/${activeId}/messages/${m.id}/feedback`, {
      method: "POST",
      body: { vote, ...(reason ? { reason } : {}) },
    });
    await convo.mutate();
    toast.success(vote === "HELPFUL" ? "Marked as helpful" : "Thanks, we'll use this to improve answers");
  }

  async function runConfirm() {    if (!activeId || !confirm) return;
    try {
      if (confirm === "clear") {
        await api(`/conversations/${activeId}/messages`, { method: "DELETE" });
        await convo.mutate();
        toast.success("Conversation cleared");
      } else {
        await api(`/conversations/${activeId}`, { method: "DELETE" });
        select(null);
        toast.success("Conversation deleted");
      }
      await list.mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    }
    setConfirm(null);
  }

  const ticket = convo.data?.ticket;
  // Keep the escalation offer for the last genuine support question, even if the
  // customer follows the "no answer" with "ok" or "thanks". A later answered
  // support question replaces it; small talk never removes it.
  const lastSupportReply = [...messages].reverse().find((m) => m.role === "ASSISTANT" && m.answerable !== null);
  const escalateFor = !ticket && lastSupportReply?.answerable === false ? lastSupportReply.id : null;
  const escalateAction = (m: Message) =>
    m.id === escalateFor ? (
      <Button size="sm" onClick={escalate} loading={escalating}><Ticket className="h-4 w-4" />Create support ticket</Button>
    ) : undefined;

  const history = <ConversationList items={list.data} activeId={activeId} onSelect={select} onNew={() => select(null)} />;

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] sm:-mx-6 lg:-mx-8 lg:-my-8 lg:h-dvh">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface md:block">{history}</aside>
      {historyOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Conversation history">
          <div className="absolute inset-0 bg-overlay/50" onClick={() => setHistoryOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-rise-in bg-surface shadow-pop">
            <button ref={historyClose} onClick={() => setHistoryOpen(false)} className="absolute right-2 top-3 rounded p-1 hover:bg-ink/5" aria-label="Close history"><X className="h-4 w-4" /></button>
            <div className="pt-8 h-full">{history}</div>
          </div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col" aria-label="Conversation">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-paper/80 px-4 backdrop-blur">
          <button className="rounded-md p-1.5 hover:bg-ink/5 md:hidden" onClick={() => setHistoryOpen(true)} aria-label="Show conversation history"><History className="h-5 w-5" /></button>
          <MessageSquareText className="hidden h-4 w-4 text-pine-600 md:block" aria-hidden />
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{convo.data?.title ?? "AI assistant"}</h1>
          {ticket && <Link href={`/tickets/${ticket.id}`} className="inline-flex items-center gap-1 rounded bg-pine-50 px-2 py-1 text-xs font-medium text-pine-700 hover:bg-pine-100"><Ticket className="h-3.5 w-3.5" aria-hidden />{ticketRef(ticket.number)}</Link>}
          {activeId && convo.data && (
            <Menu label="Conversation options" trigger={<span className="flex rounded-md p-1.5 hover:bg-ink/5"><MoreHorizontal className="h-4 w-4" /></span>} items={[
              { label: "Clear messages", onSelect: () => setConfirm("clear"), icon: <Eraser className="h-4 w-4" aria-hidden /> },
              { label: "Delete conversation", onSelect: () => setConfirm("delete"), danger: true, icon: <Trash2 className="h-4 w-4" aria-hidden /> },
            ]} />
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6" aria-live="polite">
          <div className="mx-auto max-w-3xl space-y-5">
            {convo.error ? <ErrorState message="This conversation couldn't be loaded." onRetry={() => convo.mutate()} />
              : activeId && convo.isLoading ? <div className="space-y-4"><Skeleton className="ml-auto h-10 w-1/2" /><Skeleton className="h-24 w-3/4" /></div>
              : !messages.length ? (
                <EmptyState
                  icon={MessageSquareText}
                  title="Ask a question about the product"
                  description="Answers come only from the help documentation, with sources. If there's no answer, you can turn the chat into a ticket."
                  action={
                    <div className="flex max-w-lg flex-wrap justify-center gap-2">
                      {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink-soft hover:border-pine-200 hover:bg-pine-50">{s}</button>)}
                    </div>
                  }
                />
              ) : messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  m={m}
                  action={escalateAction(m)}
                  onFeedback={m.answerable === true ? (vote, reason) => rate(m, vote, reason) : undefined}
                />
              ))}
            {pending && <TypingIndicator />}
            {sendError && (
              <div role="alert" className="flex flex-col gap-2 rounded-lg border border-critical-line bg-critical-bg px-4 py-3 text-sm text-critical-fg sm:flex-row sm:items-center">
                <span className="flex-1">{sendError}</span>
                <Button size="sm" variant="secondary" onClick={() => send()}>Retry</Button>
              </div>
            )}
            <div ref={bottom} />
          </div>
        </div>

        <div className="shrink-0 border-t border-line bg-paper px-4 py-3">
          <form className="mx-auto flex max-w-3xl items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label htmlFor="chat-input" className="sr-only">Message the assistant</label>
            <textarea
              id="chat-input" ref={inputRef} rows={1} maxLength={2000} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about billing, your account, the API…"
              className="field-input max-h-40 min-h-[40px] flex-1 resize-none py-2.5"
            />
            <Button type="submit" className="h-10 w-10 shrink-0 px-0" disabled={!input.trim() || !!pending} aria-label="Send message"><ArrowUp className="h-4 w-4" /></Button>
          </form>
          <p className="mx-auto mt-1.5 max-w-3xl text-center text-xs text-ink-faint">Enter to send, Shift + Enter for a new line.</p>
        </div>
      </section>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} onConfirm={runConfirm} destructive
        title={confirm === "delete" ? "Delete this conversation?" : "Clear all messages?"}
        description={confirm === "delete" ? "The conversation is removed permanently. Tickets created from it are kept." : "The conversation stays in your history, but its messages are removed."}
        confirmLabel={confirm === "delete" ? "Delete conversation" : "Clear messages"}
      />
    </div>
  );
}

export default function AssistantPage() {
  return <Suspense><AssistantView /></Suspense>;
}
````

### `frontend/src/app/(app)/dashboard/page.tsx`

````tsx
"use client";
import { MessageSquareText, Plus, Ticket } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Stat } from "@/components/app/stat";
import { TicketList } from "@/components/app/ticket-list";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { fetcher } from "@/lib/api";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/format";
import type { Dashboard, FeedbackReason, Overview } from "@/lib/types";

// Charts are loaded on demand so recharts only ships to admins who see them.
const VolumeChart = dynamic(() => import("@/components/app/charts").then((m) => m.VolumeChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const CategoryChart = dynamic(() => import("@/components/app/charts").then((m) => m.CategoryChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const PriorityChart = dynamic(() => import("@/components/app/charts").then((m) => m.PriorityChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const SentimentChart = dynamic(() => import("@/components/app/charts").then((m) => m.SentimentChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const ConfidenceChart = dynamic(() => import("@/components/app/charts").then((m) => m.ConfidenceChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const FeedbackChart = dynamic(() => import("@/components/app/charts").then((m) => m.FeedbackChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });

function StatsSkeleton({ n }: { n: number }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: n }, (_, i) => <Skeleton key={i} className="h-[84px]" />)}</div>;
}

function UserDashboard({ d }: { d: Extract<Dashboard, { role: "USER" }> }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tickets" value={d.counts.open} href="/tickets" />
        <Stat label="Waiting on you" value={d.counts.waitingForYou} tone={d.counts.waitingForYou ? "warn" : "default"} hint={d.counts.waitingForYou ? "An agent asked for details" : undefined} href="/tickets?status=WAITING_FOR_USER" />
        <Stat label="High priority" value={d.counts.highPriority} />
        <Stat label="Resolved" value={d.counts.resolved} href="/tickets?status=RESOLVED" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader title="Recent tickets" action={<Link href="/tickets" className="text-sm font-medium text-pine-700 hover:underline">View all</Link>} />
          {d.recent.length ? <TicketList tickets={d.recent} showAssignee={false} /> : (
            <EmptyState icon={Ticket} title="You don't have any tickets yet." description="When something goes wrong, raise a ticket and we'll route it to the right team." action={<Link href="/tickets/new"><Button><Plus className="h-4 w-4" />Create ticket</Button></Link>} />
          )}
        </Card>
        <Card className="h-fit p-5">
          <MessageSquareText className="h-5 w-5 text-pine-600" aria-hidden />
          <h2 className="mt-3 text-[15px] font-semibold">Ask the assistant first</h2>
          <p className="mt-1 text-sm text-ink-muted">It answers from our help documentation with sources, and can turn the chat into a ticket if it can't help.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/assistant"><Button className="w-full">Open AI assistant</Button></Link>
            <Link href="/tickets/new"><Button variant="secondary" className="w-full">Create a ticket</Button></Link>
          </div>
        </Card>
      </div>
    </>
  );
}

function StaffCounts({ d }: { d: Extract<Dashboard, { role: "AGENT" | "ADMIN" }> }) {
  const c = d.counts;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <Stat label="Assigned to you" value={c.assigned} href="/tickets?scope=assigned" />
      <Stat label="Unassigned" value={c.unassigned} href="/tickets?scope=unassigned" />
      <Stat label="High priority open" value={c.highPriority} href="/tickets?priority=HIGH" />
      <Stat label="Needs review" value={c.reviewQueue} tone={c.reviewQueue ? "warn" : "default"} href="/review" />
      <Stat label="SLA breached" value={c.breached} tone={c.breached ? "danger" : "default"} hint={c.dueSoon ? `${c.dueSoon} due within 2h` : undefined} href="/tickets?sort=due" />
      <Stat label="Active incidents" value={c.activeIncidents} tone={c.activeIncidents ? "danger" : "default"} href="/incidents" />
    </div>
  );
}

function AgentQueue({ d }: { d: Extract<Dashboard, { role: "AGENT" | "ADMIN" }> }) {
  return (
    <Card className="mt-6">
      <CardHeader title="Your queue" description="Open tickets assigned to you, most urgent deadline first" action={<Link href="/tickets?scope=assigned" className="text-sm font-medium text-pine-700 hover:underline">View all</Link>} />
      {d.queue.length ? <TicketList tickets={d.queue} showRequester showAssignee={false} staff /> : (
        <EmptyState icon={Ticket} title="Your queue is clear" description="New tickets are routed to you automatically. Check unassigned tickets or the review queue in the meantime." action={<Link href="/review"><Button variant="secondary">Open review queue</Button></Link>} />
      )}
    </Card>
  );
}

const RANGES = [7, 30, 90] as const;
const REASON_LABEL: Record<FeedbackReason, string> = {
  INCORRECT: "Incorrect answer",
  NOT_RELEVANT: "Not relevant",
  MISSING_INFORMATION: "Missing information",
  OTHER: "Other",
};

function AdminAnalytics() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, error, isLoading, mutate } = useSWR<Overview>(`/analytics/overview?days=${days}`, fetcher, { keepPreviousData: true });
  if (error) return <Card className="mt-6"><ErrorState message={error.message} onRetry={() => mutate()} /></Card>;
  if (isLoading || !data) return <div className="mt-6 space-y-4"><StatsSkeleton n={4} /><Skeleton className="h-72" /></div>;
  const k = data.kpis;
  const rangeLabel = `last ${days} days`;
  const feedbackReasons = data.aiFeedback.reasons.filter((r) => r.key);

  return (
    <>
      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Platform overview</h2>
          <p className="mt-0.5 text-xs text-ink-muted">All figures are calculated from tickets and AI feedback in the selected range.</p>
        </div>
        <div role="group" aria-label="Date range" className="inline-flex rounded-md border border-line bg-surface p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${days === r ? "bg-paper text-ink shadow-card ring-1 ring-line" : "text-ink-muted hover:bg-paper hover:text-ink"}`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {!k.total && <Card className="mb-6 px-4 py-3 text-sm text-ink-muted sm:px-5">No tickets were created in this range. Try a longer date range.</Card>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Tickets" value={k.total} hint={rangeLabel} href="/tickets" />
        <Stat label="Open now" value={k.open} href="/tickets?status=OPEN" />
        <Stat label="Resolved" value={k.resolved} hint={`${k.resolutionRate}% resolution rate`} href="/tickets?status=RESOLVED" />
        <Stat label="Avg. resolution" value={k.avgResolutionHours != null ? `${k.avgResolutionHours}h` : "—"} hint="From ticket created to resolved" />
        <Stat label="SLA breached" value={k.slaBreached} tone={k.slaBreached ? "danger" : "default"} hint={`${k.slaBreachRate}% of tickets`} href="/tickets?sort=due" />
        <Stat label="High priority open" value={k.highPriority} href="/tickets?priority=HIGH" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="AI automation rate" value={`${k.automationRate}%`} hint="Routed with no human review" />
        <Stat label="Model agreement" value={k.feedbackCount ? `${k.modelAgreement}%` : "—"} hint={`${k.feedbackCount} agent review${k.feedbackCount === 1 ? "" : "s"}`} href="/review" />
        <Stat label="Helpful AI answers" value={k.answerFeedbackCount ? `${k.helpfulRate}%` : "—"} hint={k.answerFeedbackCount ? `${data.aiFeedback.helpful} of ${k.answerFeedbackCount} votes` : "No AI feedback yet"} />
        <Stat label="AI feedback" value={k.answerFeedbackCount} hint="👍 + 👎 on grounded answers" />
        <Stat label="Needs review" value={k.reviewQueue} tone={k.reviewQueue ? "warn" : "default"} href="/review" />
        <Stat label="Active incidents" value={k.activeIncidents} tone={k.activeIncidents ? "danger" : "default"} href="/incidents" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Ticket volume" description={`Created vs resolved, ${rangeLabel}`} action={<Link href="/tickets" className="text-sm font-medium text-pine-700 hover:underline">View tickets</Link>} />
          <div className="px-2 py-4 sm:px-4"><VolumeChart data={data.ticketsOverTime} /></div>
        </Card>
        <Card>
          <CardHeader title="Team workload" description="Open tickets per team (now)" />
          <ul className="divide-y divide-line">
            {data.teamWorkload.map((t) => {
              const max = Math.max(1, ...data.teamWorkload.map((x) => x.open));
              return (
                <li key={t.id} className="px-4 py-2.5 sm:px-5">
                  <div className="flex justify-between text-sm"><span>{t.name}</span><span className="font-mono text-ink-muted">{t.open}</span></div>
                  <div className="mt-1.5 h-1 rounded-full bg-ink/[0.06]"><div className="h-full rounded-full bg-pine-500" style={{ width: `${(t.open / max) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="By category" description="As classified by the model" action={<Link href="/tickets" className="text-sm font-medium text-pine-700 hover:underline">View tickets</Link>} />
          <div className="p-4"><CategoryChart data={data.byCategory} /></div>
          <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
            {data.byCategory.map((c) => (
              <Link key={c.key} href={`/tickets?category=${c.key}`} className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft hover:border-pine-200 hover:bg-pine-50">
                {CATEGORY_LABEL[c.key]} <span className="font-mono text-ink-muted">{c.count}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="By priority" description="After business rules" action={<Link href="/tickets?sort=priority" className="text-sm font-medium text-pine-700 hover:underline">View tickets</Link>} />
          <div className="p-4"><PriorityChart data={data.byPriority} /></div>
          <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
            {data.byPriority.map((p) => (
              <Link key={p.key} href={`/tickets?priority=${p.key}`} className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft hover:border-pine-200 hover:bg-pine-50">
                {PRIORITY_LABEL[p.key]} <span className="font-mono text-ink-muted">{p.count}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card><CardHeader title="Customer sentiment" /><div className="p-4"><SentimentChart data={data.bySentiment} /></div></Card>
        <Card>
          <CardHeader title="AI confidence" description="Triage confidence for analysed tickets" />
          <div className="px-2 py-4 sm:px-4"><ConfidenceChart data={data.aiConfidence} /></div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="AI answer feedback" description={`👍/👎 on grounded answers, ${rangeLabel}`} />
          <div className="grid gap-4 p-4 sm:grid-cols-[1fr_220px]">
            <FeedbackChart data={data.aiFeedback} />
            <div>
              <p className="text-xs font-medium text-ink-soft">Negative feedback reasons</p>
              {feedbackReasons.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {feedbackReasons.map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-3">
                      <span className="text-ink-muted">{r.key ? REASON_LABEL[r.key] : "Other"}</span>
                      <span className="font-mono text-ink">{r.count}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-ink-muted">No negative feedback in this range.</p>}
              <p className="mt-3 text-xs text-ink-faint">{data.aiFeedback.total ? `${data.aiFeedback.total} vote${data.aiFeedback.total === 1 ? "" : "s"} recorded.` : "Ask a question in the AI assistant and rate the answer to collect feedback."}</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useSession();
  const { data, error, isLoading, mutate } = useSWR<Dashboard>("/dashboard", fetcher, { refreshInterval: 30_000 });
  const first = user?.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hello, ${first}`}
        description={user?.role === "USER" ? "Here's where your support requests stand." : "Here's what needs attention right now."}
        actions={user?.role === "USER" ? <Link href="/tickets/new"><Button><Plus className="h-4 w-4" />New ticket</Button></Link> : undefined}
      />
      {error ? <Card><ErrorState message={error.message} onRetry={() => mutate()} /></Card>
        : isLoading || !data ? <><StatsSkeleton n={4} /><Card className="mt-6"><SkeletonRows /></Card></>
        : data.role === "USER" ? <UserDashboard d={data} />
        : <><StaffCounts d={data} />{data.role === "ADMIN" ? <AdminAnalytics /> : <AgentQueue d={data} />}</>}
    </>
  );
}
````

### `frontend/src/app/(app)/tickets/[id]/page.tsx`

````tsx
"use client";
import { ArrowLeft, Bot, ClipboardCheck, Radar, RefreshCw } from "lucide-react";
import Link from "next/link";
import { use, useRef, useState } from "react";
import useSWR from "swr";
import { CategoryTag, PriorityBadge, SentimentBadge, SlaBadge, StatusBadge } from "@/components/app/badges";
import { SuggestedReply } from "@/components/app/suggested-reply";
import { Timeline } from "@/components/app/timeline";
import { SimilarList, TriageReadout } from "@/components/app/triage-readout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/hooks/use-session";
import { api, fetcher } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABEL, PRIORITIES, PRIORITY_LABEL, STATUS_LABEL, dateTime, incidentRef, ticketRef } from "@/lib/format";
import type { Category, Priority, Ref, Role, TicketDetail, TicketStatus } from "@/lib/types";

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  WAITING_FOR_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
};

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2 py-2 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function ReviewModal({ ticket, open, onClose, onDone }: { ticket: TicketDetail; open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [category, setCategory] = useState<Category>(ticket.category ?? "GENERAL");
  const [priority, setPriority] = useState<Priority>(ticket.priority);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api(`/tickets/${ticket.id}/review`, { method: "POST", body: { action: "CORRECT", category, priority, note: note || undefined } });
      toast.success("Correction saved as training feedback");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the correction");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open} onClose={onClose} title="Correct the AI prediction"
      description="Your correction re-routes the ticket and is stored as labelled feedback for the next model."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save correction</Button></>}
    >
      <div className="space-y-4">
        <Field label="Category">{(p) => <Select {...p} value={category} onChange={(e) => setCategory(e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select>}</Field>
        <Field label="Priority">{(p) => <Select {...p} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((x) => <option key={x} value={x}>{PRIORITY_LABEL[x]}</option>)}</Select>}</Field>
        <Field label="Note" optional>{(p) => <Textarea {...p} rows={2} className="min-h-0" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why was the prediction wrong?" />}</Field>
      </div>
    </Modal>
  );
}

function ResolveModal({ open, onClose, onResolve }: { open: boolean; onClose: () => void; onResolve: (resolution: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      open={open} onClose={onClose} title="Resolve ticket" description="The customer sees this resolution note."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={text.trim().length < 3} loading={saving} onClick={async () => { setSaving(true); await onResolve(text.trim()); setSaving(false); onClose(); }}>Resolve ticket</Button></>}
    >
      <Field label="Resolution">{(p) => <Textarea {...p} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What fixed it?" />}</Field>
    </Modal>
  );
}

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isStaff } = useSession();
  const toast = useToast();
  const { data: t, error, isLoading, mutate } = useSWR<TicketDetail>(`/tickets/${id}`, fetcher, {
    refreshInterval: (d) => (d?.triageStatus === "PENDING" ? 1500 : 0),
  });
  const { data: agents } = useSWR<(Ref & { role: Role; teamId: string | null })[]>(isStaff ? "/agents" : null, fetcher);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  if (error) return <Card><ErrorState message={error.status === 404 ? "This ticket doesn't exist or you don't have access to it." : error.message} onRetry={() => mutate()} /></Card>;
  if (isLoading || !t) return <div className="space-y-4" role="status" aria-label="Loading ticket"><Skeleton className="h-6 w-40" /><Skeleton className="h-9 w-2/3" /><div className="grid gap-6 lg:grid-cols-[1fr_320px]"><Skeleton className="h-96" /><Skeleton className="h-72" /></div></div>;

  const update = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      await api(`/tickets/${t.id}`, { method: "PATCH", body });
      await mutate();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };
  const onStatus = (s: TicketStatus) => (s === "RESOLVED" ? setResolveOpen(true) : update({ status: s }, `Status changed to ${STATUS_LABEL[s].toLowerCase()}`));
  const acceptPrediction = async () => {
    setBusy(true);
    try {
      await api(`/tickets/${t.id}/review`, { method: "POST", body: { action: "ACCEPT" } });
      await mutate();
      toast.success("Prediction confirmed and ticket routed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't confirm");
    } finally {
      setBusy(false);
    }
  };
  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api(`/tickets/${t.id}/comments`, { method: "POST", body: { body: comment.trim(), isInternal: internal } });
      setComment("");
      await mutate();
      toast.success(internal ? "Internal note added" : "Reply sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't post the comment");
    } finally {
      setPosting(false);
    }
  };
  const reanalyze = async () => {
    setBusy(true);
    try {
      await api(`/tickets/${t.id}/reanalyze`, { method: "POST" });
      await mutate();
      toast.success("Re-running the ML pipeline");
    } catch (e) {
      // Show the real reason (e.g. a human review is final) instead of pretending it queued.
      toast.error(e instanceof Error ? e.message : "Couldn't re-run the analysis");
    } finally {
      setBusy(false);
    }
  };
  const useSuggestedReply = (text: string) => {
    setComment(text);
    setInternal(false);
    replyRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    replyRef.current?.focus();
  };

  return (
    <>
      <Link href="/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden />Tickets</Link>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-ink-muted">{ticketRef(t.number)}</span>
          <StatusBadge status={t.status} /><PriorityBadge priority={t.priority} />
          {t.source === "CHATBOT" && <span className="inline-flex items-center gap-1 text-xs text-pine-700"><Bot className="h-3.5 w-3.5" aria-hidden />From AI assistant</span>}
        </div>
        <h1 className="mt-2 text-2xl font-semibold leading-snug">{t.title}</h1>
      </div>

      {isStaff && t.reviewStatus === "PENDING" && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-high-line bg-high-bg px-4 py-3 sm:flex-row sm:items-center">
          <ClipboardCheck className="hidden h-5 w-5 shrink-0 text-high-fg sm:block" aria-hidden />
          <p className="flex-1 text-sm text-high-fg">
            The model is only {Math.round((t.mlConfidence ?? 0) * 100)}% sure this is <strong>{t.category ? CATEGORY_LABEL[t.category] : "uncategorised"}</strong>. Confirm or correct it to route the ticket.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setReviewOpen(true)}>Correct</Button>
            <Button size="sm" onClick={acceptPrediction} loading={busy}>Confirm</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="px-4 py-4 sm:px-5">
            <p className="text-[13px] text-ink-muted">{t.createdBy.name} wrote, {dateTime(t.createdAt)}</p>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">{t.description}</p>
            {t.resolution && (
              <div className="mt-4 rounded-md bg-positive-bg px-3 py-2 text-sm text-positive-fg"><span className="font-medium">Resolution: </span>{t.resolution}</div>
            )}
            {t.conversation && <p className="mt-3 text-xs text-ink-muted">Summarised by the AI from the chat "{t.conversation.title}".</p>}
          </Card>

          <Card>
            <CardHeader
              title="AI triage"
              description="How the ML prediction became this routing decision"
              action={isStaff && t.triageStatus !== "PENDING" ? (
                <div className="flex gap-1">
                  {t.reviewStatus !== "PENDING" && <Button size="sm" variant="ghost" onClick={() => setReviewOpen(true)}>Correct</Button>}
                  {t.reviewStatus !== "ACCEPTED" && t.reviewStatus !== "CORRECTED" && (
                    <Button size="sm" variant="ghost" onClick={reanalyze} loading={busy} aria-label="Re-run analysis" title="Re-run the ML analysis">
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                </div>
              ) : undefined}
            />
            <div className="px-4 pt-4 sm:px-5"><TriageReadout ticket={t} /></div>
          </Card>

          <section aria-labelledby="activity">
            <h2 id="activity" className="mb-3 text-[15px] font-semibold">Activity</h2>
            <Timeline comments={t.comments} activities={t.activities} />
            {t.status !== "CLOSED" ? (
              <Card className="mt-4 p-3">
                <label htmlFor="reply" className="sr-only">Write a reply</label>
                <Textarea id="reply" ref={replyRef} rows={3} className="min-h-[88px] border-0 px-1 shadow-none focus-visible:ring-0" placeholder={isStaff ? "Reply to the customer or add an internal note" : "Add a reply"} value={comment} onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(); }} />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  {isStaff ? (
                    <label className="flex items-center gap-2 text-sm text-ink-soft">
                      <input type="checkbox" className="h-4 w-4 accent-pine-600" checked={internal} onChange={(e) => setInternal(e.target.checked)} />Internal note
                    </label>
                  ) : <span className="text-xs text-ink-muted">Ctrl + Enter to send</span>}
                  <Button size="sm" onClick={postComment} loading={posting} disabled={!comment.trim()}>{internal ? "Add note" : "Send reply"}</Button>
                </div>
              </Card>
            ) : <p className="mt-4 text-sm text-ink-muted">This ticket is closed. Create a new ticket if the problem comes back.</p>}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="px-4 py-2">
            <dl className="divide-y divide-line">
              <Prop label="Status">
                {isStaff && TRANSITIONS[t.status].length ? (
                  <Select aria-label="Change status" value={t.status} disabled={busy} onChange={(e) => onStatus(e.target.value as TicketStatus)}>
                    {[t.status, ...TRANSITIONS[t.status]].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </Select>
                ) : <StatusBadge status={t.status} />}
              </Prop>
              <Prop label="Priority">
                {isStaff && t.status !== "CLOSED" ? (
                  <Select aria-label="Change priority" value={t.priority} disabled={busy} onChange={(e) => update({ priority: e.target.value }, "Priority updated")}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                  </Select>
                ) : <PriorityBadge priority={t.priority} />}
              </Prop>
              <Prop label="Assignee">
                {isStaff && t.status !== "CLOSED" ? (
                  <Select aria-label="Assign agent" value={t.assignedAgent?.id ?? ""} disabled={busy} onChange={(e) => update({ assignedAgentId: e.target.value || null }, e.target.value ? "Ticket assigned" : "Ticket unassigned")}>
                    <option value="">Unassigned</option>
                    {agents?.map((a) => <option key={a.id} value={a.id}>{a.name}{a.id === user?.id ? " (you)" : ""}</option>)}
                  </Select>
                ) : <span className="text-ink-soft">{t.assignedAgent?.name ?? "Not assigned yet"}</span>}
              </Prop>
              <Prop label="Team"><span className="text-ink-soft">{t.assignedTeam?.name ?? "—"}</span></Prop>
              <Prop label="Category"><CategoryTag category={t.category} /></Prop>
              <Prop label="Sentiment"><SentimentBadge sentiment={t.sentiment} /></Prop>
              <Prop label="SLA">{t.sla === "met" ? <span className="text-sm text-positive-fg">Met</span> : t.sla ? <SlaBadge sla={t.sla} dueAt={t.dueAt} /> : <span className="text-ink-faint">—</span>}</Prop>
              {isStaff && <Prop label="Requester"><span className="block truncate text-ink-soft">{t.createdBy.name}</span></Prop>}
            </dl>
            {isStaff && t.status !== "RESOLVED" && t.status !== "CLOSED" && (
              <div className="border-t border-line py-3"><Button className="w-full" onClick={() => setResolveOpen(true)}>Resolve ticket</Button></div>
            )}
          </Card>

          {isStaff && t.status !== "CLOSED" && (
            <SuggestedReply ticketId={t.id} onUse={useSuggestedReply} />
          )}

          {t.incident && (
            <Link href={`/incidents/${t.incident.id}`} className="card flex items-start gap-3 border-critical-line bg-critical-bg/60 px-4 py-3 hover:bg-critical-bg">
              <Radar className="mt-0.5 h-4 w-4 shrink-0 text-critical-fg" aria-hidden />
              <span className="min-w-0 text-sm">
                <span className="block font-medium text-critical-fg">Part of {incidentRef(t.incident.number)}</span>
                <span className="block truncate text-ink-soft">{t.incident.title}</span>
              </span>
            </Link>
          )}

          {isStaff && (
            <Card>
              <CardHeader title="Similar tickets" description="Nearest neighbours by embedding similarity" />
              <div className="px-4 py-1 sm:px-5"><SimilarList items={t.similar} /></div>
            </Card>
          )}

          {isStaff && t.feedback.length > 0 && (
            <Card className="px-4 py-3 text-sm sm:px-5">
              <h2 className="mb-2 text-[13px] font-semibold">Review history</h2>
              <ul className="space-y-1.5 text-ink-soft">
                {t.feedback.map((f) => (
                  <li key={f.id}>{f.reviewer.name} {f.accepted ? "confirmed the prediction" : `corrected ${f.predictedCategory ? CATEGORY_LABEL[f.predictedCategory] : "—"} to ${f.correctedCategory ? CATEGORY_LABEL[f.correctedCategory] : "—"}`}{f.note ? `: "${f.note}"` : ""}</li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      {isStaff && <ReviewModal key={`${t.id}-${t.category}-${t.priority}`} ticket={t} open={reviewOpen} onClose={() => setReviewOpen(false)} onDone={() => mutate()} />}
      <ResolveModal open={resolveOpen} onClose={() => setResolveOpen(false)} onResolve={(resolution) => update({ status: "RESOLVED", resolution }, "Ticket resolved")} />
    </>
  );
}
````

### `frontend/src/components/app/app-shell.tsx`

````tsx
"use client";
import { clsx } from "clsx";
import {
  BookOpen, ClipboardCheck, LayoutDashboard, LogOut, Menu as MenuIcon, MessageSquareText, Radar, Settings, Ticket, Users, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useSession } from "@/hooks/use-session";
import { ApiError, fetcher } from "@/lib/api";
import type { Dashboard, Role } from "@/lib/types";
import { Menu } from "../ui/menu";
import { Skeleton } from "../ui/states";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

interface NavItem { href: string; label: string; icon: typeof Ticket; roles: Role[]; badge?: "review" | "incidents" }
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["USER", "AGENT", "ADMIN"] },
  { href: "/tickets", label: "Tickets", icon: Ticket, roles: ["USER", "AGENT", "ADMIN"] },
  { href: "/assistant", label: "AI assistant", icon: MessageSquareText, roles: ["USER", "AGENT", "ADMIN"] },
  { href: "/review", label: "Review queue", icon: ClipboardCheck, roles: ["AGENT", "ADMIN"], badge: "review" },
  { href: "/incidents", label: "Incidents", icon: Radar, roles: ["AGENT", "ADMIN"], badge: "incidents" },
  { href: "/knowledge", label: "Knowledge base", icon: BookOpen, roles: ["ADMIN"] },
  { href: "/admin/users", label: "Users & teams", icon: Users, roles: ["ADMIN"] },
  { href: "/admin/settings", label: "AI settings", icon: Settings, roles: ["ADMIN"] },
];

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const staff = role !== "USER";
  const { data } = useSWR<Dashboard>(staff ? "/dashboard" : null, fetcher, { refreshInterval: 30_000 });
  const counts = data && data.role !== "USER" ? data.counts : undefined;
  return (
    <ul className="space-y-0.5">
      {NAV.filter((n) => n.roles.includes(role)).map(({ href, label, icon: Icon, badge }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const count = badge === "review" ? counts?.reviewQueue : badge === "incidents" ? counts?.activeIncidents : undefined;
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active ? "bg-surface font-medium text-ink shadow-card ring-1 ring-line" : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
              )}
            >
              <Icon className={clsx("h-4 w-4", active ? "text-pine-600" : "text-ink-muted")} aria-hidden />
              <span className="flex-1">{label}</span>
              {!!count && <span className="rounded bg-high-bg px-1.5 font-mono text-2xs font-medium text-high-fg" aria-label={`${count} pending`}>{count}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const ROLE_LABEL: Record<Role, string> = { USER: "Customer", AGENT: "Support agent", ADMIN: "Administrator" };

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading, error, logout } = useSession();
  const [drawer, setDrawer] = useState(false);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    drawerClose.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [drawer]);
  useEffect(() => {
    if (!error) return;
    // An expired or stale session cookie must be cleared server-side; otherwise the
    // middleware sees a cookie and keeps bouncing /login back to /dashboard.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      void logout();
      return;
    }
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [error, router, pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4"><Link href="/dashboard" aria-label="Relay home"><Logo /></Link></div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2.5 py-2">
        {user ? <NavLinks role={user.role} /> : <div className="space-y-2 px-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-7" />)}</div>}
      </nav>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        <span className="text-xs text-ink-muted">Theme</span>
        <ThemeToggle />
      </div>
      {user && (
        <div className="border-t border-line p-2.5">
          <Menu
            label="Account menu"
            align="start"
            trigger={
              <span className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-ink/[0.04]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-100 text-xs font-semibold text-pine-800" aria-hidden>
                  {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{user.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{ROLE_LABEL[user.role]}{user.team ? `, ${user.team.name}` : ""}</span>
                </span>
              </span>
            }
            items={[{ label: "Sign out", onSelect: logout, icon: <LogOut className="h-4 w-4" aria-hidden /> }]}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-60">
      <a href="#main" className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-paper lg:block">{sidebar}</aside>

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setDrawer(true)} className="rounded-md p-1.5 hover:bg-ink/5" aria-label="Open navigation" aria-expanded={drawer}>
          <MenuIcon className="h-5 w-5" />
        </button>
        <Logo />
        <div className="ml-auto"><ThemeToggle /></div>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-overlay/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-rise-in border-r border-line bg-paper shadow-pop">
            <button ref={drawerClose} onClick={() => setDrawer(false)} className="absolute right-3 top-3.5 rounded-md p-1 hover:bg-ink/5" aria-label="Close navigation"><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {isLoading || !user ? (
          <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-8 w-56" /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>
        ) : children}
      </main>
    </div>
  );
}
````

### `frontend/src/components/app/chat-message.tsx`

````tsx
"use client";
import { clsx } from "clsx";
import { Bot, ChevronDown, FileText, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import type { FeedbackReason, FeedbackVote, Message, Source } from "@/lib/types";

/** Renders [n] citation markers as accessible chips that jump to and open the source. */
function withCitations(text: string, messageId: string): ReactNode[] {
  const openSource = (ref: string) => {
    const el = document.getElementById(`src-${messageId}-${ref}`);
    if (el instanceof HTMLDetailsElement) el.open = true;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <Fragment key={i}>{part.replace(/\*\*(.+?)\*\*/g, "$1")}</Fragment>;
    return (
      <a
        key={i}
        href={`#src-${messageId}-${m[1]}`}
        onClick={() => openSource(m[1])}
        className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded bg-pine-100 px-1 font-mono text-2xs font-medium text-pine-800 no-underline hover:bg-pine-200"
        aria-label={`Open source ${m[1]}`}
      >
        {m[1]}
      </a>
    );
  });
}

/** Minimal, safe formatting for LLM output: paragraphs and bullet/numbered lists. */
function Formatted({ text, id }: { text: string; id: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="prose-chat space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
        if (isList) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={bi} className={clsx("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
              {lines.map((l, li) => <li key={li}>{withCitations(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), id)}</li>)}
            </Tag>
          );
        }
        return <p key={bi} className="whitespace-pre-wrap">{withCitations(block, id)}</p>;
      })}
    </div>
  );
}

const MATCH_LABEL = { semantic: "meaning", keyword: "keywords", hybrid: "meaning and keywords" } as const;

/** Retrieved documents only: title, section and an excerpt, never filesystem paths. */
function Sources({ sources, id }: { sources: Source[]; id: string }) {
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="mb-2 text-xs font-medium text-ink-muted">
        Sources, retrieved from the knowledge base
      </p>
      <ul className="space-y-1.5">
        {sources.map((s) => (
          <li key={s.ref} id={`src-${id}-${s.ref}`} className="rounded-md border border-line bg-paper/60 target:border-pine-200 target:bg-pine-50">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start gap-2 px-2.5 py-2 text-xs [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-pine-100 px-1 font-mono text-2xs font-medium text-pine-800">{s.ref}</span>
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug text-ink-soft">{s.documentTitle}</span>
                  <span className="mt-0.5 block text-ink-faint">
                    Section {s.chunkIndex + 1} · {Math.round(s.similarity * 100)}% match
                    {s.matchedBy ? ` · found by ${MATCH_LABEL[s.matchedBy]}` : ""}
                  </span>
                </span>
                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-line px-2.5 py-2">
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-muted">{s.snippet}{s.snippet.length >= 600 ? "…" : ""}</p>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

const REASONS: { value: FeedbackReason; label: string }[] = [
  { value: "INCORRECT", label: "Incorrect answer" },
  { value: "NOT_RELEVANT", label: "Not relevant" },
  { value: "MISSING_INFORMATION", label: "Missing information" },
  { value: "OTHER", label: "Other" },
];

/**
 * 👍/👎 on a grounded answer. Negative feedback asks for a short reason first;
 * small talk and "no answer" messages never render this control.
 */
function AnswerFeedback({ m, onFeedback }: { m: Message; onFeedback: (vote: FeedbackVote, reason?: FeedbackReason) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (vote: FeedbackVote, reason?: FeedbackReason) => {
    setBusy(true);
    setError(null);
    try {
      await onFeedback(vote, reason);
      setReasonsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your feedback");
    } finally {
      setBusy(false);
    }
  };

  const vote = m.feedbackVote;
  return (
    <div className="mt-3 border-t border-line pt-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-muted">{vote ? "Thanks for the feedback." : "Was this answer helpful?"}</span>
        <button
          type="button"
          onClick={() => send("HELPFUL")}
          disabled={busy}
          aria-pressed={vote === "HELPFUL"}
          aria-label="Helpful answer"
          title="Helpful"
          className={clsx("flex h-7 w-7 items-center justify-center rounded border transition-colors disabled:opacity-60",
            vote === "HELPFUL" ? "border-pine-200 bg-pine-50 text-pine-700" : "border-line text-ink-muted hover:bg-paper hover:text-ink")}
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setReasonsOpen((o) => !o)}
          disabled={busy}
          aria-pressed={vote === "NOT_HELPFUL"}
          aria-expanded={reasonsOpen}
          aria-label="Not helpful answer"
          title="Not helpful"
          className={clsx("flex h-7 w-7 items-center justify-center rounded border transition-colors disabled:opacity-60",
            vote === "NOT_HELPFUL" ? "border-critical-line bg-critical-bg text-critical-fg" : "border-line text-ink-muted hover:bg-paper hover:text-ink")}
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
        </button>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-muted" aria-hidden />}
        {vote === "NOT_HELPFUL" && m.feedbackReason && !reasonsOpen && (
          <span className="text-xs text-ink-faint">Reason: {REASONS.find((r) => r.value === m.feedbackReason)?.label ?? m.feedbackReason}</span>
        )}
      </div>
      {reasonsOpen && (
        <div className="mt-2 rounded-md border border-line bg-paper/60 p-2" role="group" aria-label="What was wrong with this answer?">
          <p className="mb-1.5 text-xs font-medium text-ink-soft">What was wrong?</p>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                disabled={busy}
                onClick={() => send("NOT_HELPFUL", r.value)}
                className="rounded-full border border-line-strong bg-surface px-2 py-1 text-xs text-ink-soft hover:border-pine-200 hover:bg-pine-50 disabled:opacity-60"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 text-xs text-critical-fg">{error}</p>}
    </div>
  );
}

export function ChatMessage({ m, action, onFeedback }: {
  m: Message;
  action?: ReactNode;
  onFeedback?: (vote: FeedbackVote, reason?: FeedbackReason) => Promise<void>;
}) {
  if (m.role === "USER") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-xl rounded-br-sm bg-brand px-3.5 py-2 text-sm leading-relaxed text-white sm:max-w-[75%]">{m.content}</p>
      </div>
    );
  }
  const rateable = m.answerable === true && typeof onFeedback === "function";
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface" aria-hidden><Bot className="h-4 w-4 text-pine-600" /></span>
      <div className={clsx("min-w-0 max-w-[90%] rounded-xl rounded-tl-sm border px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[80%]", m.answerable === false ? "border-medium-line bg-medium-bg/50" : "border-line bg-surface")}>
        <span className="sr-only">Assistant: </span>
        <Formatted text={m.content} id={m.id} />
        {!!m.sources?.length && <Sources sources={m.sources} id={m.id} />}
        {rateable && <AnswerFeedback m={m} onFeedback={onFeedback} />}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-2.5" role="status" aria-label="Assistant is searching the knowledge base">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface" aria-hidden><Bot className="h-4 w-4 text-pine-600" /></span>
      <div className="flex items-center gap-2 rounded-xl rounded-tl-sm border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-muted">
        <span className="flex gap-1" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" style={{ animationDelay: `${i * 150}ms` }} />)}</span>
        Searching the knowledge base
      </div>
    </div>
  );
}
````

### `frontend/src/components/app/charts.tsx`

````tsx
"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORY_LABEL, PRIORITY_LABEL, SENTIMENT_LABEL } from "@/lib/format";
import type { Overview } from "@/lib/types";

// Colours come from CSS variables so charts follow the light/dark theme.
const AXIS = { fontSize: 11, fill: "var(--chart-axis)" };
const tooltip = {
  contentStyle: {
    background: "var(--chart-tooltip-bg)",
    borderRadius: 8,
    border: "1px solid var(--chart-tooltip-border)",
    fontSize: 12,
    color: "var(--chart-tooltip-text)",
    boxShadow: "0 8px 24px -8px rgba(0,0,0,.35)",
  },
  labelStyle: { color: "var(--chart-tooltip-text)" },
  itemStyle: { color: "var(--chart-tooltip-text)" },
};

export function VolumeChart({ data }: { data: Overview["ticketsOverTime"] }) {
  const rows = data.map((d) => ({ ...d, label: new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) }));
  return (
    <div className="h-56" role="img" aria-label={`Tickets created and resolved per day over the selected ${data.length} days`}>
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltip} />
          <Area type="monotoneX" dataKey="created" name="Created" stroke="var(--chart-created)" fill="var(--chart-created-fill)" strokeWidth={1.8} />
          <Area type="monotoneX" dataKey="resolved" name="Resolved" stroke="var(--chart-resolved)" fill="transparent" strokeDasharray="4 3" strokeWidth={1.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function HBar({ data, colors, label }: { data: { name: string; count: number }[]; colors: string[]; label: string }) {
  return (
    <div style={{ height: Math.max(120, data.length * 34) }} role="img" aria-label={`${label}: ${data.map((d) => `${d.name} ${d.count}`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={118} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--chart-cursor)" }} />
          <Bar dataKey="count" name="Tickets" radius={[0, 4, 4, 0]} barSize={14} label={{ position: "right", fontSize: 11, fill: "var(--chart-label)" }}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ data }: { data: Overview["byCategory"] }) {
  const rows = [...data].sort((a, b) => b.count - a.count).map((d) => ({ name: CATEGORY_LABEL[d.key], count: d.count }));
  return <HBar data={rows} colors={["var(--chart-created)"]} label="Tickets by category" />;
}

export function PriorityChart({ data }: { data: Overview["byPriority"] }) {
  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
  const colors = { CRITICAL: "var(--chart-critical)", HIGH: "var(--chart-high)", MEDIUM: "var(--chart-medium)", LOW: "var(--chart-low)" };
  const rows = order.map((k) => ({ name: PRIORITY_LABEL[k], count: data.find((d) => d.key === k)?.count ?? 0 }));
  return <HBar data={rows} colors={order.map((k) => colors[k])} label="Tickets by priority" />;
}

export function SentimentChart({ data }: { data: Overview["bySentiment"] }) {
  const order = ["NEGATIVE", "NEUTRAL", "POSITIVE"] as const;
  const colors = { NEGATIVE: "var(--chart-critical)", NEUTRAL: "var(--chart-neutral)", POSITIVE: "var(--chart-positive)" };
  const rows = order.map((k) => ({ name: SENTIMENT_LABEL[k], count: data.find((d) => d.key === k)?.count ?? 0 }));
  return <HBar data={rows} colors={order.map((k) => colors[k])} label="Customer sentiment" />;
}

/** How confident the triage model was, for tickets the model actually classified. */
export function ConfidenceChart({ data }: { data: Overview["aiConfidence"] }) {
  return (
    <div className="h-44" role="img" aria-label={`AI confidence distribution: ${data.map((d) => `${d.bucket} ${d.count}`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="bucket" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--chart-cursor)" }} />
          <Bar dataKey="count" name="Tickets" fill="var(--chart-created)" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Helpful vs not-helpful votes on grounded AI answers. */
export function FeedbackChart({ data }: { data: Overview["aiFeedback"] }) {
  const rows = [{ name: "Helpful", count: data.helpful }, { name: "Not helpful", count: data.notHelpful }];
  return <HBar data={rows} colors={["var(--chart-positive)", "var(--chart-critical)"]} label="AI answer feedback" />;
}
````

### `frontend/src/components/ui/button.tsx`

````tsx
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-hover disabled:bg-brand/50",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-paper hover:border-ink-faint disabled:text-ink-faint",
  ghost: "text-ink-soft hover:bg-ink/5 hover:text-ink disabled:text-ink-faint",
  danger: "bg-danger text-white hover:bg-danger-hover disabled:opacity-50",
};
const sizes: Record<Size, string> = { sm: "h-8 px-2.5 text-[13px] gap-1.5", md: "h-9 px-3.5 text-sm gap-2" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
````

### `frontend/src/components/ui/modal.tsx`

````tsx
"use client";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Native <dialog>: focus trapping, Esc to close and inert background for free. */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-overlay/60 open:animate-rise-in"
    >
      <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
        <div>
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        <button onClick={onClose} className="-mr-1 rounded p-1 text-ink-muted hover:bg-ink/5 hover:text-ink" aria-label="Close dialog">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children && <div className="px-5 py-3">{children}</div>}
      {footer && <div className="flex flex-col-reverse gap-2 border-t border-line bg-paper/60 px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
    </dialog>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel, destructive, loading,
}: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: ReactNode; confirmLabel: string; destructive?: boolean; loading?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    />
  );
}
````

### `frontend/src/lib/types.ts`

````ts
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
````
