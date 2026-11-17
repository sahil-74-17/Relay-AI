import type { Role } from "../generated/prisma/enums";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  teamId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}
