import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { users } from "./schema";

const BCRYPT_COST = 10;

// Two seeded accounts — credentials are documented in the README and are
// the only way to log in (no signup endpoint exists by design).
const SEED_USERS = [
  { email: "admin@cleandrop.test", password: "admin123", role: "admin" as const },
  { email: "user@cleandrop.test", password: "user123", role: "user" as const },
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  try {
    for (const u of SEED_USERS) {
      const passwordHash = await bcrypt.hash(u.password, BCRYPT_COST);
      // Insert if missing, leave existing rows untouched so repeated `compose up`
      // runs are no-ops and don't churn password hashes.
      await db
        .insert(users)
        .values({ email: u.email, passwordHash, role: u.role })
        .onConflictDoNothing({ target: users.email });
    }

    const [{ count }] = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from users`,
    );
    console.log(`[seed] users table now contains ${count} row(s)`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
