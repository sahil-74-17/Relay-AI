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
