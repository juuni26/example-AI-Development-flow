import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from "@nestjs/common";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";
import { loadEnv } from "../config/env";

export const DB_TOKEN = "DRIZZLE_DB" as const;
export const SQL_TOKEN = "POSTGRES_SQL" as const;
export type Db = PostgresJsDatabase<typeof schema>;

@Injectable()
class DbLifecycle implements OnApplicationShutdown {
  constructor(@Inject(SQL_TOKEN) private readonly sql: Sql) {}

  async onApplicationShutdown(): Promise<void> {
    // 20s gives in-flight queries enough time to land without forcibly
    // cutting them on graceful shutdown. In tests + dev the pool is idle so
    // this still returns essentially instantly.
    await this.sql.end({ timeout: 20 });
  }
}

@Global()
@Module({
  providers: [
    {
      provide: SQL_TOKEN,
      useFactory: (): Sql => {
        const env = loadEnv();
        return postgres(env.DATABASE_URL, { max: 10 });
      },
    },
    {
      provide: DB_TOKEN,
      inject: [SQL_TOKEN],
      useFactory: (sql: Sql): Db => drizzle(sql, { schema }),
    },
    DbLifecycle,
  ],
  exports: [DB_TOKEN, SQL_TOKEN],
})
export class DbModule {}
