import request from "supertest";
import { startTestApp, type TestApp } from "./test-app";

describe("refresh + logout (e2e)", () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await startTestApp();
  }, 60_000);

  afterAll(async () => {
    await ctx.cleanup();
  });

  async function login(): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ email: ctx.fixtures.user.email, password: ctx.fixtures.user.password })
      .expect(200);
    return { accessToken: res.body.accessToken, refreshToken: res.body.refreshToken };
  }

  it("login returns both access and refresh tokens", async () => {
    const tokens = await login();
    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(tokens.refreshToken.length).toBeGreaterThan(20);
  });

  it("refresh rotates and the chain keeps working forward", async () => {
    const { refreshToken: r1 } = await login();

    // r1 -> r2
    const rot1 = await request(ctx.app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: r1 })
      .expect(200);
    expect(rot1.body.accessToken).toEqual(expect.any(String));
    expect(rot1.body.refreshToken).toEqual(expect.any(String));
    expect(rot1.body.refreshToken).not.toBe(r1);

    // r2 -> r3 (proves the chain advances; intentionally NOT replaying r1
    // here, because replaying a revoked token triggers reuse detection and
    // would cascade-revoke r2 — that's exercised in its own test below).
    const rot2 = await request(ctx.app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: rot1.body.refreshToken })
      .expect(200);
    expect(rot2.body.refreshToken).not.toBe(rot1.body.refreshToken);
  });

  it("reuse detection: replaying a rotated refresh token revokes the whole chain", async () => {
    const { refreshToken: r1 } = await login();

    // Rotate once: r1 -> r2. r1 is now revoked.
    const rot1 = await request(ctx.app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: r1 })
      .expect(200);
    const r2 = rot1.body.refreshToken as string;

    // Attacker replays r1. This must 401 AND should cascade-revoke r2.
    await request(ctx.app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: r1 })
      .expect(401);

    // r2 (the legitimate next token) is now also dead.
    await request(ctx.app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: r2 })
      .expect(401);
  });

  it("logout revokes the row; subsequent refresh with that token returns 401", async () => {
    const { refreshToken } = await login();

    await request(ctx.app.getHttpServer())
      .post("/auth/logout")
      .send({ refreshToken })
      .expect(204);

    await request(ctx.app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken })
      .expect(401);

    // Logging out again is idempotent (no row to revoke, still 204).
    await request(ctx.app.getHttpServer())
      .post("/auth/logout")
      .send({ refreshToken })
      .expect(204);
  });

  it("refresh with an unknown token returns 401", async () => {
    await request(ctx.app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: "definitely-not-a-real-refresh-token" })
      .expect(401);
  });

  it("refresh with a malformed body returns 400", async () => {
    await request(ctx.app.getHttpServer())
      .post("/auth/refresh")
      .send({})
      .expect(400);
  });
});
