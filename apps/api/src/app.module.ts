import { Module } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { AuthModule } from "./auth/auth.module";
import { DbModule } from "./db/db.module";
import { HealthModule } from "./health/health.module";
import { MeModule } from "./me/me.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [DbModule, HealthModule, AuthModule, UsersModule, MeModule],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
