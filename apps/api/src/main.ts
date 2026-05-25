import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";
import { setupOpenApi } from "./openapi";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { cors: true });
  app.enableShutdownHooks();
  setupOpenApi(app);
  await app.listen(env.API_PORT, "0.0.0.0");
  Logger.log(`Cleandrop API listening on http://0.0.0.0:${env.API_PORT}`, "Bootstrap");
  Logger.log(`OpenAPI docs at      http://0.0.0.0:${env.API_PORT}/api/docs`, "Bootstrap");
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});
