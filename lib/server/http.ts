import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    const response = Response.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
    if (error.status === 429 && typeof error.details === "object" && error.details && "retryAfterSeconds" in error.details) {
      const seconds = (error.details as { retryAfterSeconds?: unknown }).retryAfterSeconds;
      if (typeof seconds === "number") response.headers.set("Retry-After", String(seconds));
    }
    return response;
  }
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "SCHEMA_VALIDATION_FAILED",
          message: "The request or generated data did not match the required schema.",
          details: error.issues,
        },
      },
      { status: 422 },
    );
  }
  console.error(error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please retry." } },
    { status: 500 },
  );
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new AppError("INVALID_ORIGIN", "This request did not come from Folveta.", 403);
  }
}
