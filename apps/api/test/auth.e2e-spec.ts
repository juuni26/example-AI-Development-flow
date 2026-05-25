import request from "supertest";
import { startTestApp, type TestApp } from "./test-app";

describe("auth (e2e)", () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await startTestApp();
  }, 60_000);

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe("POST /auth/login", () => {
    it("returns an access token and user for valid credentials", async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .send({ email: ctx.fixtures.admin.email, password: ctx.fixtures.admin.password })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toEqual({
        id: ctx.fixtures.admin.id,
        email: ctx.fixtures.admin.email,
        role: "admin",
      });
    });

    it("rejects a wrong password with 401", async () => {
      await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .send({ email: ctx.fixtures.admin.email, password: "definitely-wrong" })
        .expect(401);
    });

    it("rejects an unknown email with 401 (does not leak existence)", async () => {
      await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .send({ email: "ghost@cleandrop.test", password: "irrelevant" })
        .expect(401);
    });

    it("rejects a malformed body with 400", async () => {
      await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .send({ email: "not-an-email" })
        .expect(400);
    });
  });

  describe("GET /me", () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .send({ email: ctx.fixtures.user.email, password: ctx.fixtures.user.password })
        .expect(200);
      accessToken = res.body.accessToken;
    });

    it("returns the authenticated user when a valid token is supplied", async () => {
      const res = await request(ctx.app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        id: ctx.fixtures.user.id,
        email: ctx.fixtures.user.email,
        role: "user",
      });
    });

    it("returns 401 when the Authorization header is missing", async () => {
      await request(ctx.app.getHttpServer()).get("/me").expect(401);
    });

    it("returns 401 when the token is malformed", async () => {
      await request(ctx.app.getHttpServer())
        .get("/me")
        .set("Authorization", "Bearer not.a.real.jwt")
        .expect(401);
    });
  });
});
