import { Inject, Injectable } from "@nestjs/common";
import { asc } from "drizzle-orm";
import type { CompanySummary } from "@cleandrop/shared";
import { DB_TOKEN, type Db } from "../db/db.module";
import { companies } from "../db/schema";

@Injectable()
export class CompaniesService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async list(): Promise<CompanySummary[]> {
    const rows = await this.db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .orderBy(asc(companies.name));
    return rows;
  }
}
