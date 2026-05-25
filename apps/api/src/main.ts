import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";
import { setupOpenApi } from "./openapi";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, {
    cors: {
      // Allowlist-only — explicit array, no wildcard reflection. The validator
      // checks the incoming Origin against the WEB_ORIGINS env list; tooling
      // requests with no Origin header (curl, server-to-server) are allowed
      // through, which keeps Postman + healthz reachable without weakening
      // browser-side protection.
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.WEB_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      },
      credentials: false,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    },
    bodyParser: false,
  });

  // Security headers — defaults are fine for an API; we keep CSP off because
  // the Swagger UI ships inline assets and we serve it from the same origin.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Explicit body parsers with a tight limit. The largest request shape we
  // accept (CreateService) is well under 4kb; 100kb leaves headroom without
  // exposing an unbounded upload surface.
  app.use(json({ limit: "100kb" }));
  app.use(urlencoded({ extended: true, limit: "100kb" }));

  app.enableShutdownHooks();
  setupOpenApi(app);

  await app.listen(env.API_PORT, "0.0.0.0");
  const logger = new Logger("Bootstrap");
  logger.log(`Cleandrop API listening on http://0.0.0.0:${env.API_PORT}`);
  logger.log(`OpenAPI docs at      http://0.0.0.0:${env.API_PORT}/api/docs`);
  logger.log(`CORS allowlist:      ${env.WEB_ORIGINS.join(", ") || "(none)"}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});
