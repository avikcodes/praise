# ------------------------------------------------------------------------------
# Praise Core — Self-Hosted Production Dockerfile
# Multi-stage build for minimal image footprint, high security, and fast boot
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# 1. Base Layer: Alpine Node.js 20 with Prisma engine prerequisites
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# ------------------------------------------------------------------------------
# 2. Dependencies Layer: Install npm packages and generate Prisma Client
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# ------------------------------------------------------------------------------
# 3. Builder Layer: Compile Next.js production bundle
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy DATABASE_URL and telemetry flag so static prerendering succeeds during build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN npm run build

# ------------------------------------------------------------------------------
# 4. Runner Layer: Hardened, non-root production runtime container
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRAISE_UPLOAD_DIR="/app/storage/uploads"
ENV PRAISE_DATA_DIR="/app/data"

# Install runtime utilities for container health probe and entrypoint script
RUN apk add --no-cache bash wget openssl postgresql-client

# Create secure non-root user and persistent storage directories
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 praise && \
    mkdir -p /app/storage/uploads /app/data && \
    chown -R praise:nodejs /app/storage /app/data

# Copy built application assets and dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chown -R praise:nodejs /app

USER praise

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]

