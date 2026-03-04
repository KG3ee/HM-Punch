# Security Snapshot - ON:OFF (Modern Punch)

**Date**: 2026-03-04  
**Scope**: current codebase in `modern-punch` (API + Web)

This file is a current-state snapshot, not a historical report.

## Security Controls Already Present

1. Role-based route access is enforced on admin/leader-only APIs via `JwtAuthGuard` + `RolesGuard`.
2. JWT secret handling is strict in production:
   - `JWT_SECRET` is required outside dev/test.
   - minimum length enforcement for non-dev env.
3. Login and registration request endpoints have basic POST rate limiting in API.
4. Auth cookie is `httpOnly`, with configurable `SameSite` and `Secure`.
5. Registration requests and approval workflow are gated behind admin review.

## Current Gaps (Actionable)

### High
1. Token persists in browser localStorage (`apps/web/src/lib/auth.ts`), which increases XSS impact.
   - Recommended: move to cookie-only auth flow on web and remove localStorage bearer token usage.

### Medium
1. CSRF protection is not implemented for state-changing cookie-auth requests.
2. Password policy is still minimal (6-char checks on user password change/register flow).
3. No login lockout/backoff per account after repeated invalid credentials.
4. API rate limiter is in-memory and keyed by `x-forwarded-for`, which is weak for distributed deployment and spoof-prone if proxy chain is misconfigured.
5. Security headers (for example via `helmet`) are not explicitly configured in Nest bootstrap.

### Low
1. No explicit HTTPS redirect/HSTS handling in app code (assumes platform TLS at edge).
2. Some user fields (for example contact/vehicle info) are broadly selectable in admin/user payloads and should be reviewed per role.

## Priority Fix Order
1. Remove localStorage token dependency from web auth.
2. Add CSRF protection strategy for cookie-auth POST/PUT/PATCH/DELETE.
3. Strengthen password policy + add auth lockout/backoff.
4. Replace in-memory rate limiting with shared store (Redis/Upstash) for production.
5. Add security headers middleware and document trusted proxy assumptions.
