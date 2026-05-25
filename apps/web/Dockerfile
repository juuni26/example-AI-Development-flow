# syntax=docker/dockerfile:1.7
# Build context: workspace ROOT.

ARG VITE_API_URL=http://localhost:3000

# ---- 1. deps ----
FROM oven/bun:1.1.27-alpine AS deps
WORKDIR /repo
COPY package.json bun.lock* ./
COPY tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile

# ---- 2. build ----
FROM deps AS build
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
WORKDIR /repo/apps/web
RUN bun run build

# ---- 3. runtime: nginx serving the static bundle ----
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
