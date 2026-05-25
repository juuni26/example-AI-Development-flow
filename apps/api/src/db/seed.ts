import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { applySeed } from "./fixtures";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const client = postgres(url, { max: 1 });
  try {
    const counts = await applySeed(drizzle(client));
    console.log(
      `[seed] users=${counts.userCount} companies=${counts.companyCount} services=${counts.serviceCount}`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
