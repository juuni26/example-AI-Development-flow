# ADR 0002 — Refresh tokens in localStorage with server-side rotation and reuse detection

**Status:** Accepted
**Date:** 2026-05-25

## Context

Access JWTs are short-lived (15 min) and stored in `localStorage` to avoid the cookie/CORS complexity of a Docker compose setup where the browser-facing and container-internal hostnames differ. Refresh tokens were promoted from "nice to have" to required scope (see [[project-scope-nice-to-haves]]).

That leaves the question of *where* the refresh token lives and whether it rotates. Three options:

1. **Refresh in localStorage, no rotation.** Simple, but a 7-day refresh token next to the access token has the same XSS exposure for the same window — most of the security improvement evaporates.
2. **Refresh in httpOnly + Secure + SameSite cookie.** Principled, but introduces CORS-with-credentials, requires an explicit origin allowlist, and cookie-domain configuration that's brittle across `docker compose` networking modes.
3. **Refresh in localStorage WITH server-side rotation and reuse detection.** Stateful on the server. Each refresh revokes the old token and issues a new one; presenting an already-revoked token triggers a cascade revoke of every refresh token for that user — i.e. the canonical OAuth 2.0 refresh-token-rotation-with-reuse-detection pattern.

## Decision

- Refresh tokens are opaque random 256-bit strings, 7-day TTL, stored in `localStorage` on the client.
- Server stores SHA-256 hashes only in `refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, replaced_by_id)`.
- `POST /auth/refresh` validates → revokes presented row → inserts a new row (with `replaced_by_id` linking back) → returns a fresh access + refresh pair.
- Presenting a refresh token whose row is already `revoked_at IS NOT NULL` triggers a **cascade revoke** of every refresh row for `user_id` (reuse detected = compromise).
- `POST /auth/logout` revokes the presented row only.
- Web client's axios response interceptor performs single-flight refresh on 401s, queues concurrent failures, retries each once after refresh, and bounces to `/login` on refresh failure.

## Consequences

**Positive.** XSS-exfiltrated refresh tokens are detectable and self-revoking: the moment the attacker uses one, the legitimate client's next refresh trips the cascade and severs the session. Logout actually revokes (no orphaned valid tokens). "Log out everywhere" comes for free (`DELETE FROM refresh_tokens WHERE user_id = ?`). Sidesteps all cookie/CORS complexity in the Docker setup.

**Negative.** Auth is no longer fully stateless — the DB is on the refresh path. Refresh contention requires single-flight handling on the client. Slightly more E2E test surface (rotation, reuse-detection cascade, expiry).

**Reversibility.** Moving to httpOnly cookies later is a focused change: refresh endpoint reads from cookie instead of body, axios sends `withCredentials`. Rotation logic stays the same. Reverting to a stateless single long-lived JWT would lose the security properties we built this for and is not anticipated.
