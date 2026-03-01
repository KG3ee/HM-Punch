const DEFAULT_AUTH_SESSION_DAYS = 30;
const MIN_AUTH_SESSION_DAYS = 1;
const MAX_AUTH_SESSION_DAYS = 365;

export function resolveAuthSessionDays(): number {
  const raw = process.env.AUTH_SESSION_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_AUTH_SESSION_DAYS;
  }

  return Math.min(
    MAX_AUTH_SESSION_DAYS,
    Math.max(MIN_AUTH_SESSION_DAYS, parsed),
  );
}

export function resolveAuthSessionMaxAgeMs(): number {
  return resolveAuthSessionDays() * 24 * 60 * 60 * 1000;
}

export function resolveAuthSessionTtlSeconds(): number {
  return resolveAuthSessionDays() * 24 * 60 * 60;
}
