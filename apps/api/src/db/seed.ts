import postgres from "postgres";

// Real seed fixtures (users, companies, services) arrive in subsequent slices.
// This runner exists now so the compose lifecycle (db -> migrate -> seed -> api)
// is wired end-to-end and proven idempotent before any data lands.
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  try {
    // Touch the DB so the seed step is observably alive in compose logs.
    const [{ now }] = await sql<{ now: Date }[]>`select now()`;
    console.log(`[seed] connected — server time ${now.toISOString()}; no fixtures defined yet`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
