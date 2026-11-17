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
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "../validators/auth.validators";

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

  forgotPassword: asyncHandler(async (_req, res) => {
    res.json(await auth.requestPasswordReset(dto(res, "body", forgotPasswordSchema).email));
  }),

  resetPassword: asyncHandler(async (_req, res) => {
    const { token, password } = dto(res, "body", resetPasswordSchema);
    res.json(await auth.resetPassword(token, password));
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
