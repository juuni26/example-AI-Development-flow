import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import path from "node:path";
import { existsSync } from "node:fs";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const migrationsFolder = path.resolve(__dirname, "../../drizzle");

  if (!existsSync(migrationsFolder)) {
    console.log(`[migrate] no migrations folder at ${migrationsFolder} — nothing to apply yet`);
    process.exit(0);
  }

  console.log(`[migrate] applying migrations from ${migrationsFolder}`);
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder });
    console.log("[migrate] done");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
