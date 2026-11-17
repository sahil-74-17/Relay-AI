export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
  }
}
export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(422, "VALIDATION_ERROR", "Some fields are invalid", details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Sign in to continue") {
    super(401, "UNAUTHORIZED", message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do this") {
    super(403, "FORBIDDEN", message);
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, "NOT_FOUND", `${resource} not found`);
  }
}
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, "CONFLICT", message, details);
  }
}
export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(503, "SERVICE_UNAVAILABLE", `${service} is unavailable. Try again shortly.`);
  }
}
