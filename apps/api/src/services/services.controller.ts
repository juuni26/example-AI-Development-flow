import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { listServicesQuerySchema, type PaginatedServices } from "@cleandrop/shared";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { ServicesService } from "./services.service";

class ListServicesQueryDto extends createZodDto(listServicesQuerySchema) {}

@UseGuards(JwtAuthGuard)
@Controller("services")
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  async list(@Query() query: ListServicesQueryDto): Promise<PaginatedServices> {
    return this.services.list(query);
  }
}
