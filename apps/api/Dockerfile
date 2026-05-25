# syntax=docker/dockerfile:1.7
# Build context: workspace ROOT (so apps/api and packages/shared are both reachable).

# ---- 1. deps: install the workspace once, cache by lockfile ----
FROM oven/bun:1.1.27-alpine AS deps
WORKDIR /repo
COPY package.json bun.lock* ./
COPY tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile

# ---- 2. source: bring in the actual code on top of deps ----
FROM deps AS source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# ---- 3. build: compile the Nest app to dist ----
FROM source AS build
WORKDIR /repo/apps/api
RUN bun run build

# ---- 4. migrate: one-shot container that applies drizzle migrations ----
FROM source AS migrate
WORKDIR /repo/apps/api
CMD ["bun", "run", "src/db/migrate.ts"]

# ---- 5. seed: one-shot container that runs the idempotent seed ----
FROM source AS seed
WORKDIR /repo/apps/api
CMD ["bun", "run", "src/db/seed.ts"]

# ---- 6. runtime: minimal image that runs the compiled Nest app ----
FROM oven/bun:1.1.27-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/bun.lock* ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["bun", "run", "dist/main.js"]
