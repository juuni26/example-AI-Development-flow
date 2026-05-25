# Cleandrop — Domain Context

## Glossary

### Service
A unit in the catalog (e.g. "Standard Clean", "Deep Clean"). Has a name, description, category, status, duration, base price, and is offered by exactly one Company.

### Company
The service provider that offers a Service (e.g. "Acme Cleaning S.r.l."). First-class entity with its own table; a Company offers many Services. **Not a tenant** — access control is purely role-based, not company-scoped. The header badge "Platform-wide" reflects this: every authenticated user sees the global catalog.

### Duration
How long a Service takes to perform. Stored as `duration_minutes: integer`. Displayed as `"90 min"` when under 60, otherwise as `"3 h 30 min"`.

### Base Price
The price a Company charges for a Service. Stored as `base_price_cents: integer` (minor units). Currency is a single app-wide constant `EUR` — not a column. Displayed as `EUR 159.00`. The "Avg. Base Price" summary card is a server-side `AVG` over `base_price_cents`, formatted on the client.

### Category
A label on a Service. Postgres enum / TS union with values `Residential`, `Commercial`, `Specialty`. Closed set — adding one is a code + migration change. (Chose enum over a lookup table because no runtime admin UI manages categories; the table would be inert.)

### Status
A label on a Service. One of `Active` (published & bookable), `Draft` (work-in-progress), `Inactive` (retired). Pure metadata — no effect on visibility. All authenticated users see services in every status; only admins can change a service's status. No transition rules — any status can move to any other.

### Role
A claim on the JWT. Two values: `admin` (full CRUD on Services) and `user` (read-only). No per-company scoping.

## Stack decisions

- **Frontend:** Vite + React SPA + react-router. No SSR. JWT stored in `localStorage`, sent as `Authorization: Bearer …`. Static bundle served by nginx in Docker.
- **Accounts:** Seeded only. Two fixed accounts (one `admin`, one `user`), credentials documented in the README. No signup endpoint, no admin user-management UI.
- **Catalog querying:** Server-side search, filter, sort, and pagination. `GET /services` accepts `search`, `status`, `category`, `sortBy`, `sortDir`, `page`, `pageSize`; returns `{ data, total, page, pageSize }`. Aggregations (Total / Active / Drafts / Avg base price) computed server-side too.
- **Repo layout:** Bun workspaces monorepo. `apps/api` (NestJS), `apps/web` (Vite + React), `packages/shared` (type-only — DTOs, Zod schemas, response envelopes). One root `bun.lock`. Each app has its own Dockerfile with the workspace root as build context.
- **OpenAPI docs:** Generated from the same Zod schemas in `packages/shared` via `nestjs-zod`'s Swagger integration. Swagger UI at `GET /api/docs` (public, no auth), JSON at `GET /api/docs-json`. Bearer JWT registered as the security scheme so "Authorize" works in the UI. Controllers tagged (`auth`, `services`). Realistic example responses on every endpoint.
- **Sidebar footer:** Shows the logged-in user's email local-part (e.g. `admin` from `admin@cleandrop.test`) + role badge. Click opens a popover with a Logout button.
- **Catalog UI states:** Loading = shadcn `Skeleton` rows (no spinner). Empty filtered = centered "No services match these filters" with a "Clear filters" link. Fetch error = inline error card above the table with a "Retry" button. Mutations surface as toasts.
- **Login page:** shadcn `Card`, email + password, submit. Inline "Invalid email or password" on failure (does not distinguish which field is wrong). Logged-in users visiting `/login` are redirected to `/services`. Logged-out users hitting a protected route are sent to `/login?next=<path>` and bounced back after success.
- **Sort & pagination contract:** API accepts `sortBy ∈ {name, category, company, status, duration, basePrice}` and `sortDir ∈ {asc, desc}`. Default is `createdAt DESC`. Every query appends `services.id ASC` as a stable tiebreaker so pagination is deterministic. `id` and `createdAt` are not exposed as sortable columns in the UI.
- **Error responses:** NestJS default shape — `{ statusCode, message, error }` for `HttpException`s; `nestjs-zod`'s `ZodValidationException` shape for body validation failures (issues array with `path`/`message`). Web client has a small `parseApiError` helper that handles both. No global rewrite to RFC 7807.
- **Add/Edit Service UX:** shadcn `Sheet` from the right (~480px). Same component for create and edit, prefilled when editing. Form uses react-hook-form + Zod resolver against the `createServiceSchema` / `updateServiceSchema` exported from `packages/shared`. Delete confirmation via shadcn `AlertDialog`. Toasts on success/failure. No dedicated routes.
- **Auth tokens:** Short-lived access JWT (15 min, HS256, `{ sub, email, role, iat, exp }`) in localStorage. Opaque random 256-bit refresh token (7 days) in localStorage; DB stores SHA-256 hash in `refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, replaced_by_id)`. Refresh rotates: each `POST /auth/refresh` revokes the presented token and issues a new pair. **Reuse detection**: presenting an already-revoked refresh token revokes every refresh row for that user. `POST /auth/logout` revokes the one row. Axios interceptor handles 401s with single-flight refresh + queued retry; bounces to `/login` on refresh failure. The README's "nice to have" list (refresh tokens, e2e tests, OpenAPI docs) is treated as **required**.
- **Backend tests:** Hybrid, anchored on E2E. Real Postgres via Testcontainers (one container per suite, per-test transaction rollback for isolation). Covers `/auth/login` (happy + bad password + missing user), `/services` list with pagination/search/filter/sort as both roles, `/services` create/update/delete role-gated (201/403/401), summary endpoint totals against seeded fixture. No DB mocks. A small number of pure-logic unit tests only if non-trivial logic emerges (don't unit-test Drizzle queries in isolation).
- **Validation:** Zod schemas in `packages/shared`, one per DTO. API uses `nestjs-zod` as the global ValidationPipe; web reuses the same schemas with react-hook-form's Zod resolver. Types are derived via `z.infer<typeof schema>` — one source of truth across the wire.
- **DB lifecycle in Docker:** Two dedicated short-lived compose services. `migrate` runs `drizzle-kit migrate` and exits; `seed` runs an idempotent seed script and exits. `api` depends on both with `condition: service_completed_successfully`. Postgres has a healthcheck so `migrate` waits for readiness. Seed is idempotent (re-running compose doesn't duplicate rows). User seed inserts **bcrypt-hashed** passwords; plaintext credentials are documented in the README.
