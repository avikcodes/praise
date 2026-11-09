#!/bin/sh
set -e

echo "==> Praise Core Self-Hosted Container Initializing..."

# 1. Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not defined."
  echo "Please provide a valid PostgreSQL connection string in your .env or Docker Compose file."
  exit 1
fi

# 2. Wait for PostgreSQL database to accept connections
echo "==> Waiting for PostgreSQL database to be reachable..."
MAX_RETRIES=30
RETRY_COUNT=0

until node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.$queryRaw`SELECT 1`
  .then(() => { process.exit(0); })
  .catch(() => { process.exit(1); });
' 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Timed out waiting for PostgreSQL after ${MAX_RETRIES} attempts."
    exit 1
  fi
  echo "    PostgreSQL is not ready yet (attempt ${RETRY_COUNT}/${MAX_RETRIES}). Retrying in 2 seconds..."
  sleep 2
done

echo "==> PostgreSQL connection established successfully."

# 3. Apply database schema migrations safely
echo "==> Running database schema migrations (prisma migrate deploy)..."
npx prisma migrate deploy

# 4. Ensure persistent directories exist and are writable
mkdir -p "${PRAISE_UPLOAD_DIR:-/app/storage/uploads}"
mkdir -p "${PRAISE_DATA_DIR:-/app/data}"

echo "==> Initialization complete. Starting Praise Core in production mode..."
exec "$@"

