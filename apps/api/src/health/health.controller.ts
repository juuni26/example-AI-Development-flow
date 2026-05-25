import { Controller, Get } from "@nestjs/common";
import { SHARED_PACKAGE_NAME } from "@cleandrop/shared";

@Controller()
export class HealthController {
  @Get("healthz")
  healthz(): { status: "ok"; shared: string } {
    return { status: "ok", shared: SHARED_PACKAGE_NAME };
  }
}
