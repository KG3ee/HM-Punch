#!/bin/sh
set -e

echo "[entrypoint] Running prisma migrate deploy..."
node /bundle/node_modules/prisma/build/index.js migrate deploy \
  --schema /bundle/apps/api/prisma/schema.prisma

echo "[entrypoint] Starting API..."
exec node /bundle/dist/main.js
