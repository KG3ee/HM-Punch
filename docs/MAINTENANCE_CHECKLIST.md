# ON:OFF Maintenance Checklist

Use this checklist when asked: "run maintenance for me".

## Modes
- `light` (fast): health + auth + key route checks
- `standard` (default): light + build + lint + core duty flow checks
- `full`: standard + extended admin/report checks

## 0) Preconditions
- Confirm target environment (`production` by default).
- Confirm API URL and web URL.
- Confirm DB connectivity (Neon/Postgres) and migration state.

## 1) Platform Health
- [ ] API health endpoint responds (`/health`).
- [ ] Web home/login loads without fatal errors.
- [ ] Vercel logs show no sustained 5xx spikes.
- [ ] DB connection is healthy (no Prisma init/migration lock errors).

## 2) Core User Flows
- [ ] Login works.
- [ ] Duty ON works.
- [ ] Duty OFF works.
- [ ] Break start/end works.
- [ ] Break over-limit warning appears correctly (session scope).
- [ ] Offline queue sync works after reconnect (ON/OFF + break actions).
- [ ] Current status/summary updates correctly.

## 3) Core Admin Flows
- [ ] Admin login works.
- [ ] User/team management pages load.
- [ ] Registration request approve/reject works.
- [ ] Shift presets + assignments page loads and saves.
- [ ] Live board endpoint/page loads.
- [ ] Monthly snapshot/report page loads.
- [ ] Requests page tabs load: shift, driver, violation.
- [ ] Violation finalization and points table load.

## 4) Regression Commands (local)
Run in `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch`.

```bash
npm run build
npm run lint
```

Optional targeted API build:
```bash
npm run build --workspace @modern-punch/api
```

## 5) Job/Cron Checks
- [ ] Internal job endpoints reachable with correct `x-job-secret`.
- [ ] Daily job path executes without DB/auth failure.
- [ ] `auto-close-breaks` works.
- [ ] `auto-close-stale-duty` works.

## 6) Result Report Template
- Status: `pass` / `degraded` / `fail`
- Scope run: `light|standard|full`
- Findings:
  - `P0`:
  - `P1`:
  - `P2`:
- Recommended next actions:
  1.
  2.

## Full Mode Add-ons
- [ ] Playwright smoke on mobile + desktop views.
- [ ] Overnight/on-shift edge cases for duty transitions.
- [ ] Midnight-crossing break quota behavior (must stay per duty session).
- [ ] Report generation consistency checks.
- [ ] Notification checks:
  - [ ] In-app bell unread count updates
  - [ ] Web Push delivers when enabled (VAPID configured)
