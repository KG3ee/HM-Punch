#!/bin/sh

echo "[entrypoint] Running prisma migrate deploy..."
node /bundle/node_modules/prisma/build/index.js migrate deploy \
  --schema /bundle/apps/api/prisma/schema.prisma
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "[entrypoint] WARNING: migrate deploy exited with code $MIGRATE_EXIT — starting API anyway"
else
  echo "[entrypoint] Migrations applied successfully"
fi

echo "[entrypoint] Starting API..."
exec node /bundle/dist/main.js
