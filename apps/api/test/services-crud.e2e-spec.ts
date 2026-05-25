import request from "supertest";
import type { CompanySummary, CreateServiceRequest, Service } from "@cleandrop/shared";
import { startTestApp, type TestApp } from "./test-app";

describe("services CRUD + role gating (e2e)", () => {
  let ctx: TestApp;
  let adminToken: string;
  let userToken: string;
  let acmeCompanyId: string;

  beforeAll(async () => {
    ctx = await startTestApp();

    const adminLogin = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ email: ctx.fixtures.admin.email, password: ctx.fixtures.admin.password })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    const userLogin = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ email: ctx.fixtures.user.email, password: ctx.fixtures.user.password })
      .expect(200);
    userToken = userLogin.body.accessToken;

    const companies = await request(ctx.app.getHttpServer())
      .get("/companies")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const acme = (companies.body as CompanySummary[]).find((c) =>
      c.name.toLowerCase().includes("acme"),
    );
    if (!acme) throw new Error("expected Acme company in seed");
    acmeCompanyId = acme.id;
  }, 60_000);

  afterAll(async () => {
    await ctx.cleanup();
  });

  const adminHeader = () => ({ Authorization: `Bearer ${adminToken}` });
  const userHeader = () => ({ Authorization: `Bearer ${userToken}` });

  const validBody = (overrides: Partial<CreateServiceRequest> = {}): CreateServiceRequest => ({
    name: "Temp Service",
    description: "A temporary service inserted by an e2e test.",
    category: "Residential",
    companyId: acmeCompanyId,
    status: "Active",
    durationMinutes: 60,
    basePriceCents: 5000,
    ...overrides,
  });

  describe("authorization gates", () => {
    it("POST without token returns 401", async () => {
      await request(ctx.app.getHttpServer())
        .post("/services")
        .send(validBody())
        .expect(401);
    });

    it("POST as user returns 403", async () => {
      await request(ctx.app.getHttpServer())
        .post("/services")
        .set(userHeader())
        .send(validBody())
        .expect(403);
    });

    it("PATCH as user returns 403", async () => {
      // Any uuid here — guard runs before we hit the DB.
      await request(ctx.app.getHttpServer())
        .patch("/services/00000000-0000-0000-0000-000000000000")
        .set(userHeader())
        .send({ name: "ignored" })
        .expect(403);
    });

    it("DELETE as user returns 403", async () => {
      await request(ctx.app.getHttpServer())
        .delete("/services/00000000-0000-0000-0000-000000000000")
        .set(userHeader())
        .expect(403);
    });
  });

  describe("create (POST /services)", () => {
    it("returns 201 + the new service for admin with a valid body", async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/services")
        .set(adminHeader())
        .send(validBody({ name: "E2E Create Service" }))
        .expect(201);

      const body = res.body as Service;
      expect(body.id).toEqual(expect.any(String));
      expect(body.name).toBe("E2E Create Service");
      expect(body.company.id).toBe(acmeCompanyId);
      expect(body.status).toBe("Active");
    });

    it("returns 400 with Zod issues on a malformed body", async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/services")
        .set(adminHeader())
        .send({ name: "", category: "not-a-category" })
        .expect(400);

      // nestjs-zod ZodValidationException surfaces an issues array.
      expect(res.body).toEqual(
        expect.objectContaining({
          statusCode: 400,
        }),
      );
    });

    it("returns 404 when companyId points at a non-existent company", async () => {
      await request(ctx.app.getHttpServer())
        .post("/services")
        .set(adminHeader())
        .send(validBody({ companyId: "00000000-0000-0000-0000-000000000000" }))
        .expect(404);
    });
  });

  describe("update (PATCH /services/:id)", () => {
    let createdId: string;

    beforeAll(async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/services")
        .set(adminHeader())
        .send(validBody({ name: "E2E Update Target", status: "Draft" }))
        .expect(201);
      createdId = res.body.id;
    });

    it("updates a subset of fields and returns the new shape", async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/services/${createdId}`)
        .set(adminHeader())
        .send({ status: "Active", basePriceCents: 7500 })
        .expect(200);

      expect(res.body.status).toBe("Active");
      expect(res.body.basePriceCents).toBe(7500);
      // Unchanged fields are still there.
      expect(res.body.name).toBe("E2E Update Target");
    });

    it("returns 400 on an empty body (at-least-one-field rule)", async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/services/${createdId}`)
        .set(adminHeader())
        .send({})
        .expect(400);
    });

    it("returns 404 for a missing id", async () => {
      await request(ctx.app.getHttpServer())
        .patch("/services/00000000-0000-0000-0000-000000000000")
        .set(adminHeader())
        .send({ name: "noop" })
        .expect(404);
    });
  });

  describe("delete (DELETE /services/:id)", () => {
    it("returns 204 and subsequent GET returns 404", async () => {
      const created = await request(ctx.app.getHttpServer())
        .post("/services")
        .set(adminHeader())
        .send(validBody({ name: "E2E Delete Target" }))
        .expect(201);

      await request(ctx.app.getHttpServer())
        .delete(`/services/${created.body.id}`)
        .set(adminHeader())
        .expect(204);

      await request(ctx.app.getHttpServer())
        .get(`/services/${created.body.id}`)
        .set(adminHeader())
        .expect(404);
    });

    it("returns 404 when the id does not exist", async () => {
      await request(ctx.app.getHttpServer())
        .delete("/services/00000000-0000-0000-0000-000000000000")
        .set(adminHeader())
        .expect(404);
    });
  });

  describe("GET /companies", () => {
    it("returns the seeded companies, alphabetised", async () => {
      const res = await request(ctx.app.getHttpServer())
        .get("/companies")
        .set(adminHeader())
        .expect(200);

      const names = (res.body as CompanySummary[]).map((c) => c.name);
      expect(names.length).toBeGreaterThanOrEqual(2);
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });

    it("returns 401 without a token", async () => {
      await request(ctx.app.getHttpServer()).get("/companies").expect(401);
    });
  });
});
