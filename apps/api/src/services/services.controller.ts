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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
import { examples } from "../openapi-examples";
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
  @ApiResponse({
    status: 200,
    description: "Catalog-wide aggregates. `avgBasePriceCents` is null when no services exist.",
    schema: { example: examples.servicesSummary },
  })
  @ApiResponse({ status: 401, schema: { example: examples.unauthorized } })
  async summary(): Promise<ServicesSummary> {
    return this.services.summary();
  }

  @Get(":id")
  @ApiOperation({ summary: "Fetch a single service by id" })
  @ApiResponse({ status: 200, schema: { example: examples.service } })
  @ApiResponse({ status: 401, schema: { example: examples.unauthorized } })
  @ApiResponse({
    status: 404,
    schema: {
      example: { statusCode: 404, message: "Service <uuid> not found", error: "Not Found" },
    },
  })
  async findOne(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<Service> {
    const found = await this.services.findById(id);
    if (!found) throw new NotFoundException(`Service ${id} not found`);
    return found;
  }

  @Get()
  @ApiOperation({ summary: "List services with search, filters, sort, and pagination" })
  @ApiResponse({
    status: 200,
    description:
      "Paginated services. Default sort is `createdAt DESC` with `id ASC` as a stable tiebreaker.",
    schema: { example: examples.servicesList },
  })
  @ApiResponse({ status: 401, schema: { example: examples.unauthorized } })
  async list(@Query() query: ListServicesQueryDto): Promise<PaginatedServices> {
    return this.services.list(query);
  }

  @Roles("admin")
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Create a service (admin only)" })
  @ApiResponse({ status: 201, schema: { example: examples.service } })
  @ApiResponse({ status: 401, schema: { example: examples.unauthorized } })
  @ApiResponse({
    status: 403,
    description: "Authenticated but not an admin.",
    schema: { example: examples.forbidden },
  })
  async create(@Body() body: CreateServiceDto): Promise<Service> {
    return this.services.create(body);
  }

  @Roles("admin")
  @Patch(":id")
  @ApiOperation({ summary: "Update a service (admin only)" })
  @ApiResponse({ status: 200, schema: { example: examples.service } })
  @ApiResponse({ status: 401, schema: { example: examples.unauthorized } })
  @ApiResponse({ status: 403, schema: { example: examples.forbidden } })
  async update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: UpdateServiceDto,
  ): Promise<Service> {
    return this.services.update(id, body);
  }

  @Roles("admin")
  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a service (admin only)" })
  @ApiResponse({ status: 204, description: "Deleted." })
  @ApiResponse({ status: 401, schema: { example: examples.unauthorized } })
  @ApiResponse({ status: 403, schema: { example: examples.forbidden } })
  async remove(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<void> {
    await this.services.remove(id);
  }
}
