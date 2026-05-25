import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { CompanySummary } from "@cleandrop/shared";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { examples } from "../openapi-examples";
import { CompaniesService } from "./companies.service";

@ApiTags("companies")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: "List companies, alphabetised, for the catalog form" })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        { id: "1c4f7a91-aaaa-4bbb-8ccc-9dddee012345", name: "Acme Cleaning S.r.l." },
        { id: "2d5g8b02-bbbb-4ccc-9ddd-aeeefff12345", name: "BrightWave Facilities" },
      ],
    },
  })
  @ApiResponse({ status: 401, schema: { example: examples.unauthorized } })
  async list(): Promise<CompanySummary[]> {
    return this.companies.list();
  }
}
