import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import type {
  AccessTokenPayload,
  LoginResponse,
  RefreshResponse,
} from "@cleandrop/shared";
import { UsersService } from "../users/users.service";
import { loadEnv } from "../config/env";
import { RefreshTokenService } from "./refresh-token.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refresh: RefreshTokenService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.users.findByEmail(email);

    // bcrypt.compare against a placeholder hash when the user does not exist
    // gives a constant-time-ish path that does not leak which input was wrong.
    const passwordOk = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, "$2b$10$invalidsaltforthrowawaycompare......................");

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
   * new), and returns a fresh access+refresh pair. If the token is unknown,
   * expired, or already revoked, throws 401. Presenting a revoked token also
   * cascade-revokes all of that user's refresh rows (reuse detection).
   */
  async refreshTokens(refreshToken: string): Promise<RefreshResponse> {
    const row = await this.refresh.findByPlaintext(refreshToken);
    if (!row) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (row.revokedAt !== null) {
      // Reuse detection — someone is presenting an already-rotated token.
      await this.refresh.revokeAllForUser(row.userId);
      throw new UnauthorizedException("Refresh token reuse detected; session terminated");
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      // Treat expired tokens like revoked ones (revoke proactively so the row
      // doesn't keep showing as live).
      await this.refresh.revoke(row.id);
      throw new UnauthorizedException("Refresh token expired");
    }

    const user = await this.users.findById(row.userId);
    if (!user) {
      // Defensive — user was deleted between issuing and refresh.
      await this.refresh.revoke(row.id);
      throw new UnauthorizedException("User no longer exists");
    }

    // Rotate: revoke the old row, mint a new one linked back to it.
    await this.refresh.revoke(row.id);
    const accessToken = await this.signAccessToken(user.id, user.email, user.role);
    const { plaintext: nextRefresh } = await this.refresh.issue(user.id, row.id);

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
    const env = loadEnv();
    const payload: AccessTokenPayload = { sub, email, role };
    return this.jwt.signAsync(payload, {
      secret: env.JWT_SECRET,
      expiresIn: env.ACCESS_TOKEN_TTL,
    });
  }
}
