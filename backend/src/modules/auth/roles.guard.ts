import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

/**
 * AUTH-02. Must run AFTER JwtAuthGuard (see @UseGuards(JwtAuthGuard,
 * RolesGuard) ordering in controllers) - it reads req.user.role, which
 * only exists once JwtAuthGuard has already validated the token.
 * A route with no @Roles(...) metadata is allowed for any authenticated
 * user (role check simply doesn't apply).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Yêu cầu 1 trong các vai trò: ${requiredRoles.join(', ')}. Vai trò hiện tại: ${user?.role ?? 'không xác định'}`,
      );
    }
    return true;
  }
}
