import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CompanySummary } from "@cleandrop/shared";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CompaniesService } from "./companies.service";

@ApiTags("companies")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: "List companies, alphabetised, for the catalog form" })
  async list(): Promise<CompanySummary[]> {
    return this.companies.list();
  }
}
