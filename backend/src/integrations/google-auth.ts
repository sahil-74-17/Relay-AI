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
