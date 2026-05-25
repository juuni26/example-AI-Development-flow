// Single source of truth for the dev/test fixture. The compose `seed` service
// and the e2e test harness both import this so the README's "9 services,
// 6 Active, 2 Draft, 1 Inactive, avg EUR 159" claim holds in every context.

import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { companies, services, users } from "./schema";
import type * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

export const SEED_USERS = [
  { email: "admin@cleandrop.test", password: "Cleandrop!Admin-2026", role: "admin" as const },
  { email: "user@cleandrop.test", password: "Cleandrop!User-2026", role: "user" as const },
];

export const SEED_COMPANIES = [
  { name: "Acme Cleaning S.r.l." },
  { name: "BrightHome S.p.A." },
] as const;

type SeedService = {
  name: string;
  description: string;
  category: "Residential" | "Commercial" | "Specialty";
  companyName: (typeof SEED_COMPANIES)[number]["name"];
  status: "Active" | "Draft" | "Inactive";
  durationMinutes: number;
  basePriceCents: number;
};

export const SEED_SERVICES: SeedService[] = [
  {
    name: "Standard Clean",
    description: "Routine apartment cleaning package.",
    category: "Residential",
    companyName: "Acme Cleaning S.r.l.",
    status: "Active",
    durationMinutes: 90,
    basePriceCents: 8000,
  },
  {
    name: "Deep Clean",
    description: "Extended detail-focused cleaning service for homes that need a full reset.",
    category: "Residential",
    companyName: "Acme Cleaning S.r.l.",
    status: "Active",
    durationMinutes: 180,
    basePriceCents: 16000,
  },
  {
    name: "Office Daily Clean",
    description: "Daily office maintenance cleaning.",
    category: "Commercial",
    companyName: "Acme Cleaning S.r.l.",
    status: "Active",
    durationMinutes: 120,
    basePriceCents: 13000,
  },
  {
    name: "Post-Renovation Cleanup",
    description: "Dust and debris removal after works.",
    category: "Specialty",
    companyName: "Acme Cleaning S.r.l.",
    status: "Draft",
    durationMinutes: 240,
    basePriceCents: 29000,
  },
  {
    name: "Move-In / Move-Out",
    description: "Full reset clean for property handovers.",
    category: "Specialty",
    companyName: "BrightHome S.p.A.",
    status: "Active",
    durationMinutes: 210,
    basePriceCents: 24000,
  },
  {
    name: "Retail Floor Refresh",
    description: "Surface and floor-focused retail cleaning service.",
    category: "Commercial",
    companyName: "BrightHome S.p.A.",
    status: "Inactive",
    durationMinutes: 100,
    basePriceCents: 11000,
  },
  {
    name: "Window Cleaning",
    description: "Interior and exterior window service for storefronts and offices.",
    category: "Commercial",
    companyName: "BrightHome S.p.A.",
    status: "Active",
    durationMinutes: 60,
    basePriceCents: 7000,
  },
  {
    name: "Carpet Shampooing",
    description: "Deep carpet cleaning with extraction equipment.",
    category: "Residential",
    companyName: "BrightHome S.p.A.",
    status: "Active",
    durationMinutes: 150,
    basePriceCents: 15000,
  },
  {
    name: "Deep Sanitization",
    description: "Hospital-grade sanitization for medical and food-service facilities.",
    category: "Specialty",
    companyName: "Acme Cleaning S.r.l.",
    status: "Draft",
    durationMinutes: 180,
    basePriceCents: 20000,
  },
];

export interface SeedCounts {
  userCount: number;
  companyCount: number;
  serviceCount: number;
}

/** Inserts the fixture into an empty (or partially-seeded) database idempotently. */
export async function applySeed(db: Db, bcryptCost = 10): Promise<SeedCounts> {
  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, bcryptCost);
    await db
      .insert(users)
      .values({ email: u.email, passwordHash, role: u.role })
      .onConflictDoNothing({ target: users.email });
  }

  for (const c of SEED_COMPANIES) {
    await db.insert(companies).values({ name: c.name }).onConflictDoNothing({ target: companies.name });
  }

  const companyRows = await db.select().from(companies);
  const companyByName = new Map(companyRows.map((c) => [c.name, c.id]));

  for (const s of SEED_SERVICES) {
    const companyId = companyByName.get(s.companyName);
    if (!companyId) throw new Error(`seed: company not found: ${s.companyName}`);
    const existing = await db
      .select({ id: services.id })
      .from(services)
      .where(sql`${services.name} = ${s.name} and ${services.companyId} = ${companyId}`)
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(services).values({
      name: s.name,
      description: s.description,
      category: s.category,
      companyId,
      status: s.status,
      durationMinutes: s.durationMinutes,
      basePriceCents: s.basePriceCents,
    });
  }

  const [{ userCount }] = await db.execute<{ userCount: number }>(
    sql`select count(*)::int as "userCount" from users`,
  );
  const [{ companyCount }] = await db.execute<{ companyCount: number }>(
    sql`select count(*)::int as "companyCount" from companies`,
  );
  const [{ serviceCount }] = await db.execute<{ serviceCount: number }>(
    sql`select count(*)::int as "serviceCount" from services`,
  );
  return { userCount, companyCount, serviceCount };
}
