# syntax=docker/dockerfile:1
# Build context: monorepo root (parenting/). Coolify must be configured with
# "Base Directory" = / and "Dockerfile Location" = apps/parenting-frontend/Dockerfile.

FROM node:20-alpine AS build
WORKDIR /app

# Vite inlines env at build time, so values must be present during `pnpm build`.
ARG VITE_API_URL=https://parenting-backend.gazar.dev
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_SENTRY_DSN
ARG VITE_GOOGLE_TAG_ID
# Sentry/GlitchTip sourcemap upload (skipped silently when SENTRY_AUTH_TOKEN
# is empty, e.g. local builds).
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_URL
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_RELEASE

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_GOOGLE_TAG_ID=$VITE_GOOGLE_TAG_ID
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_URL=$SENTRY_URL
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV SENTRY_RELEASE=$SENTRY_RELEASE

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# Workspace manifests first for layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/parenting-frontend/package.json ./apps/parenting-frontend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile --filter parenting-frontend...

# Source.
COPY apps/parenting-frontend ./apps/parenting-frontend
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui

RUN pnpm --filter parenting-frontend build

# ── runner ────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=build /app/apps/parenting-frontend/dist /usr/share/nginx/html

# Crawler/static files must 404 if missing; otherwise the SPA fallback would
# serve index.html for /sitemap.xml and visitors see /login.
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location = /sitemap.xml { \
        default_type application/xml; \
        try_files $uri =404; \
    } \
    location = /robots.txt { \
        default_type text/plain; \
        try_files $uri =404; \
    } \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /assets/ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
