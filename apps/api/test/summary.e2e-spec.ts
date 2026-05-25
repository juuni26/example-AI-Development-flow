import request from "supertest";
import type { ServicesSummary } from "@cleandrop/shared";
import { SEED_SERVICES } from "../src/db/fixtures";
import { startTestApp, type TestApp } from "./test-app";

// Expected values derived from the fixture so the test stays in sync if a
// new service is added (the test will still verify correctness against the
// computed expectation, not a hardcoded number).
const expectedTotal = SEED_SERVICES.length;
const expectedActive = SEED_SERVICES.filter((s) => s.status === "Active").length;
const expectedDrafts = SEED_SERVICES.filter((s) => s.status === "Draft").length;
const expectedAvgCents = Math.round(
  SEED_SERVICES.reduce((acc, s) => acc + s.basePriceCents, 0) / SEED_SERVICES.length,
);

describe("services summary (e2e)", () => {
  let ctx: TestApp;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    const userLogin = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ email: ctx.fixtures.user.email, password: ctx.fixtures.user.password })
      .expect(200);
    userToken = userLogin.body.accessToken;

    const adminLogin = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ email: ctx.fixtures.admin.email, password: ctx.fixtures.admin.password })
      .expect(200);
    adminToken = adminLogin.body.accessToken;
  }, 60_000);

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("returns 401 without a bearer token", async () => {
    await request(ctx.app.getHttpServer()).get("/services/summary").expect(401);
  });

  it("returns the expected counts and average for the seeded fixture (as user)", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/services/summary")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);

    const body = res.body as ServicesSummary;
    expect(body.total).toBe(expectedTotal);
    expect(body.active).toBe(expectedActive);
    expect(body.drafts).toBe(expectedDrafts);
    expect(body.avgBasePriceCents).toBe(expectedAvgCents);
  });

  it("returns the same numbers as admin (role does not affect summary)", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/services/summary")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toEqual({
      total: expectedTotal,
      active: expectedActive,
      drafts: expectedDrafts,
      avgBasePriceCents: expectedAvgCents,
    });
  });
});
