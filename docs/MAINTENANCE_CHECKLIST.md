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

## 2) Core User Flows
- [ ] Login works.
- [ ] Duty ON works.
- [ ] Duty OFF works.
- [ ] Break start/end works.
- [ ] Current status/summary updates correctly.

## 3) Core Admin Flows
- [ ] Admin login works.
- [ ] User/team management pages load.
- [ ] Live board endpoint/page loads.
- [ ] Monthly snapshot/report page loads.

## 4) Regression Commands (local)
Run in `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch`.

```bash
npm run build
npm run lint
```

## 5) Job/Cron Checks
- [ ] Internal job endpoints reachable with correct `x-job-secret`.
- [ ] Daily job path executes without DB/auth failure.

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
- [ ] Report generation consistency checks.
