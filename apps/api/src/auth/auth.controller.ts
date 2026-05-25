import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createZodDto } from "nestjs-zod";
import {
  loginRequestSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  type LoginResponse,
  type RefreshResponse,
} from "@cleandrop/shared";
import { AuthService } from "./auth.service";

class LoginDto extends createZodDto(loginRequestSchema) {}
class RefreshDto extends createZodDto(refreshRequestSchema) {}
class LogoutDto extends createZodDto(logoutRequestSchema) {}

// Tighter rate limit on every auth endpoint. The `auth` bucket is 10/min/IP
// vs the global `default` 60/min/IP — keeps credential stuffing + refresh-
// token brute force off the front door without affecting normal browsing.
@ApiTags("auth")
@Throttle({ auth: { limit: 10, ttl: 60_000 } })
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @ApiOperation({
    summary: "Exchange email + password for an access JWT and refresh token",
  })
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.auth.login(body.email, body.password);
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Rotate the refresh token. Replaying a revoked token cascade-revokes the whole chain.",
  })
  async refresh(@Body() body: RefreshDto): Promise<RefreshResponse> {
    return this.auth.refreshTokens(body.refreshToken);
  }

  @Post("logout")
  @HttpCode(204)
  @ApiOperation({ summary: "Revoke the presented refresh token (idempotent)" })
  async logout(@Body() body: LogoutDto): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }
}
