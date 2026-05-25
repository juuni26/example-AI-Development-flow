import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import type {
  AccessTokenPayload,
  LoginResponse,
  RefreshResponse,
} from "@cleandrop/shared";
import { UsersService } from "../users/users.service";
import { RefreshTokenService } from "./refresh-token.service";

// Reusable placeholder for the constant-time-ish compare when a user does not
// exist — generated once at module load instead of inline-formed each request.
// The exact bytes are inert (no real password will hash to this); the point is
// to keep the bcrypt CPU work present so that "unknown user" and "wrong
// password" paths take the same wall-clock time.
const PLACEHOLDER_HASH = bcrypt.hashSync("__cleandrop_unknown_user_placeholder__", 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refresh: RefreshTokenService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.users.findByEmail(email);

    // Compare against a placeholder hash when the user does not exist so the
    // path takes the same wall-clock time regardless of which input was wrong.
    const passwordOk = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, PLACEHOLDER_HASH);

    if (!user || !passwordOk) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const accessToken = await this.signAccessToken(user.id, user.email, user.role);
    const { plaintext: refreshToken } = await this.refresh.issue(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  /**
   * Validates the presented refresh token, rotates it (revokes old + issues
   * new), and returns a fresh access+refresh pair.
   *
   * The "claim" step is a single atomic `UPDATE … RETURNING` (see
   * {@link RefreshTokenService.claimForRotation}). Two concurrent refresh
   * calls presenting the same token deterministically resolve to one
   * winner — losers receive `already_revoked`, which triggers the
   * reuse-detection cascade. This eliminates the read-then-write race
   * window that a `find → check → revoke → issue` sequence would have.
   */
  async refreshTokens(refreshToken: string): Promise<RefreshResponse> {
    const claim = await this.refresh.claimForRotation(refreshToken);

    if (claim.kind === "not_found") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (claim.kind === "already_revoked") {
      // Either a reuse attack or we lost the race to a concurrent refresh
      // from the same client. Defensive move: kill every refresh row for
      // this user. Legitimate concurrent flows recover by re-authenticating.
      await this.refresh.revokeAllForUser(claim.userId);
      throw new UnauthorizedException("Refresh token reuse detected; session terminated");
    }

    if (claim.expiresAt.getTime() <= Date.now()) {
      // Row was claimed (revoked) but it's expired — same outcome as a
      // freshly-expired token. No cascade.
      throw new UnauthorizedException("Refresh token expired");
    }

    const user = await this.users.findById(claim.userId);
    if (!user) {
      // Defensive — user was deleted between issuing and refresh.
      throw new UnauthorizedException("User no longer exists");
    }

    const accessToken = await this.signAccessToken(user.id, user.email, user.role);
    const { plaintext: nextRefresh } = await this.refresh.issue(user.id, claim.rowId);

    return { accessToken, refreshToken: nextRefresh };
  }

  /** Revokes the single refresh row matching the presented token (idempotent). */
  async logout(refreshToken: string): Promise<void> {
    const row = await this.refresh.findByPlaintext(refreshToken);
    if (row && row.revokedAt === null) {
      await this.refresh.revoke(row.id);
    }
  }

  private async signAccessToken(
    sub: string,
    email: string,
    role: "admin" | "user",
  ): Promise<string> {
    const payload: AccessTokenPayload = { sub, email, role };
    // JwtModule was configured with the secret + expiresIn at module load —
    // no need to read env on every sign.
    return this.jwt.signAsync(payload, { algorithm: "HS256" });
  }
}
