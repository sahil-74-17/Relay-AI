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
