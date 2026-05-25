import path from "node:path";
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { applySeed, SEED_SERVICES, SEED_USERS } from "../src/db/fixtures";

export interface TestApp {
  app: INestApplication;
  container: StartedPostgreSqlContainer;
  cleanup: () => Promise<void>;
  /** Plaintext credentials of seeded users — what callers POST to /auth/login. */
  fixtures: {
    admin: { id: string; email: string; password: string };
    user: { id: string; email: string; password: string };
    serviceCount: number;
  };
}

/**
 * Starts a fresh Postgres container, applies all migrations, seeds the full
 * fixture (users + companies + services), and boots a Nest application
 * against that database. Caller is responsible for invoking `cleanup`.
 */
async function startContainerWithRetry(
  attempts = 3,
): Promise<StartedPostgreSqlContainer> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await new PostgreSqlContainer("postgres:16-alpine")
        .withDatabase("cleandrop")
        .withUsername("cleandrop")
        .withPassword("cleandrop")
        .start();
    } catch (err) {
      lastError = err;
      // Docker Desktop on macOS occasionally fails the first bind on a freshly
      // started container. Brief backoff and retry rather than failing the
      // whole suite for a transient infra issue.
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
  throw lastError;
}

export async function startTestApp(): Promise<TestApp> {
  const container = await startContainerWithRetry();

  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET = "e2e-test-secret-key-needs-to-be-long-enough";
  process.env.ACCESS_TOKEN_TTL = "15m";

  const migrationClient = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: path.resolve(__dirname, "../drizzle"),
    });
  } finally {
    await migrationClient.end({ timeout: 5 });
  }

  // Cheap bcrypt cost in tests; we are not benchmarking hashes.
  const seedClient = postgres(url, { max: 1 });
  const seedDb = drizzle(seedClient);
  await applySeed(seedDb, 4);

  const seededUsers = await seedDb.execute<{ id: string; email: string }>(
    sql`select id::text as id, email from users order by email`,
  );
  await seedClient.end({ timeout: 5 });

  const adminRow = seededUsers.find((r) => r.email === SEED_USERS[0].email);
  const userRow = seededUsers.find((r) => r.email === SEED_USERS[1].email);
  if (!adminRow || !userRow) throw new Error("seed failed: expected users not found");

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.enableShutdownHooks();
  await app.init();

  return {
    app,
    container,
    fixtures: {
      admin: { id: adminRow.id, email: SEED_USERS[0].email, password: SEED_USERS[0].password },
      user: { id: userRow.id, email: SEED_USERS[1].email, password: SEED_USERS[1].password },
      serviceCount: SEED_SERVICES.length,
    },
    async cleanup() {
      await app.close();
      await container.stop();
    },
  };
}
