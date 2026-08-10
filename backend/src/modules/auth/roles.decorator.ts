import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * AUTH-02. Marks a route as requiring one of the given roles. Must be
 * combined with @UseGuards(JwtAuthGuard, RolesGuard) - the decorator
 * alone enforces nothing, RolesGuard is what reads this metadata.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
