# ADR 0001 — Money as integer cents, single hardcoded currency (EUR)

**Status:** Accepted
**Date:** 2026-05-25

## Context

Services have a Base Price displayed in the catalog and aggregated as an "Avg. Base Price" summary card. The preview shows `EUR 159` — a single currency with no per-row currency indicator. We need a storage representation that survives `AVG` aggregations without rounding drift and a currency policy that matches the UI.

Three credible representations were considered: floating-point (rejected outright — `SUM`/`AVG` lose precision), `numeric(12,2)` (decimal, Drizzle-returned-as-string, easy display but looser semantics), and **integer minor units** (cents).

For currency: single hardcoded `EUR` vs per-service `currency char(3)`. Per-service currency makes "average price" incoherent without an FX layer that's far out of scope.

## Decision

- `services.base_price_cents` is `integer` (Postgres `int4`). All arithmetic, comparisons, and aggregations operate on cents.
- Currency is a single app-wide constant `'EUR'`, exported from a config module — **not** a column on `services` or any other table.
- Display formatting via a `formatMoney(cents, 'EUR')` helper in `packages/shared`, producing strings like `"EUR 159.00"`.

## Consequences

**Positive.** `AVG(base_price_cents)` is exact; the summary card never drifts. Cents fits any realistic service price in `int4`. Adding multi-currency later is a focused migration (add `currency` column with default `'EUR'`, lift the constant) with no schema changes to existing data.

**Negative.** Every read/write boundary needs to multiply or divide by 100 — handled in one schema-shared serializer. Display code can't naively interpolate the raw column value.

**Reversibility.** Moving from cents to `numeric(12,2)` is mechanical but touches every aggregation query and the shared schema. Moving to multi-currency requires a non-trivial product decision about what "average price" then means.
