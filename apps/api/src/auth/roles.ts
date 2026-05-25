import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@cleandrop/shared";
import type { AuthedRequest } from "./jwt.guard";

const ROLES_METADATA_KEY = "cleandrop:required-roles" as const;

/** Decorate a controller or method with the roles that are allowed to call it. */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);

/**
 * Reads the @Roles() metadata for the route and asserts the authenticated
 * user's role is in the allowed set. Assumes JwtAuthGuard ran first and
 * populated `req.user` — calling this guard without an authenticated user
 * is a configuration bug and we throw 403 to be safe.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_METADATA_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const user = req.user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
