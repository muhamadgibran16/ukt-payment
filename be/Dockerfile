# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Versi pnpm mengikuti field "packageManager" di package.json.
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# ---- Build (semua dependency) ----
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build

# ---- Dependency production saja ----
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts

# ---- Runtime ----
FROM node:24-alpine AS runtime
RUN apk add --no-cache tzdata
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health" > /dev/null || exit 1

# Migration -> seed (opsional, idempoten) -> start app.
# `exec` agar node menerima SIGTERM (graceful shutdown).
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/common/database/data-source.js && if [ \"$SEED_ON_START\" = \"true\" ]; then node dist/cli/seed.js; fi && exec node dist/main.js"]
