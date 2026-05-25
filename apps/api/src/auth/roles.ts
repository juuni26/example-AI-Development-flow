import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
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
 * user's role is in the allowed set.
 *
 * Encodes the distinction the HTTP spec cares about:
 *   - missing/invalid auth      → 401 Unauthorized
 *   - authenticated, wrong role → 403 Forbidden
 *
 * The JwtAuthGuard is expected to have populated `req.user` before this
 * guard runs. We don't require an exact guard ordering by convention —
 * if `req.user` is absent, we treat it as unauthenticated and 401, so the
 * client gets the right signal regardless of how the guards were stacked.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_METADATA_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
