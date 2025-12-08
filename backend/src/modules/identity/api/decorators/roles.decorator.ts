// =============================================================================
// Roles Decorator
// =============================================================================
// Spécifie les rôles autorisés pour une route
//
// Usage:
//   @Roles(UserRoleEnum.ADMIN)
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Get('admin')
//   adminOnly() { ... }
// =============================================================================

import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '../../domain/value-objects';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoleEnum[]) =>
  SetMetadata(ROLES_KEY, roles);
