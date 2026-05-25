import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type {
  ListServicesQuery,
  PaginatedServices,
  Service,
  SortableColumn,
  SortDir,
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
