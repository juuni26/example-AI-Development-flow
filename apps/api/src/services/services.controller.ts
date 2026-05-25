import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import {
  createServiceSchema,
  listServicesQuerySchema,
  updateServiceSchema,
  type PaginatedServices,
  type Service,
  type ServicesSummary,
} from "@cleandrop/shared";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles, RolesGuard } from "../auth/roles";
import { ServicesService } from "./services.service";

class ListServicesQueryDto extends createZodDto(listServicesQuerySchema) {}
class CreateServiceDto extends createZodDto(createServiceSchema) {}
class UpdateServiceDto extends createZodDto(updateServiceSchema) {}

@ApiTags("services")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("services")
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  // The /summary and /:id routes are declared before the index so Nest's
  // route resolver picks the specific match.
  @Get("summary")
  @ApiOperation({ summary: "Aggregate counts + average base price across all services" })
  async summary(): Promise<ServicesSummary> {
    return this.services.summary();
  }

  @Get(":id")
  @ApiOperation({ summary: "Fetch a single service by id" })
  async findOne(@Param("id", new ParseUUIDPipe()) id: string): Promise<Service> {
    const found = await this.services.findById(id);
    if (!found) throw new NotFoundException(`Service ${id} not found`);
    return found;
  }

  @Get()
  @ApiOperation({ summary: "List services with search, filters, sort, and pagination" })
  async list(@Query() query: ListServicesQueryDto): Promise<PaginatedServices> {
    return this.services.list(query);
  }

  @Roles("admin")
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Create a service (admin only)" })
  async create(@Body() body: CreateServiceDto): Promise<Service> {
    return this.services.create(body);
  }

  @Roles("admin")
  @Patch(":id")
  @ApiOperation({ summary: "Update a service (admin only)" })
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpdateServiceDto,
  ): Promise<Service> {
    return this.services.update(id, body);
  }

  @Roles("admin")
  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a service (admin only)" })
  async remove(@Param("id", new ParseUUIDPipe()) id: string): Promise<void> {
    await this.services.remove(id);
  }
}
