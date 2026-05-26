import request from "supertest";
import type { PaginatedServices } from "@cleandrop/shared";
import { startTestApp, type TestApp } from "./test-app";

describe("services list (e2e)", () => {
  let ctx: TestApp;
  let userToken: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    const res = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ email: ctx.fixtures.user.email, password: ctx.fixtures.user.password })
      .expect(200);
    userToken = res.body.accessToken;
  }, 60_000);

  afterAll(async () => {
    await ctx.cleanup();
  });

  const auth = () => ({ Authorization: `Bearer ${userToken}` });

  async function list(qs: string): Promise<PaginatedServices> {
    const res = await request(ctx.app.getHttpServer())
      .get(`/services${qs}`)
      .set(auth())
      .expect(200);
    return res.body as PaginatedServices;
  }

  it("returns 401 without a bearer token", async () => {
    await request(ctx.app.getHttpServer()).get("/services").expect(401);
  });

  it("returns the full seeded fixture with no filters", async () => {
    const body = await list("");
    expect(body.total).toBe(ctx.fixtures.serviceCount);
    expect(body.page).toBe(1);
    // Default pageSize is 10; fixture has 9, so all fit on page 1.
    expect(body.data).toHaveLength(ctx.fixtures.serviceCount);
  });

  it("filters by status=Active (6 rows in the fixture)", async () => {
    const body = await list("?status=Active");
    expect(body.total).toBe(6);
    expect(body.data.every((s) => s.status === "Active")).toBe(true);
  });

  it("filters by status=Draft (2 rows)", async () => {
    const body = await list("?status=Draft");
    expect(body.total).toBe(2);
    expect(body.data.every((s) => s.status === "Draft")).toBe(true);
  });

  it("filters by status=Inactive (1 row)", async () => {
    const body = await list("?status=Inactive");
    expect(body.total).toBe(1);
    expect(body.data[0].status).toBe("Inactive");
  });

  it("filters by category=Specialty (3 rows)", async () => {
    const body = await list("?category=Specialty");
    expect(body.total).toBe(3);
    expect(body.data.every((s) => s.category === "Specialty")).toBe(true);
  });

  it("filters by both status and category", async () => {
    const body = await list("?status=Active&category=Residential");
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.data.every((s) => s.status === "Active" && s.category === "Residential")).toBe(
      true,
    );
  });

  it("ILIKE search hits both name and description, case-insensitive", async () => {
    const byName = await list("?search=Deep");
    // "Deep Clean" + "Deep Sanitization"
    expect(byName.data.some((s) => s.name === "Deep Clean")).toBe(true);
    expect(byName.data.some((s) => s.name === "Deep Sanitization")).toBe(true);

    const byDescription = await list("?search=hospital");
    expect(byDescription.data.some((s) => s.name === "Deep Sanitization")).toBe(true);

    const lowercase = await list("?search=DEEP");
    expect(lowercase.total).toBe(byName.total);
  });

  it("sorts by name ascending", async () => {
    const body = await list("?sortBy=name&sortDir=asc");
    const names = body.data.map((s) => s.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("sorts by base price descending", async () => {
    const body = await list("?sortBy=basePrice&sortDir=desc");
    const prices = body.data.map((s) => s.basePriceCents);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i - 1]).toBeGreaterThanOrEqual(prices[i]);
    }
  });

  it("sorts by company name (joined column)", async () => {
    const body = await list("?sortBy=company&sortDir=asc");
    const companies = body.data.map((s) => s.company.name);
    const sorted = [...companies].sort((a, b) => a.localeCompare(b));
    expect(companies).toEqual(sorted);
  });

  it("paginates: page 1 size 3 + page 2 size 3 + page 3 size 3 covers everything without overlap", async () => {
    const p1 = await list("?pageSize=3&page=1&sortBy=name&sortDir=asc");
    const p2 = await list("?pageSize=3&page=2&sortBy=name&sortDir=asc");
    const p3 = await list("?pageSize=3&page=3&sortBy=name&sortDir=asc");

    expect(p1.data).toHaveLength(3);
    expect(p2.data).toHaveLength(3);
    expect(p3.data).toHaveLength(3);
    expect(p1.total).toBe(9);

    const allIds = [...p1.data, ...p2.data, ...p3.data].map((s) => s.id);
    expect(new Set(allIds).size).toBe(9);
  });

  it("returns empty data with correct total when page is beyond last page", async () => {
    const body = await list("?pageSize=3&page=99");
    expect(body.data).toHaveLength(0);
    expect(body.total).toBe(9);
    expect(body.page).toBe(99);
  });

  it("status sort uses id ASC tiebreaker: same sort key never crosses pages between requests", async () => {
    // Status has only 3 distinct values across 9 rows — perfect setup for
    // testing tiebreaker stability across multiple paginated requests.
    const p1a = await list("?sortBy=status&sortDir=asc&pageSize=4&page=1");
    const p1b = await list("?sortBy=status&sortDir=asc&pageSize=4&page=1");
    const p2a = await list("?sortBy=status&sortDir=asc&pageSize=4&page=2");
    const p2b = await list("?sortBy=status&sortDir=asc&pageSize=4&page=2");

    // Same request twice in a row must return the same ordering of ids.
    expect(p1a.data.map((s) => s.id)).toEqual(p1b.data.map((s) => s.id));
    expect(p2a.data.map((s) => s.id)).toEqual(p2b.data.map((s) => s.id));
    // No row appears on both pages.
    const overlap = p1a.data.filter((s) => p2a.data.some((t) => t.id === s.id));
    expect(overlap).toHaveLength(0);
  });

  it("rejects invalid sortBy with 400", async () => {
    await request(ctx.app.getHttpServer())
      .get("/services?sortBy=not-a-column")
      .set(auth())
      .expect(400);
  });
});
