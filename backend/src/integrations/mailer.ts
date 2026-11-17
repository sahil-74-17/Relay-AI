import nodemailer from "nodemailer";
import type { Env } from "../config/env";

export type MailConfig = Pick<Env, "SMTP_HOST" | "SMTP_PORT" | "SMTP_SECURE" | "SMTP_USER" | "SMTP_PASS" | "SMTP_FROM">;

export interface Mailer {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
}

/** SMTP is optional; the reset flow falls back to a development-only link. */
export const mailConfigured = (cfg: Partial<MailConfig>): boolean => !!cfg.SMTP_HOST;

export function createMailer(cfg: MailConfig): Mailer | null {
  if (!mailConfigured(cfg)) return null;

  const transport = nodemailer.createTransport({
    host: cfg.SMTP_HOST!,
    port: cfg.SMTP_PORT,
    secure: cfg.SMTP_SECURE,
    auth: cfg.SMTP_USER ? { user: cfg.SMTP_USER, pass: cfg.SMTP_PASS ?? "" } : undefined,
  });

  return {
    async sendPasswordReset(to, resetUrl) {
      await transport.sendMail({
        from: cfg.SMTP_FROM,
        to,
        subject: "Reset your Relay password",
        text: [
          "We received a request to reset your Relay password.",
          "",
          `Reset it here (valid for 30 minutes, single use): ${resetUrl}`,
          "",
          "If you didn't request this, you can ignore this email; your password stays unchanged.",
        ].join("\n"),
        html: `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f6f8;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1b2430">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #dde2e8;border-radius:10px;padding:28px">
    <p style="margin:0 0 18px;font-size:16px;font-weight:600">Reset your Relay password</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.6">We received a request to reset your Relay password. This link is valid for <strong>30 minutes</strong> and can be used once.</p>
    <p style="margin:0 0 22px"><a href="${resetUrl}" style="display:inline-block;background:#1f6f5c;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:6px">Set a new password</a></p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#5b6773">If you didn't request this, you can ignore this email; your password stays unchanged.</p>
  </div>
</body></html>`,
      });
    },
  };
}
