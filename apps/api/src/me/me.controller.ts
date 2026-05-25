import { Controller, Get, UseGuards } from "@nestjs/common";
import type { User } from "@cleandrop/shared";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import type { AccessTokenPayload } from "@cleandrop/shared";

@UseGuards(JwtAuthGuard)
@Controller("me")
export class MeController {
  @Get()
  me(@CurrentUser() user: AccessTokenPayload): User {
    return { id: user.sub, email: user.email, role: user.role };
  }
}
