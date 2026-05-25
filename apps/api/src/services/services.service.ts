import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type {
  CreateServiceRequest,
  ListServicesQuery,
  PaginatedServices,
  Service,
  ServicesSummary,
  SortableColumn,
  SortDir,
  UpdateServiceRequest,
} from "@cleandrop/shared";
import { DB_TOKEN, type Db } from "../db/db.module";
import { companies, services } from "../db/schema";

@Injectable()
export class ServicesService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async list(query: ListServicesQuery): Promise<PaginatedServices> {
    const conditions = this.buildWhere(query);
    const where = conditions.length ? and(...conditions) : undefined;

    const orderBy = this.buildOrderBy(query.sortBy, query.sortDir);
    const limit = query.pageSize;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        category: services.category,
        status: services.status,
        durationMinutes: services.durationMinutes,
        basePriceCents: services.basePriceCents,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
        companyId: companies.id,
        companyName: companies.name,
      })
      .from(services)
      .innerJoin(companies, eq(services.companyId, companies.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const totalRows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(services)
      .innerJoin(companies, eq(services.companyId, companies.id))
      .where(where);

    const data: Service[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      company: { id: r.companyId, name: r.companyName },
      status: r.status,
      durationMinutes: r.durationMinutes,
      basePriceCents: r.basePriceCents,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      data,
      total: totalRows[0]?.count ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string): Promise<Service | undefined> {
    const rows = await this.db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        category: services.category,
        status: services.status,
        durationMinutes: services.durationMinutes,
        basePriceCents: services.basePriceCents,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
        companyId: companies.id,
        companyName: companies.name,
      })
      .from(services)
      .innerJoin(companies, eq(services.companyId, companies.id))
      .where(eq(services.id, id))
      .limit(1);
    const r = rows[0];
    if (!r) return undefined;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      company: { id: r.companyId, name: r.companyName },
      status: r.status,
      durationMinutes: r.durationMinutes,
      basePriceCents: r.basePriceCents,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async create(input: CreateServiceRequest): Promise<Service> {
    // Validate the FK by hand so the client gets a clean 404 instead of a
    // raw "violates foreign key constraint" 500.
    const company = await this.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, input.companyId))
      .limit(1);
    if (company.length === 0) {
      throw new NotFoundException(`Company ${input.companyId} not found`);
    }

    const [row] = await this.db
      .insert(services)
      .values({
        name: input.name,
        description: input.description,
        category: input.category,
        companyId: input.companyId,
        status: input.status,
        durationMinutes: input.durationMinutes,
        basePriceCents: input.basePriceCents,
      })
      .returning({ id: services.id });

    const created = await this.findById(row.id);
    if (!created) throw new NotFoundException("Service not found after create");
    return created;
  }

  async update(id: string, input: UpdateServiceRequest): Promise<Service> {
    if (input.companyId) {
      const company = await this.db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.id, input.companyId))
        .limit(1);
      if (company.length === 0) {
        throw new NotFoundException(`Company ${input.companyId} not found`);
      }
    }

    const [row] = await this.db
      .update(services)
      .set({
        ...input,
        updatedAt: sql`now()`,
      })
      .where(eq(services.id, id))
      .returning({ id: services.id });

    if (!row) {
      throw new NotFoundException(`Service ${id} not found`);
    }

    const updated = await this.findById(row.id);
    if (!updated) throw new NotFoundException("Service not found after update");
    return updated;
  }

  async remove(id: string): Promise<void> {
    const [row] = await this.db
      .delete(services)
      .where(eq(services.id, id))
      .returning({ id: services.id });
    if (!row) {
      throw new NotFoundException(`Service ${id} not found`);
    }
  }

  /**
   * Single round-trip aggregate over the services table. AVG returns NULL
   * when there are no rows; we surface that as `null` for the card to render
   * an em-dash instead of "EUR 0".
   */
  async summary(): Promise<ServicesSummary> {
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${services.status} = 'Active')::int`,
        drafts: sql<number>`count(*) filter (where ${services.status} = 'Draft')::int`,
        // AVG returns numeric; round to integer cents. NULL stays NULL.
        avgBasePriceCents: sql<number | null>`(avg(${services.basePriceCents}))::int`,
      })
      .from(services);

    return {
      total: row?.total ?? 0,
      active: row?.active ?? 0,
      drafts: row?.drafts ?? 0,
      avgBasePriceCents: row?.avgBasePriceCents ?? null,
    };
  }

  private buildWhere(query: ListServicesQuery): SQL[] {
    const where: SQL[] = [];
    if (query.search) {
      const pattern = `%${query.search}%`;
      const searchClause = or(ilike(services.name, pattern), ilike(services.description, pattern));
      if (searchClause) where.push(searchClause);
    }
    if (query.status) where.push(eq(services.status, query.status));
    if (query.category) where.push(eq(services.category, query.category));
    return where;
  }

  /**
   * Maps the public sortBy column onto the actual DB column. Always appends
   * `services.id ASC` as a tiebreaker so pagination is deterministic when
   * the primary sort key has duplicates (e.g. two Active rows by status).
   */
  private buildOrderBy(sortBy: SortableColumn | undefined, dir: SortDir | undefined): SQL[] {
    const direction = dir ?? "desc";
    const apply = direction === "asc" ? asc : desc;

    let primary: SQL;
    switch (sortBy) {
      case "name":
        primary = apply(services.name);
        break;
      case "category":
        primary = apply(services.category);
        break;
      case "company":
        primary = apply(companies.name);
        break;
      case "status":
        primary = apply(services.status);
        break;
      case "duration":
        primary = apply(services.durationMinutes);
        break;
      case "basePrice":
        primary = apply(services.basePriceCents);
        break;
      default:
        // Default: newest first.
        primary = desc(services.createdAt);
    }

    return [primary, asc(services.id)];
  }
}
