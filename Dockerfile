# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Runtime ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Base SQLite locale persistée sur un volume ; override avec un vrai Turso au runtime
ENV TURSO_DATABASE_URL=file:/data/gold-tv.db

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Bindings natifs de libsql chargés dynamiquement (requireNative) → non tracés par
# le build standalone. On les copie explicitement depuis le builder.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/libsql ./node_modules/libsql
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@libsql ./node_modules/@libsql

# Dossier de données inscriptible par l'utilisateur non-root
RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME /data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
