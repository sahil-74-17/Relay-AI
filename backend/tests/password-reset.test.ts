import { describe, expect, it, vi } from "vitest";
import { createResetToken, hashResetToken, PASSWORD_RESET_TTL_MINUTES, resetExpiry } from "../src/domain/password-reset";
import { mailConfigured } from "../src/integrations/mailer";
import type { UserRepository } from "../src/repositories/user.repository";
import { AuthService } from "../src/services/auth.service";

const account = { id: "u1", email: "person@example.com", isActive: true } as const;

function repo() {
  return {
    findByEmail: vi.fn().mockResolvedValue(account),
    setPasswordReset: vi.fn().mockResolvedValue({ id: account.id }),
    consumePasswordReset: vi.fn().mockResolvedValue(true),
  } as unknown as UserRepository;
}

describe("password reset service", () => {
  it("stores a hashed token and returns a development link when email is not configured", async () => {
    const users = repo();
    const res = await new AuthService(users).requestPasswordReset(account.email);
    expect(res.delivery).toBe("dev");
    expect(res.resetUrl).toContain("/reset-password?token=");
    expect(users.setPasswordReset).toHaveBeenCalledWith(
      account.id,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
  });

  it("emails the link when SMTP is configured and never exposes it in the response", async () => {
    const users = repo();
    const sendPasswordReset = vi.fn().mockResolvedValue(undefined);
    const res = await new AuthService(users, { sendPasswordReset }).requestPasswordReset(account.email);
    expect(res).toEqual({ delivery: "email" });
    expect(sendPasswordReset).toHaveBeenCalledWith(account.email, expect.stringContaining("/reset-password?token="));
  });

  it("does not send email for an unknown or deactivated account", async () => {
    const users = repo();
    (users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ ...account, isActive: false });
    const sendPasswordReset = vi.fn();
    const res = await new AuthService(users, { sendPasswordReset }).requestPasswordReset(account.email);
    expect(res).toEqual({ delivery: "email" });
    expect(sendPasswordReset).not.toHaveBeenCalled();
    expect(users.setPasswordReset).not.toHaveBeenCalled();
  });

  it("surfaces email failures instead of pretending the mail was sent", async () => {
    const users = repo();
    const sendPasswordReset = vi.fn().mockRejectedValue(new Error("smtp down"));
    await expect(new AuthService(users, { sendPasswordReset }).requestPasswordReset(account.email)).rejects.toMatchObject({
      status: 503,
      code: "EMAIL_UNAVAILABLE",
    });
  });

  it("rejects an unknown, expired or already-used token", async () => {
    const users = repo();
    (users.consumePasswordReset as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    await expect(new AuthService(users).resetPassword(createResetToken(), "NewPass123")).rejects.toMatchObject({ status: 400 });
  });

  it("hashes the new password on reset", async () => {
    const users = repo();
    const res = await new AuthService(users).resetPassword(createResetToken(), "NewPass123");
    expect(res.message).toMatch(/updated/i);
    const hash = (users.consumePasswordReset as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(hash).toMatch(/^\$2[aby]\$/);
  });
});

describe("password reset tokens", () => {
  it("creates URL-safe tokens and stores only a hash", () => {
    const token = createResetToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(createResetToken()).not.toBe(token);
    const hash = hashResetToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashResetToken(token)).toBe(hash);
  });

  it("expires after the configured window", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(resetExpiry(now).getTime() - now.getTime()).toBe(PASSWORD_RESET_TTL_MINUTES * 60_000);
  });

  it("reports email as configured only when an SMTP host is set", () => {
    expect(mailConfigured({})).toBe(false);
    expect(mailConfigured({ SMTP_HOST: "" })).toBe(false);
    expect(mailConfigured({ SMTP_HOST: "smtp.example.com" })).toBe(true);
  });
});
