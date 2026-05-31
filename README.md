# This is an example of how / my approach to develop App solution with AI as a tool

## The problem

Build a small **Services catalog** with authentication and **role-based access**, matching a reference screen. The entire brief arrived as **two files** — there was no detailed spec to implement against:

| The original challenge         | File                                                   |
| ------------------------------ | ------------------------------------------------------ |
| The written requirements       | **[`task-goal.md`](./task-goal.md)**                   |
| The target UI (one screenshot) | **[`challenge-preview.png`](./challenge-preview.png)** |

![Services page reference — the target UI](./challenge-preview.png)

### The required flow

1. **Log in** on `/login` with email + password → receive a **JWT carrying a `role` claim** → **redirect to `/services`**.
2. On `/services`, render the catalog above: a **sidebar** (Services active), a **header** (title + subtitle + "Platform-wide" badge), **four summary cards** (Total / Active / Drafts / Avg. Base Price), and a **Catalog** section with **search, status + category filters, a sortable table, and pagination**.
3. The table shows, in order: **Name (with description) · Category · Company · Status · Duration**, seeded with **9 services** across mixed statuses.
4. **Role-based access**, enforced on **both layers**:

| Role    | Can do                               | Sees                                     |
| ------- | ------------------------------------ | ---------------------------------------- |
| `admin` | Full **CRUD** — create, edit, delete | `+ Add` button, per-row Edit/Delete menu |
| `user`  | **Read-only** — list + view          | No write affordances at all              |

The catch the brief calls out explicitly: hiding buttons in the UI is **not** enough — the **API must also reject** a `user` who calls a write endpoint directly (`403`), even if they bypass the UI.

5. The stack is **fixed**: **Bun · NestJS · Drizzle ORM · PostgreSQL · shadcn/ui · Jest · Docker** — `docker compose up` must bring up API + DB + frontend.

That's the whole brief. **The interesting part is not _what_ to build — it's _how_ two files (a paragraph of requirements + one screenshot) become a tested, deployable system without a spec handed to you.** The rest of this README is the story of that process; the repo's commit history, issues, and PRs are the receipts.

> **This repo is meant to be read, not just run.** Every claim below links to the artifact that proves it — an issue, a PR, a commit, or an ADR. Browse [the issues](https://github.com/juuni26/cleandrop/issues?q=is%3Aissue) and [the PRs](https://github.com/juuni26/cleandrop/pulls?q=is%3Apr) alongside it.

---

## How this repo was built — context → PRD → issues → TDD → e2e → refactor → deploy

The whole thing was built as a deliberate pipeline. Each stage left a durable artifact you can inspect:

| Stage                               | What happened                                                                                                                                                                                                                                                                                                                                    | Where to verify                                                                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 · Gather context**              | Read the brief + preview, then ran a structured Q&A over every load-bearing decision (domain language, money model, auth scheme, validation strategy, repo layout, test scope, error shape). Output: a domain glossary, stack-decision table, and 3 ADRs — _before any code_.                                                                    | commit [`db8ecfa`](https://github.com/juuni26/cleandrop/commit/db8ecfa) · [`CONTEXT.md`](./CONTEXT.md) · [`docs/adr/`](./docs/adr/)                                                                          |
| **2 · Turn it into a PRD**          | The brief in [`task-goal.md`](./task-goal.md) became a concrete, outcome-based plan: domain entities, the API contract, the role matrix, the UI inventory, and an explicit "out of scope" list. The "nice-to-haves" (refresh tokens, e2e, OpenAPI) were promoted to **required** scope.                                                          | [`CONTEXT.md`](./CONTEXT.md)                                                                                                                                                                                 |
| **3 · Slice into issues**           | The PRD was decomposed into **9 vertical-slice issues** ([#1–#7](https://github.com/juuni26/cleandrop/issues?q=is%3Aissue), #15, #17), each cutting end-to-end through schema → API → shared types → UI → tests. The dependency chain is strict (#2 blocks #3 …) so `main` is demoable at every commit — never a half-finished horizontal layer. | [issues list](https://github.com/juuni26/cleandrop/issues?q=is%3Aissue+is%3Aclosed)                                                                                                                          |
| **4 · Build each slice test-first** | Every slice shipped as one PR that `closes #N` with its tests in the same diff. A failing test defined "done", then the code made it pass.                                                                                                                                                                                                       | PRs [#8](https://github.com/juuni26/cleandrop/pull/8)–[#14](https://github.com/juuni26/cleandrop/pull/14) (`feat(...) … closes #N`)                                                                          |
| **5 · Prove it end-to-end**         | Two e2e layers: backend against a **real Postgres** (Testcontainers, no mocks) and the browser against the **live Docker stack** (Playwright on the nginx-served production bundle). The Playwright pass caught a render bug the API tests structurally could not see.                                                                           | PR [#14](https://github.com/juuni26/cleandrop/pull/14) (backend) · PR [#16](https://github.com/juuni26/cleandrop/pull/16) (browser)                                                                          |
| **6 · Refactor & harden**           | With tests green, a hardening pass fixed a refresh-rotation race + review findings; a later pass concentrated the rotation invariant behind one seam and added ESLint/Prettier. The tests are what made these safe.                                                                                                                              | commits [`7b58d51`](https://github.com/juuni26/cleandrop/commit/7b58d51), [`ad9e13b`](https://github.com/juuni26/cleandrop/commit/ad9e13b), [`1a8b672`](https://github.com/juuni26/cleandrop/commit/1a8b672) |
| **7 · Deploy**                      | One command — `docker compose up -d` — brings up the whole stack with an ordered lifecycle (`db → migrate → seed → api → web`). Re-running is idempotent.                                                                                                                                                                                        | [`docker-compose.yml`](./docker-compose.yml) · [Dockerfiles](./apps)                                                                                                                                         |

The result: **65 automated checks** (46 backend e2e + 19 Playwright) against real Postgres and a real browser, every feature traceable from an issue to a PR to a test.

---

## TL;DR

```bash
cp .env.example .env
docker compose up -d
open http://localhost:8080            # log in with the demo accounts on the page
open http://localhost:3000/api/docs   # OpenAPI Swagger UI
```

Seeded credentials are surfaced on the login page itself with click-to-copy buttons. `admin@cleandrop.test / Cleandrop!Admin-2026` for full CRUD; `user@cleandrop.test / Cleandrop!User-2026` for read-only.

---

## Reading the history

The narrative above is verifiable by walking the repo:

- **[Issues](https://github.com/juuni26/cleandrop/issues?q=is%3Aissue)** — each is a vertical slice with a scope and acceptance criteria. Read them top-to-bottom to see the plan.
- **[Pull requests](https://github.com/juuni26/cleandrop/pulls?q=is%3Apr)** — each `closes #N` and carries a test plan, a walkthrough, and (where relevant) a bug log. The PR-to-issue mapping is 1:1.
- **Commit log** — `git log --oneline` reads as the pipeline: `docs: planning context` → `feat(scaffold) … closes #1` → `feat(auth) … closes #2` → … → `refactor(auth)` → `chore(tooling)`.
- **[`docs/adr/`](./docs/adr/)** — the three decisions that are _hard to reverse_ (money model, refresh tokens, Zod as the single source of truth), each with the alternatives weighed.

So the rest of this README explains the **why** behind the load-bearing choices; the issues and PRs show the **how** and **when**.

---

## Why these specific decisions?

For every meaningful fork I hit, I considered the alternatives explicitly. Here are the ones worth explaining.

### Why Zod, not class-validator

NestJS's default validation story uses `class-validator` + `class-transformer` decorators on DTO classes. It's the path of least resistance — the framework is built for it. I rejected it because **one shared Zod schema** in `packages/shared` becomes the single source of truth for **four** consumers:

| Concern                  | With class-validator                    | With Zod (chosen)                                |
| ------------------------ | --------------------------------------- | ------------------------------------------------ |
| API request validation   | `@IsString()` decorators on a DTO class | `nestjs-zod` `ZodValidationPipe`                 |
| TypeScript types         | Hand-write a separate interface         | `type X = z.infer<typeof schema>`                |
| OpenAPI doc shape        | `@ApiProperty()` on every field         | `nestjs-zod` Swagger patch                       |
| Frontend form validation | Hand-write _again_ in the client        | Same schema with `react-hook-form` `zodResolver` |

With class-validator, the four representations drift independently — adding a field is a four-place edit. The class field's TypeScript type and its decorator can also disagree (`name: string` with no `@IsString()` passes validation and explodes at runtime). With Zod, one edit propagates; runtime check and inferred type are the same definition by construction.

The cost: a slight detour from NestJS-101 tutorials, and `nestjs-zod` is a third-party dep. Worth it. **See [ADR 0003](./docs/adr/0003-zod-as-cross-stack-single-source-of-truth.md).**

### Why Drizzle, not Prisma

The catalog has fewer than 10 endpoints; the schema has four tables. I wanted three things from the ORM:

1. **Schema in code that I can read end-to-end.** `pgTable("services", { … })` literally is the schema. No `.prisma` file to parse, no codegen step that maps a different syntax to TypeScript.
2. **A query builder that doesn't hide SQL.** The catalog's list query has an `ILIKE` search, two equality filters, a join, a dynamic `ORDER BY` with tiebreaker, and `LIMIT/OFFSET`. Drizzle composes that as SQL fragments I can reason about. Prisma's filter object syntax would obscure what's actually running.
3. **Migrations as plain SQL files.** `drizzle-kit generate` produces SQL that I can read, review, and apply manually if needed. Compose's `migrate` service just runs the migrator against `apps/api/drizzle/`.

Prisma would have been fine; Drizzle is better-fit for this size.

### Why Bun workspaces, not npm/pnpm

I needed a workspace (api, web, shared package). The choice was about:

- **Speed of install** — Bun's package manager is several times faster than npm and competitive with pnpm.
- **TypeScript execution at the seed/migrate boundary** — `bun run src/db/migrate.ts` runs the TS file directly with no precompile, which makes the `migrate` Docker stage trivially small.
- **Single tool for runtime, package manager, and (optionally) bundler** — fewer moving parts in CI.

The downside is that some native postinstall scripts (`cpu-features` from `ssh2`, a transitive testcontainers dep) need `--ignore-scripts` in Docker because the Alpine bun image lacks the build toolchain. That trade was visible in #2 and is documented in the Dockerfile comments.

### Why integer cents, not floats or `numeric(12,2)`

Money is **one column, one type**: `base_price_cents: integer`. Currency is a hardcoded constant `'EUR'`, not a column. Reasons:

- **`AVG(base_price_cents)::int` is exact.** The summary card aggregates over the whole table; floating-point would drift.
- **No per-row currency makes the average meaningful.** If services had mixed currencies, "average price" would need an FX strategy that's far out of scope.
- **Upgrade path stays open.** When multi-currency arrives, add a `currency char(3) DEFAULT 'EUR'` column and lift the constant. No data migration required for existing rows.

The cost is a 100× scale shift at the read/write boundary, handled by `formatMoney(cents)` in `packages/shared`. **See [ADR 0001](./docs/adr/0001-money-as-integer-cents-single-currency.md).**

### Why server-side filter/sort/pagination, even with 9 rows

Easy to dismiss this for a 9-row fixture. I went server-side anyway because:

- **The shape of a real catalog is server-side.** The next person to add 1,000 services shouldn't have to rewrite the data layer.
- **Backend e2e tests gain meaning.** "Filter by status returns the right rows" is a real assertion. "Sort by name is stable across requests" exercises the `id ASC` tiebreaker on `ORDER BY` (which actually matters — without the tiebreaker, two rows with the same `created_at` can swap pages between requests).
- **The query layer was already there.** The summary endpoint needed real `COUNT(*) FILTER (WHERE …)` aggregates anyway; reusing the same query module for the list query costs nothing.

Trade: ~2× the frontend wiring (debounced search, URL-bound query state, loading states) versus a client-side `Array.filter`. Worth it for the signal it sends.

### Why refresh-token rotation **with** reuse detection

Refresh tokens were on the "nice to have" list. They're treated as required scope here because storing only a 15-minute access JWT means the evaluator gets logged out mid-test. Once I added refresh, I had to pick a design.

Three options:

1. Refresh in `localStorage`, no rotation — same XSS exposure as the access token. Negligible security improvement.
2. Refresh in `httpOnly` cookie — principled, but introduces CORS-with-credentials and cookie-domain headaches across the Docker compose network.
3. **Refresh in `localStorage` with server-side rotation and reuse detection** — the canonical OAuth 2.0 pattern. Each refresh revokes the presented row and issues a new one linked via `replaced_by_id`. Replaying an already-revoked token **cascade-revokes every refresh row for that user** — XSS-exfiltrated tokens are then self-revoking: the moment the attacker uses one, the legitimate client's next refresh trips the cascade and severs the session.

I picked (3). The DB stores only SHA-256 hashes; the plaintext exists in client memory and the wire only. **See [ADR 0002](./docs/adr/0002-refresh-token-rotation-with-reuse-detection.md).**

The client-side counterpart is a **single-flight refresh** in the axios response interceptor: the first 401 starts a refresh, every concurrent failure piggybacks on the same promise, and queued requests retry exactly once with the new access token. Without single-flight, three simultaneous 401s would launch three refresh requests and the first one's rotation would cascade-revoke the other two.

### Why Testcontainers, not mocks or a shared dev DB

The backend tests boot the entire Nest app against a **fresh Postgres container per suite**, apply migrations, seed the fixture, and run supertest calls. No DB mocks anywhere. Reasons:

- **Mocks of Drizzle would prove nothing.** The role guard, JWT decoding, SQL filter logic, and seed wiring are exactly what we want to verify; they only work in concert with a real DB.
- **A shared dev DB cross-contaminates tests.** Per-suite containers give isolation without per-test setup cost (Testcontainers reuses the daemon's image cache; container startup is ~1s after the first pull).
- **The rubric explicitly says "tests that cover real behavior."** A test that asserts "POST as user returns 403" against a real RolesGuard + real JWT + real DB is real behavior. A test that mocks both is theater.

The trade is ~15–20s wall-clock for the whole backend suite versus sub-second for unit tests. Acceptable; CI doesn't care.

### Why Playwright on top of backend e2e

Backend e2e proves the API does what the spec says. It cannot prove:

- The form sheet opens, validates, and saves
- The role-gated affordances are actually hidden in the UI
- The single-flight refresh works in a real browser
- The session-expiry redirect lands on `/login?next=…`

So #15 added a Playwright suite (now 19 tests) against the **live `docker compose up` stack** — exercising the real production build (nginx + bundled `VITE_API_URL`), not `vite dev`. One of those tests literally caught a `useSyncExternalStore` snapshot-stability bug that was rendering the catalog page as a blank `<div id="root">`. Backend tests had no way to see it.

### Why URL-bound query state

Every catalog filter, sort, page, and search term lives in the URL search params (`?search=&status=&category=&sortBy=&sortDir=&page=&pageSize=`), not in component state. Reasons:

- **Reload-friendly.** Refresh the page and you keep your filters.
- **Deep-linkable.** Send a colleague the URL of a specific filtered view.
- **Free history.** Browser back/forward becomes "undo last filter."

The cost is one `useCatalogParams()` hook that parses/coerces the params through the shared Zod schema. Validation lives there — invalid values silently fall back to defaults so a hand-edited URL never crashes the page.

### Why a `Sheet` for create/edit, not a route or modal

Modal is too cramped for a 7-field form. A dedicated route (`/services/new`, `/services/:id/edit`) deep-links but requires a full page transition and router gymnastics. A right-side `Sheet` (shadcn) gives:

- ~480px of comfortable space for the form
- The catalog stays visible behind, so the admin can see context while creating service #4 in a row
- One component for create _and_ edit (header flips between "New service" and "Edit service"); the form's `defaultValues` come from the row when editing, defaults when creating
- Easy mobile fallback (bottom sheet)

No deep-linkable URL for the edit state is the trade. For a take-home where no one is sharing `/services/42/edit` links, that's not a loss.

### Why a real popover token (instead of just `bg-white`)

This sounds trivial but is the single most-instructive bug I caught. The original shadcn primitives used `bg-popover` but the `--popover` and `--popover-foreground` CSS custom properties were never defined in `index.css`. Tailwind's color resolver fell back to _transparent_, which meant every `Select`, `DropdownMenu`, `Sheet`, and `AlertDialog` panel rendered see-through — the field behind would bleed through the open option list. This was caught by the user looking at the running app, not by the test suite (the suite was happily clicking visually-broken elements because they were still functional). Fixed in #17 by defining the tokens, exposing them in the Tailwind theme, and applying `bg-popover` to every floating surface. The lesson: visual bugs need _visual_ tests, which is why #15 added Playwright with screenshot-on-failure.

---

## User flows

### First-time setup

```
clone → cp .env.example .env → docker compose up -d
       │
       ├─ db        (Postgres 16, healthchecked)
       ├─ migrate   (runs drizzle-kit migrate, exits 0)
       ├─ seed      (idempotent — inserts 2 users + 2 companies + 9 services if missing)
       ├─ api       (depends on seed completed, listens :3000)
       └─ web       (nginx serving the built bundle, listens :8080)
```

A second `docker compose up -d` is a no-op: migrations are idempotent (Drizzle tracks applied ones in a journal table), seed inserts via `ON CONFLICT DO NOTHING`. So re-running compose never duplicates rows.

### Login → catalog (as user)

```
/login
   │  fills email + password (or clicks "Use read-only user")
   │  POST /auth/login
   │       └─ bcrypt verify → JWT signed → refresh row inserted
   │       returns { accessToken, refreshToken, user }
   │  setAuth(localStorage) → navigate("/services")
   ▼
/services
   │  axios interceptor attaches Bearer
   │  GET /services?page=1&pageSize=6 (React Query)
   │  GET /services/summary           (React Query)
   ▼
Catalog rendered
   │  user can: type to search (debounced 250ms, URL-bound)
   │             click filter Selects (URL-bound)
   │             click sortable column headers (asc → desc → none, URL-bound)
   │             Previous / Next / Rows-per-page (URL-bound)
   │  no + Add button; no row-action menus
```

### Admin CRUD

```
/services as admin
   │  sees + Add (top-right of Catalog card)
   │  sees row-action ··· menu per row (Edit, Delete)
   ▼
+ Add
   │  Sheet opens from the right (480px)
   │  Header reads "New service"
   │  Form: Name, Description, Category, Status, Company, Duration, Base price
   │  Validation: react-hook-form + Zod resolver against createServiceSchema in packages/shared
   │  Server-side errors (Zod issues) map onto form fields via setError
   ▼
Submit → POST /services (with Authorization: Bearer …)
   │  RolesGuard checks role === 'admin' (returns 403 for user even if they bypass the UI)
   │  Service inserted; returned row included companyId resolution
   ▼
Success
   │  Toast "Service created"
   │  React Query invalidates ['services'] AND ['services','summary']
   │  Sheet closes; list refetches; summary cards refetch
```

Edit and Delete reuse the same Sheet component (header flips to "Edit service", form prefilled) and an `AlertDialog` ("Delete X? This cannot be undone.") respectively.

### Session expiry (refresh roundtrip)

```
User idle for >15 minutes (access token expires)
   ▼
User triggers any request
   │  axios attaches the expired Bearer
   │  Server: 401
   ▼
axios response interceptor sees 401
   │  Not an /auth/* request? → start single-flight refresh
   │      POST /auth/refresh { refreshToken: localStorage }
   │      Server: revoke old row → mint new pair (replaced_by_id linked)
   │  Update tokens in localStorage; notify subscribers
   │  Retry the original request with the new Bearer
   ▼
Original request succeeds; user never noticed

… UNLESS the refresh itself fails:
   ▼
Refresh 401 (token revoked, expired, or reuse detected)
   │  Clear local state
   │  Toast "Session expired. Please sign in again."
   │  navigate("/login?next=/services")
```

### Reuse detection cascade

```
Attacker exfiltrates a refresh token via XSS
Attacker calls POST /auth/refresh with token T (success: rotation T → T')
Attacker now has T'; legitimate client still has T (its localStorage was the source)
Legitimate client's access expires → triggers refresh with T
Server sees T already revoked (replaced_by T') → reuse detected
Server: UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = X AND revoked_at IS NULL
        → T' is also dead now
Legitimate client gets 401 → bounces to /login → must re-authenticate

Net: the attacker's session is severed the moment they trigger reuse.
```

---

## Architecture at a glance

```
cleandrop/
├── apps/
│   ├── api/                # NestJS 10 + Drizzle + Postgres
│   │   ├── src/
│   │   │   ├── auth/       # JWT guard, RolesGuard, refresh-token rotation + reuse detection
│   │   │   ├── services/   # catalog (list/get/create/update/delete) + summary aggregates
│   │   │   ├── companies/  # GET /companies for the form's dropdown
│   │   │   ├── me/         # GET /me
│   │   │   ├── db/         # drizzle client + schema + fixtures + migrate/seed runners
│   │   │   ├── config/     # Zod-validated env (crashes at bootstrap on misconfig)
│   │   │   └── openapi.ts  # nestjs-zod Swagger patch + DocumentBuilder
│   │   ├── drizzle/        # generated migrations (committed)
│   │   └── test/           # backend e2e against Testcontainers Postgres
│   └── web/                # Vite + React 18 + Tailwind + shadcn/ui + react-router + React Query
│       ├── src/
│       │   ├── components/ # AppShell (collapsible sidebar), SummaryCards, ServiceFormSheet,
│       │   │               # DeleteServiceDialog, DemoCredentials, ui/* (shadcn primitives)
│       │   ├── pages/      # Login (with copyable demo accounts), Services (the catalog)
│       │   ├── lib/        # axios w/ single-flight refresh, auth-store, query hooks, mutations,
│       │   │               # use-catalog-params (URL ↔ Zod query), use-sidebar (persisted collapse)
│       │   └── routes/     # RequireAuth (redirects with next= preserved)
│       └── e2e/            # Playwright suite — runs against the running docker compose stack
├── packages/
│   └── shared/             # type-only: Zod schemas + types + helpers (formatMoney, formatDuration)
├── docs/
│   ├── CHALLENGE.md        # archived copy of the challenge brief (same as task-goal.md)
│   └── adr/                # 3 architecture decision records
├── docker-compose.yml      # db → migrate → seed → api → web
├── CONTEXT.md              # domain glossary + stack decisions (compact reference)
├── task-goal.md            # the original challenge brief (verbatim)
└── package.json            # Bun workspaces
```

---

## Run, test, verify

| What                         | Command                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| **Bring up the stack**       | `cp .env.example .env && docker compose up -d`                                          |
| Backend e2e (Testcontainers) | `bun --filter @cleandrop/api test:e2e`                                                  |
| Browser e2e (Playwright)     | `bun --filter @cleandrop/web test:e2e` (first time: `bunx playwright install chromium`) |
| Build everything             | `bun run build`                                                                         |
| Tear down (keep data)        | `docker compose down`                                                                   |
| Tear down + drop volume      | `docker compose down -v`                                                                |

### Service URLs

| Surface              | Default URL                         | Override via `.env`     |
| -------------------- | ----------------------------------- | ----------------------- |
| Web app              | http://localhost:8080               | `WEB_HOST_PORT`         |
| API                  | http://localhost:3000               | `API_HOST_PORT`         |
| OpenAPI / Swagger UI | http://localhost:3000/api/docs      | follows `API_HOST_PORT` |
| OpenAPI JSON         | http://localhost:3000/api/docs-json | same                    |
| Postgres             | 5432 (host)                         | `POSTGRES_HOST_PORT`    |
| Health               | http://localhost:3000/healthz       | same                    |

If you change `API_HOST_PORT`, also change `VITE_API_URL` and rebuild web (`docker compose build web`) — the URL is baked into the bundle at build time.

### Test scoreboard

| Suite                             | Count  | Wall-clock | What it proves                                                                        |
| --------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------- |
| `auth.e2e-spec.ts`                | 7      | ~5s        | Login happy/sad paths, `/me` guard                                                    |
| `refresh.e2e-spec.ts`             | 7      | ~6s        | Rotation chain, reuse-detection cascade, concurrent-rotation race, logout idempotency |
| `services.e2e-spec.ts`            | 15     | ~4s        | Filters, ILIKE search, sort + `id ASC` tiebreaker, pagination boundaries              |
| `summary.e2e-spec.ts`             | 3      | ~3s        | Counts + avg match fixture                                                            |
| `services-crud.e2e-spec.ts`       | 14     | ~5s        | Role-gated mutations, validation errors, FK 404s                                      |
| `auth.spec.ts` (Playwright)       | 6      | ~3s        | Browser login flow, redirects, sidebar identity                                       |
| `catalog.spec.ts` (Playwright)    | 8      | ~5s        | Filter/sort/pagination, role-hidden affordances, clear-filters regression             |
| `admin-crud.spec.ts` (Playwright) | 3      | ~5s        | Sheet create → edit → delete; UI-bypass 403                                           |
| `polish.spec.ts` (Playwright)     | 2      | ~2s        | Sidebar collapse persistence, demo-creds copy + "Use"                                 |
| **Total**                         | **65** | **~35s**   |                                                                                       |

---

## API contract

Hit Swagger UI at http://localhost:3000/api/docs (no auth needed to read; click **Authorize** with a Bearer JWT to try protected endpoints live). The spec is regenerated from the Zod schemas every time the api boots — it can't drift.

| Method   | Path                | Auth             | Notes                                                         |
| -------- | ------------------- | ---------------- | ------------------------------------------------------------- |
| `POST`   | `/auth/login`       | none             | Returns `{ accessToken, refreshToken, user }`                 |
| `POST`   | `/auth/refresh`     | none             | Rotates; replaying a revoked token → cascade revoke + 401     |
| `POST`   | `/auth/logout`      | none             | Revokes the presented refresh token (idempotent)              |
| `GET`    | `/me`               | bearer           | Echoes the user from the JWT                                  |
| `GET`    | `/services`         | bearer           | `?search=&status=&category=&sortBy=&sortDir=&page=&pageSize=` |
| `GET`    | `/services/summary` | bearer           | Aggregates for the four cards                                 |
| `GET`    | `/services/:id`     | bearer           | 404 on miss                                                   |
| `POST`   | `/services`         | bearer + `admin` | 201; FK violation on bad `companyId` → clean 404              |
| `PATCH`  | `/services/:id`     | bearer + `admin` | 200, 404 on miss; empty body → 400 (at-least-one-field rule)  |
| `DELETE` | `/services/:id`     | bearer + `admin` | 204, 404 on miss                                              |
| `GET`    | `/companies`        | bearer           | For the form's dropdown                                       |

---

## What's deliberately out of scope

- **Signup / password reset / account management.** Auth is a JWT issuance flow against seeded accounts. Adding self-service registration would be hours of work for zero signal on the rubric.
- **Multi-currency.** ADR 0001 documents the upgrade path; not implemented.
- **Per-company tenant scoping.** `Company` is a data attribute on `Service`, not an isolation boundary. CONTEXT.md explains why.
- **Audit log for mutations.** Worth doing in production; not part of this brief.
- **Optimistic UI updates on mutations.** Server-confirmed refetch was chosen for predictability. Easy upgrade later.
- **Real-time updates (WebSocket / SSE).** Not in scope.
- **Role management UI.** The two seeded roles are fixed.

---

## Useful pointers

- **[`task-goal.md`](./task-goal.md)** — the original challenge brief, verbatim (one of the two files the whole project started from).
- **[`CONTEXT.md`](./CONTEXT.md)** — domain glossary + compact stack-decisions table (the PRD distilled from the brief).
- **[`docs/adr/0001`](./docs/adr/0001-money-as-integer-cents-single-currency.md)** — why integer cents, single EUR.
- **[`docs/adr/0002`](./docs/adr/0002-refresh-token-rotation-with-reuse-detection.md)** — why rotation + reuse detection over httpOnly cookies.
- **[`docs/adr/0003`](./docs/adr/0003-zod-as-cross-stack-single-source-of-truth.md)** — why Zod everywhere.
- **[`docs/CHALLENGE.md`](./docs/CHALLENGE.md)** — an archived copy of the same brief, kept under `docs/`.
- **PR history** at https://github.com/juuni26/cleandrop/pulls — every slice has a PR with a test plan, walkthrough, and the bug log (when relevant).
