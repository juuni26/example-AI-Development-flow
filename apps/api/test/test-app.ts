import path from "node:path";
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { sql as drizzleSql } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { users } from "../src/db/schema";

export interface TestApp {
  app: INestApplication;
  container: StartedPostgreSqlContainer;
  cleanup: () => Promise<void>;
  /** Plaintext credentials of seeded users — these are what callers POST to /auth/login. */
  fixtures: {
    admin: { id: string; email: string; password: string };
    user: { id: string; email: string; password: string };
  };
}

const SEED = {
  admin: { email: "admin@cleandrop.test", password: "admin123", role: "admin" as const },
  user: { email: "user@cleandrop.test", password: "user123", role: "user" as const },
};

/**
 * Starts a fresh Postgres container, applies all migrations, seeds two users,
 * and boots a Nest application against that database. Caller is responsible
 * for invoking `cleanup` (closes the app and stops the container).
 */
export async function startTestApp(): Promise<TestApp> {
  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("cleandrop")
    .withUsername("cleandrop")
    .withPassword("cleandrop")
    .start();

  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET = "e2e-test-secret-key-needs-to-be-long-enough";
  process.env.ACCESS_TOKEN_TTL = "15m";

  // Apply migrations against the fresh container.
  const migrationClient = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: path.resolve(__dirname, "../drizzle"),
    });
  } finally {
    await migrationClient.end({ timeout: 5 });
  }

  // Seed two users.
  const seedClient = postgres(url, { max: 1 });
  const seedDb = drizzle(seedClient);
  const adminHash = await bcrypt.hash(SEED.admin.password, 4);
  const userHash = await bcrypt.hash(SEED.user.password, 4);
  await seedDb.insert(users).values([
    { email: SEED.admin.email, passwordHash: adminHash, role: SEED.admin.role },
    { email: SEED.user.email, passwordHash: userHash, role: SEED.user.role },
  ]);
  const seededRows = await seedDb.execute<{ id: string; email: string }>(
    drizzleSql`select id::text as id, email from users order by email`,
  );
  await seedClient.end({ timeout: 5 });

  const adminRow = seededRows.find((r) => r.email === SEED.admin.email);
  const userRow = seededRows.find((r) => r.email === SEED.user.email);
  if (!adminRow || !userRow) throw new Error("seed failed: expected rows not found");

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
      admin: { id: adminRow.id, email: SEED.admin.email, password: SEED.admin.password },
      user: { id: userRow.id, email: SEED.user.email, password: SEED.user.password },
    },
    async cleanup() {
      await app.close();
      await container.stop();
    },
  };
}
