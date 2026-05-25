import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import {
  listServicesQuerySchema,
  type PaginatedServices,
  type ServicesSummary,
} from "@cleandrop/shared";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { ServicesService } from "./services.service";

class ListServicesQueryDto extends createZodDto(listServicesQuerySchema) {}

@UseGuards(JwtAuthGuard)
@Controller("services")
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  // NOTE: the more specific `/services/summary` route is declared BEFORE the
  // index route so Nest's router resolves it first, not as `:id`-like input.
  @Get("summary")
  async summary(): Promise<ServicesSummary> {
    return this.services.summary();
  }

  @Get()
  async list(@Query() query: ListServicesQueryDto): Promise<PaginatedServices> {
    return this.services.list(query);
  }
}
