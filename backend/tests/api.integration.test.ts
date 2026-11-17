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

describe("password reset", () => {
  const email = `reset-${Date.now()}@example.com`;
  const oldPassword = "OldPass123";
  const newPassword = "NewPass456";

  beforeAll(async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ name: "Reset Tester", email, password: oldPassword });
    expect(res.status).toBe(201);
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  async function requestLink(target = email) {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: target });
    expect(res.status).toBe(200);
    expect(res.body.delivery).toBe("dev");
    const token = new URL(res.body.resetUrl).searchParams.get("token");
    expect(token).toBeTruthy();
    return token!;
  }

  it("returns a development reset link instead of pretending an email was sent", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email });
    expect(res.status).toBe(200);
    expect(res.body.delivery).toBe("dev");
    expect(res.body.resetUrl).toContain("/reset-password?token=");
    expect(res.body.resetUrl).toContain("http://localhost:3000");
  });

  it("resets the password once, then refuses to reuse the token", async () => {
    const token = await requestLink();

    const weak = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "short" });
    expect(weak.status).toBe(422);

    const reset = await request(app).post("/api/v1/auth/reset-password").send({ token, password: newPassword });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app).post("/api/v1/auth/login").send({ email, password: oldPassword });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/api/v1/auth/login").send({ email, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.headers["set-cookie"][0]).toMatch(/si_token=.*HttpOnly/);

    const reused = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "Another789" });
    expect(reused.status).toBe(400);
    expect(reused.body.error.message).toMatch(/invalid or has expired/i);
  });

  it("rejects an expired token", async () => {
    const token = await requestLink();
    await prisma.user.update({ where: { email }, data: { passwordResetExpiresAt: new Date(Date.now() - 60_000) } });
    const res = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "Expired123" });
    expect(res.status).toBe(400);
  });

  it("answers identically for unknown emails (no account enumeration)", async () => {
    const known = await request(app).post("/api/v1/auth/forgot-password").send({ email });
    const unknown = await request(app).post("/api/v1/auth/forgot-password").send({ email: `nobody-${Date.now()}@example.com` });
    expect(known.status).toBe(unknown.status);
    expect(known.body.delivery).toBe(unknown.body.delivery);
    expect(typeof known.body.resetUrl).toBe(typeof unknown.body.resetUrl);
  });

  it("keeps normal email/password login working for untouched accounts", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "user@demo.com", password: "Demo@1234" });
    expect(res.status).toBe(200);
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
