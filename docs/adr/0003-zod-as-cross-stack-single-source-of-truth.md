# ADR 0003 — Zod schemas in `packages/shared` as the single source of truth

**Status:** Accepted
**Date:** 2026-05-25

## Context

The stack has four places that need to agree on the shape of API payloads:

1. **API request validation** (NestJS — usually class-validator decorators on DTO classes).
2. **API response typing** (NestJS controllers, TypeScript types for return values).
3. **Frontend form validation** (react-hook-form on the Add/Edit Service sheet).
4. **OpenAPI documentation** (generated for the evaluator and any future consumer).

The default NestJS-idiomatic path uses class-validator + class-transformer for (1), hand-written or generated types for (2) and (3), and `@nestjs/swagger` decorators for (4). The four representations drift independently — adding a field requires touching all four, and runtime/compile-time guarantees aren't bound to each other (a class field typed `string` with no decorator passes validation but breaks at runtime).

Zod offers a single schema that simultaneously provides runtime validation, static type inference (`z.infer`), and — via `nestjs-zod` — both a NestJS `ValidationPipe` and an OpenAPI/Swagger schema generator.

## Decision

- **All API DTOs are defined as Zod schemas in `packages/shared`.** One schema per request/response shape (`loginSchema`, `createServiceSchema`, `serviceResponseSchema`, `paginatedServicesSchema`, etc.).
- Static TypeScript types are derived via `type X = z.infer<typeof xSchema>` and re-exported from the same module.
- The NestJS API uses `nestjs-zod`'s `ZodValidationPipe` globally; controllers accept schema-bound DTOs.
- OpenAPI generation uses `nestjs-zod`'s Swagger integration so the spec at `/api/docs` is regenerated from the same Zod definitions — no separate `@ApiBody` annotations to drift.
- The web app imports the schemas from `packages/shared` and uses them with react-hook-form's `zodResolver` for the Add/Edit Service form.
- `packages/shared` stays **type-only at runtime** — Zod imports are tree-shaken on the web build and erased to declarations on the API. No workspace-resolution gymnastics in Docker.

## Consequences

**Positive.** A single edit to a schema propagates to validation, types, OpenAPI docs, and form rules across the entire stack — no drift is structurally possible. Strong TypeScript signal for the rubric. Cuts ~3 alternative tools (class-validator, separate frontend validator, manual Swagger annotations).

**Negative.** Departs from NestJS-101 tutorials, which assume class-validator. An evaluator looking specifically for `@IsString()` decorators won't see them. `nestjs-zod` is a third-party dep (mature, well-maintained) added to the dependency surface.

**Reversibility.** Migrating away from Zod would require rewriting every DTO in class-validator form and re-annotating every controller for Swagger — meaningful work, but the *shapes* in `packages/shared` would still serve as the spec for that migration. The decision is reversible but expensive.
