import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { accessTokenPayloadSchema, type AccessTokenPayload } from "@cleandrop/shared";
import { loadEnv } from "../config/env";

export interface AuthedRequest extends Request {
  user: AccessTokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const token = match[1];

    const env = loadEnv();
    let raw: unknown;
    try {
      raw = await this.jwt.verifyAsync(token, { secret: env.JWT_SECRET });
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const parsed = accessTokenPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new UnauthorizedException("Malformed token payload");
    }
    req.user = parsed.data;
    return true;
  }
}
