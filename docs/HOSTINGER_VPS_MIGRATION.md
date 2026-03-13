# Hostinger VPS Migration Plan

This project can run on a single Hostinger VPS with Docker Compose.

## Recommended target architecture
- `web`: Next.js standalone server on port `3000`
- `api`: NestJS server on port `4000`
- `caddy`: reverse proxy + TLS on ports `80/443`
- `Supabase`: keep as the managed PostgreSQL database

Why this is the recommended path:
- one VPS handles both app services
- deploys become `git pull` + `docker compose up -d --build`
- no Vercel build/runtime split
- no serverless cold-start/runtime differences
- existing Supabase database stays unchanged

## What changes in this repo
- `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch/apps/api/Dockerfile`
- `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch/apps/web/Dockerfile`
- `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch/deploy/hostinger/docker-compose.yml`
- `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch/deploy/hostinger/caddy/Caddyfile`
- `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch/deploy/hostinger/api.env.example`
- `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch/deploy/hostinger/web.env.example`
- `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch/deploy/hostinger/compose.env.example`
- `/Users/kyawlaymyint/Desktop/ON:OFF/modern-punch/apps/web/next.config.mjs`

## Migration order
1. Create the Hostinger VPS.
2. Point DNS for:
   - `app.yourdomain.com`
   - `api.yourdomain.com`
3. Install Docker and Docker Compose on the VPS.
4. Clone the repo to the VPS.
5. Create deployment env files from the examples in `deploy/hostinger/`:
   - `api.env`
   - `web.env`
   - `compose.env`
6. Build and start the stack:
```bash
cd /path/to/modern-punch/deploy/hostinger
cp api.env.example api.env
cp web.env.example web.env
cp compose.env.example compose.env

docker compose --env-file compose.env up -d --build
```
7. Run database migration manually from the API container:
```bash
cd /path/to/modern-punch/deploy/hostinger

docker compose --env-file compose.env run --rm api \
  npm run prisma:migrate:deploy --workspace @modern-punch/api
```
8. Verify business flows before cutover:
   - admin login
   - employee login
   - punch on
   - punch off
   - break start
   - break end
   - live board
   - requests page
9. Switch production DNS or reverse-proxy traffic only after verification passes.

## Cron replacement
Vercel cron will not exist on the VPS. Replace it with host cron calling the API directly.

Recommended host crontab entry:
```bash
10 0 * * * curl -fsS -X POST http://127.0.0.1:4000/internal/jobs/run-daily -H 'x-job-secret: YOUR_JOB_SECRET' >/var/log/modern-punch-run-daily.log 2>&1
```

## Deployment workflow on VPS
From the VPS:
```bash
cd /path/to/modern-punch

git pull origin main
cd deploy/hostinger
docker compose --env-file compose.env up -d --build
```

## Rollback
If a VPS deploy is bad:
```bash
cd /path/to/modern-punch
git checkout <last-known-good-commit>
cd deploy/hostinger
docker compose --env-file compose.env up -d --build
```

## Notes
- Keep Supabase as the database. Do not move the DB during the hosting migration.
- Keep `api` bound to `127.0.0.1:4000` and `web` bound to `127.0.0.1:3000`; only Caddy should be public.
- `CORS_ORIGIN` must match the final web domain.
- `AUTH_COOKIE_SECURE=true` should stay enabled in production.
