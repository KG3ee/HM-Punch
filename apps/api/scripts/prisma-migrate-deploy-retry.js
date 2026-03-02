#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const apiDir = path.resolve(__dirname, '..');
const prismaCliPath = path.resolve(apiDir, '../../node_modules/prisma/build/index.js');
const maxAttempts = Number(process.env.PRISMA_MIGRATE_MAX_ATTEMPTS || 4);
const retryDelayMs = Number(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS || 15000);
const migrateDatabaseUrl = process.env.MIGRATE_DATABASE_URL;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isRetryable(output) {
  return output.includes('Error: P1002') || output.includes('pg_advisory_lock');
}

function safeHost(urlString) {
  if (!urlString) return 'n/a';
  try {
    return new URL(urlString).host;
  } catch {
    return 'invalid-url';
  }
}

const runEnv = {
  ...process.env,
  DATABASE_URL: migrateDatabaseUrl || process.env.DATABASE_URL
};

console.log(`[prisma-migrate] Database host: ${safeHost(runEnv.DATABASE_URL)}`);
if (migrateDatabaseUrl) {
  console.log('[prisma-migrate] Using MIGRATE_DATABASE_URL override for migration deploy.');
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(
    `[prisma-migrate] Attempt ${attempt}/${maxAttempts}: prisma migrate deploy`
  );

  const run = spawnSync('node', [prismaCliPath, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
    cwd: apiDir,
    env: runEnv,
    encoding: 'utf8'
  });

  const output = `${run.stdout || ''}${run.stderr || ''}`;
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);

  if (run.status === 0) {
    console.log('[prisma-migrate] Migration deploy succeeded.');
    process.exit(0);
  }

  const retryable = isRetryable(output);
  if (!retryable || attempt === maxAttempts) {
    console.error('[prisma-migrate] Migration deploy failed.');
    process.exit(run.status || 1);
  }

  console.warn(
    `[prisma-migrate] Advisory lock timeout detected. Retrying in ${retryDelayMs / 1000}s...`
  );
  sleep(retryDelayMs);
}
