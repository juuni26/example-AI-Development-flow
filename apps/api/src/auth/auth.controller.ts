import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
import { examples } from "../openapi-examples";

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
  @ApiResponse({
    status: 200,
    description: "Authenticated. Returns access + refresh tokens and the user.",
    schema: { example: examples.login.success },
  })
  @ApiResponse({
    status: 400,
    description: "Malformed body (failed Zod validation).",
    schema: { example: examples.login.badBody },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid email or password. Does not distinguish which field was wrong.",
    schema: { example: examples.login.invalidCredentials },
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
  @ApiResponse({
    status: 200,
    description: "Rotated. Old refresh row is revoked; the returned pair is the new active session.",
    schema: { example: examples.refresh.success },
  })
  @ApiResponse({
    status: 401,
    description:
      "Token unknown, expired, or already revoked. Reuse of a revoked token cascade-revokes every refresh row for the user.",
    schema: { example: examples.refresh.reused },
  })
  async refresh(@Body() body: RefreshDto): Promise<RefreshResponse> {
    return this.auth.refreshTokens(body.refreshToken);
  }

  @Post("logout")
  @HttpCode(204)
  @ApiOperation({ summary: "Revoke the presented refresh token (idempotent)" })
  @ApiResponse({ status: 204, description: "Revoked (or already revoked — idempotent)." })
  async logout(@Body() body: LogoutDto): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }
}
