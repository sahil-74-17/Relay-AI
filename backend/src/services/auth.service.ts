import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { createResetToken, hashResetToken, resetExpiry } from "../domain/password-reset";
import type { GoogleProfile } from "../integrations/google-auth";
import type { Mailer } from "../integrations/mailer";
import { signToken } from "../middleware/auth";
import type { UserRepository } from "../repositories/user.repository";
import { AppError, BadRequestError, ConflictError, UnauthorizedError } from "../utils/errors";
import type { LoginDto, RegisterDto } from "../validators/auth.validators";

const BCRYPT_ROUNDS = 10;

export interface ResetRequestResult {
  delivery: "email" | "dev";
  /** Only present in the development fallback, never when email is configured. */
  resetUrl?: string;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly mailer: Mailer | null = null,
  ) {}

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

  /**
   * Starts a password reset. The response shape is identical for known and
   * unknown emails, so this endpoint cannot be used to enumerate accounts.
   */
  async requestPasswordReset(email: string): Promise<ResetRequestResult> {
    const user = await this.users.findByEmail(email);
    const token = createResetToken();
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    // Development fallback: hand back the link, clearly labelled by the API,
    // instead of claiming an email was sent.
    if (!this.mailer) {
      if (env.NODE_ENV === "production") {
        throw new AppError(503, "EMAIL_UNAVAILABLE", "Password reset email is not configured on this server. Contact your administrator.");
      }
      if (user?.isActive) {
        await this.users.setPasswordReset(user.id, hashResetToken(token), resetExpiry());
      }
      return { delivery: "dev", resetUrl };
    }

    if (user?.isActive) {
      await this.users.setPasswordReset(user.id, hashResetToken(token), resetExpiry());
      try {
        await this.mailer.sendPasswordReset(user.email, resetUrl);
      } catch (err) {
        logger.error({ err }, "Password reset email failed");
        throw new AppError(503, "EMAIL_UNAVAILABLE", "We couldn't send the reset email. Please try again shortly.");
      }
    }
    return { delivery: "email" };
  }

  /** Validates, consumes and invalidates a reset token in one atomic update. */
  async resetPassword(token: string, password: string) {
    const consumed = await this.users.consumePasswordReset(hashResetToken(token), await AuthService.hashPassword(password));
    if (!consumed) throw new BadRequestError("This reset link is invalid or has expired. Request a new one.");
    return { message: "Your password has been updated. Sign in with your new password." };
  }

  me(userId: string) {
    return this.users.findById(userId);
  }
}
