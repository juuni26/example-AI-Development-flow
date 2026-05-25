import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDbClient(connectionString: string): {
  db: PostgresJsDatabase<typeof schema>;
  sql: ReturnType<typeof postgres>;
} {
  const sql = postgres(connectionString, { max: 10 });
  const db = drizzle(sql, { schema });
  return { db, sql };
}
