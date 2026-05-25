import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { User } from "@cleandrop/shared";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import type { AccessTokenPayload } from "@cleandrop/shared";
import { examples } from "../openapi-examples";

@ApiTags("me")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("me")
export class MeController {
  @Get()
  @ApiOperation({ summary: "Echoes the user resolved from the bearer JWT" })
  @ApiResponse({ status: 200, schema: { example: examples.login.success.user } })
  @ApiResponse({ status: 401, schema: { example: examples.unauthorized } })
  me(@CurrentUser() user: AccessTokenPayload): User {
    return { id: user.sub, email: user.email, role: user.role };
  }
}
