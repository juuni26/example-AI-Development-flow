import { Module } from "@nestjs/common";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ZodValidationPipe } from "nestjs-zod";
import { AuthModule } from "./auth/auth.module";
import { CompaniesModule } from "./companies/companies.module";
import { DbModule } from "./db/db.module";
import { HealthModule } from "./health/health.module";
import { MeModule } from "./me/me.module";
import { ServicesModule } from "./services/services.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    // Two throttle buckets:
    //   - `default` is a baseline that applies to every endpoint
    //     unless overridden (60 req/min/IP).
    //   - `auth` is the tighter bucket the AuthController opts into for
    //     /auth/login and /auth/refresh (10 req/min/IP) — see the
    //     @Throttle decoration on the controller.
    // Skipped during tests; e2e suites generate bursts that would
    // otherwise trip the limit.
    ThrottlerModule.forRoot({
      throttlers: [
        { name: "default", ttl: 60_000, limit: 120 },
        { name: "auth", ttl: 60_000, limit: 30 },
      ],
      // Throttling is a production-only concern here. Test suites burst
      // through both the backend e2e (Testcontainers Postgres) and the
      // browser e2e (Playwright) and would otherwise trip the limit.
      // Production deployments leave NODE_ENV unset or "production" so the
      // throttle is fully active.
      skipIf: () =>
        process.env.NODE_ENV !== "production" || process.env.DISABLE_THROTTLE === "1",
    }),
    DbModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MeModule,
    ServicesModule,
    CompaniesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
