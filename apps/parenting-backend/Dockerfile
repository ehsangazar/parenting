# syntax=docker/dockerfile:1
# Build context is the monorepo root (set via fly.toml context = '../..')

FROM node:20-slim AS base
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# Copy workspace manifests for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/parenting-backend/package.json ./apps/parenting-backend/

# Install all workspace deps needed to build parenting-backend
RUN pnpm install --frozen-lockfile --filter parenting-backend...

# Copy source
COPY apps/parenting-backend/src ./apps/parenting-backend/src
COPY apps/parenting-backend/prisma ./apps/parenting-backend/prisma
COPY apps/parenting-backend/tsconfig.json ./apps/parenting-backend/

# Generate Prisma client then compile TypeScript
RUN pnpm --filter parenting-backend prisma:generate
RUN pnpm --filter parenting-backend build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/parenting-backend/node_modules ./apps/parenting-backend/node_modules
COPY --from=base /app/apps/parenting-backend/dist ./apps/parenting-backend/dist
COPY --from=base /app/apps/parenting-backend/prisma ./apps/parenting-backend/prisma
COPY --from=base /app/apps/parenting-backend/package.json ./apps/parenting-backend/package.json
COPY --from=base /app/package.json ./package.json

EXPOSE 4000
CMD ["node", "apps/parenting-backend/dist/index.js"]
