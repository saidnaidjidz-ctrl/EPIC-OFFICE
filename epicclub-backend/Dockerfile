# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json ./

# Install ALL deps (including devDependencies) for build step
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# ─── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install ONLY production dependencies (no devDeps)
RUN npm ci --frozen-lockfile --omit=dev && \
    npm cache clean --force

# Copy application source from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations

# Create non-root user and set ownership
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodeuser && \
    chown -R nodeuser:nodejs /app

# Drop to non-root user
USER nodeuser

EXPOSE 5000

# Use dumb-init as PID 1 to properly handle OS signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/app.js"]
