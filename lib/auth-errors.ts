type AuthErrorLike = {
  name?: string;
  code?: string;
};

const INVALID_SESSION_CODES = new Set([
  "bad_jwt",
  "invalid_jwt",
  "invalid_refresh_token",
  "jwt_expired",
  "refresh_token_already_used",
  "refresh_token_not_found",
  "session_not_found",
  "user_not_found",
]);

export function isInvalidAuthSessionError(error: AuthErrorLike) {
  return error.name === "AuthSessionMissingError"
    || (typeof error.code === "string" && INVALID_SESSION_CODES.has(error.code));
}
