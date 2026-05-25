import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { INestApplication } from "@nestjs/common";
import { patchNestJsSwagger } from "nestjs-zod";

// One-time global patch: teaches @nestjs/swagger how to introspect Zod-derived
// DTOs created via createZodDto(...) in our controllers. Without this, Swagger
// sees empty schemas because we use Zod instead of class-validator decorators.
patchNestJsSwagger();

/**
 * Builds the OpenAPI spec from the running Nest app and mounts Swagger UI
 * (interactive) at /api/docs plus the raw JSON at /api/docs-json. Public —
 * no auth on the docs themselves so an evaluator can read the contract
 * without logging in. A Bearer security scheme is registered so the
 * "Authorize" button in the UI works against /me, /services, etc.
 */
export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Cleandrop API")
    .setDescription(
      "Services catalog API. Authentication uses JWT access tokens (Bearer) " +
        "with server-side refresh-token rotation. See `/docs/adr` in the repo " +
        "for design rationale.",
    )
    .setVersion("0.1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste the accessToken from POST /auth/login here.",
      },
      "bearer",
    )
    .addTag("auth", "Login, refresh, and logout")
    .addTag("services", "Services catalog read + write")
    .addTag("companies", "Service providers")
    .addTag("me", "Current user")
    .addTag("health", "Liveness probe")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
    },
  });
}
