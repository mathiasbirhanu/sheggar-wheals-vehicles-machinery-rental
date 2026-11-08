# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Sheggar Wheels — production image (multi-stage, non-root, healthchecked)
#   deps   : bun install (reproducible via bun.lock) + prisma generate
#   build  : next build → standalone server bundle
#   runner : standalone output + prisma CLI for `migrate deploy` at boot
# ---------------------------------------------------------------------------

# ---- deps ---------------------------------------------------------------
FROM oven/bun:1.2 AS deps
WORKDIR /app
# Schema is needed before install so the prisma postinstall can generate the client.
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# ---- build --------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL is intentionally absent here: sitemap.ts falls back to static
# routes when the database is unreachable, so images build in CI without a DB.
RUN npm run build

# ---- runner -------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl wget \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system nextjs \
 && useradd --system --gid nextjs nextjs

# Standalone server (traced node_modules incl. the Prisma query engine).
COPY --from=build /app/.next/standalone ./
# Migration assets for the boot-time `prisma migrate deploy`.
COPY --from=build /app/prisma ./prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && chown -R nextjs:nextjs /app
USER nextjs

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
