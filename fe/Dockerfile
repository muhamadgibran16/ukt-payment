# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-fe,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
# Variabel VITE_* dibaca saat build (dibenamkan ke bundle).
ARG VITE_API_URL=/api/v1
ARG VITE_APP_TIMEZONE
ARG VITE_DEMO_PASSWORD=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_TIMEZONE=$VITE_APP_TIMEZONE \
    VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD
RUN test -n "$VITE_APP_TIMEZONE" || (echo "VITE_APP_TIMEZONE wajib diisi" && exit 1)
RUN pnpm build

FROM nginx:1.27-alpine AS runtime
# Image nginx merender /etc/nginx/templates/*.template dengan envsubst saat start.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
