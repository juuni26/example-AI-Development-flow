import { Controller, Get, UseGuards } from "@nestjs/common";
import type { CompanySummary } from "@cleandrop/shared";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CompaniesService } from "./companies.service";

@UseGuards(JwtAuthGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  async list(): Promise<CompanySummary[]> {
    return this.companies.list();
  }
}
