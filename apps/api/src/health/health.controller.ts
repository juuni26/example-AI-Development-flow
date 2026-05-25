import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SHARED_PACKAGE_NAME } from "@cleandrop/shared";

@ApiTags("health")
@Controller()
export class HealthController {
  @Get("healthz")
  @ApiOperation({ summary: "Liveness probe (also confirms the shared package is wired)" })
  healthz(): { status: "ok"; shared: string } {
    return { status: "ok", shared: SHARED_PACKAGE_NAME };
  }
}
