import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE } from "../config/constants";
import { env } from "../config/env";
import type { Role } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";

interface TokenPayload {
  sub: string;
  role: Role;
}

export const signToken = (userId: string, role: Role): string =>
  jwt.sign({ sub: userId, role } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.[AUTH_COOKIE];
}

/** Verifies the JWT and loads the user, so deactivated users lose access immediately. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError();
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      throw new UnauthorizedError("Your session has expired. Sign in again.");
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, teamId: true, isActive: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedError("This account is not active");
    const { isActive: _ignored, ...authUser } = user;
    req.user = authUser;
    next();
  } catch (err) {
    next(err);
  }
}

/** RBAC guard: allows only the given roles. */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };

/** Narrowing helper for controllers behind `authenticate`. */
export function currentUser(req: Request) {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
