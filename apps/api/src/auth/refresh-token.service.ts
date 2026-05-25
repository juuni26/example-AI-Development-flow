import crypto from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import { DB_TOKEN, type Db } from "../db/db.module";
import { refreshTokens, type RefreshTokenRow } from "../db/schema";

const REFRESH_TOKEN_BYTES = 32; // 256 bits
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface IssuedRefresh {
  /** The opaque token returned to the client; only ever in memory and the client. */
  plaintext: string;
  /** The DB row id, useful when rotating so we can link `replaced_by_id`. */
  rowId: string;
}

/**
 * Outcome of a rotation exchange. Encodes every state the caller needs to
 * react to. The cascade-revoke for `reused` has already been performed
 * before this value is returned — the caller's only job is to map the
 * outcome to an HTTP response (and, on `ok`, issue the new pair).
 *
 * - `ok`: token was valid and unexpired; the presented row is now revoked
 *   and `previousRowId` should be passed to `issue()` as `replacedById`
 *   so the rotation chain is linkable.
 * - `invalid`: no row matches the presented token (unknown / forged).
 * - `expired`: row was claimed but its `expires_at` is in the past. No
 *   cascade — same outcome as "freshly expired."
 * - `reused`: row exists but was already revoked. Cascade has been
 *   triggered (every refresh row for the user is now revoked).
 */
export type RotationOutcome =
  | { kind: "ok"; userId: string; previousRowId: string }
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "reused" };

type ClaimResult =
  | { kind: "claimed"; rowId: string; userId: string; expiresAt: Date }
  | { kind: "not_found" }
  | { kind: "already_revoked"; userId: string };

@Injectable()
export class RefreshTokenService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  /**
   * Generates a new opaque refresh token, stores its SHA-256 hash, and returns
   * both the plaintext (for the client) and the row id (for rotation links).
   */
  async issue(userId: string, replacedById?: string): Promise<IssuedRefresh> {
    const plaintext = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
    const tokenHash = this.hash(plaintext);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const [row] = await this.db
      .insert(refreshTokens)
      .values({ userId, tokenHash, expiresAt, replacedById })
      .returning({ id: refreshTokens.id });

    return { plaintext, rowId: row.id };
  }

  /**
   * Runs the rotation decision end-to-end: atomic claim → expiry check →
   * reuse-detection cascade. The whole security invariant lives here so a
   * reader doesn't have to cross files to answer "what happens when X is
   * presented?". The caller maps the returned {@link RotationOutcome} to an
   * HTTP response and, on `ok`, issues the new pair linked via
   * `previousRowId`.
   */
  async exchange(plaintext: string): Promise<RotationOutcome> {
    const claim = await this.claimForRotation(plaintext);

    if (claim.kind === "not_found") return { kind: "invalid" };

    if (claim.kind === "already_revoked") {
      // Reuse attack (or a lost race against a concurrent refresh from the
      // same client). Defensive move: kill every refresh row for this user.
      // Legitimate concurrent flows recover by re-authenticating.
      await this.revokeAllForUser(claim.userId);
      return { kind: "reused" };
    }

    if (claim.expiresAt.getTime() <= Date.now()) {
      // Row was claimed (and thus revoked) but it's expired. Same outcome
      // as a freshly-expired token — no cascade.
      return { kind: "expired" };
    }

    return { kind: "ok", userId: claim.userId, previousRowId: claim.rowId };
  }

  /**
   * Atomically attempts to claim a refresh token for rotation. Uses a single
   * SQL statement (`UPDATE … WHERE token_hash = $1 AND revoked_at IS NULL
   * RETURNING …`) so concurrent refreshes presenting the same token
   * deterministically resolve to one winner — exactly one row is updated,
   * losers see `already_revoked`.
   */
  private async claimForRotation(plaintext: string): Promise<ClaimResult> {
    const tokenHash = this.hash(plaintext);

    // Step 1 — atomic claim.
    const claimed = await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .returning({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        expiresAt: refreshTokens.expiresAt,
      });

    if (claimed.length === 1) {
      return {
        kind: "claimed",
        rowId: claimed[0].id,
        userId: claimed[0].userId,
        expiresAt: claimed[0].expiresAt,
      };
    }

    // Step 2 — figure out why we got 0 rows.
    const existing = await this.db
      .select({ userId: refreshTokens.userId, revokedAt: refreshTokens.revokedAt })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (existing.length === 0) return { kind: "not_found" };
    return { kind: "already_revoked", userId: existing[0].userId };
  }

  /**
   * Finds a refresh-token row by plaintext (we only ever store hashes).
   * Returns undefined when no row matches the hash. Used by the logout
   * path where we don't need the atomicity guarantees of claimForRotation.
   */
  async findByPlaintext(plaintext: string): Promise<RefreshTokenRow | undefined> {
    const tokenHash = this.hash(plaintext);
    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    return rows[0];
  }

  /** Marks a single row revoked (now()). No-op if it was already revoked. */
  async revoke(id: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
  }

  /**
   * Reuse detection cascade: when a previously-revoked token is presented
   * again, revoke EVERY refresh row for that user. The attacker holds a
   * stolen token; the legitimate client is forced to log in again.
   * Invoked from {@link exchange} on the `reused` path.
   */
  private async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  /**
   * Garbage-collects expired and long-revoked refresh tokens. Safe to run
   * repeatedly; idempotent. Returns the row count for observability.
   *
   * Keeps recently-revoked rows for 30 days so reuse detection can still see
   * the `replaced_by_id` chain. Expired rows are deleted immediately since
   * they can no longer participate in rotation.
   */
  async cleanup(): Promise<{ deleted: number }> {
    const result = await this.db.execute<{ count: number }>(
      sql`
        with deleted as (
          delete from refresh_tokens
          where expires_at < now()
             or (revoked_at is not null and revoked_at < now() - interval '30 days')
          returning id
        )
        select count(*)::int as count from deleted
      `,
    );
    return { deleted: result[0]?.count ?? 0 };
  }

  hash(plaintext: string): string {
    return crypto.createHash("sha256").update(plaintext).digest("hex");
  }
}
