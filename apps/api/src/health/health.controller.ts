import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SHARED_PACKAGE_NAME } from "@cleandrop/shared";

@ApiTags("health")
@Controller()
export class HealthController {
  @Get("healthz")
  @ApiOperation({ summary: "Liveness probe (also confirms the shared package is wired)" })
  @ApiResponse({
    status: 200,
    schema: { example: { status: "ok", shared: SHARED_PACKAGE_NAME } },
  })
  healthz(): { status: "ok"; shared: string } {
    return { status: "ok", shared: SHARED_PACKAGE_NAME };
  }
}
