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
   * Finds a refresh-token row by plaintext (we only ever store hashes).
   * Returns undefined when no row matches the hash.
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
   * Reuse detection: when a previously-revoked token is presented again, the
   * canonical defensive move is to revoke EVERY refresh row for that user.
   * The attacker holds a stolen token; the legitimate client either has
   * already-rotated tokens (now all revoked) or is forced to log in again.
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  private hash(plaintext: string): string {
    return crypto.createHash("sha256").update(plaintext).digest("hex");
  }
}
