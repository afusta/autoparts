// =============================================================================
// Roles Guard
// =============================================================================
// Guard qui vérifie que l'utilisateur a le rôle requis
//
// Usage:
//   @Roles(UserRoleEnum.ADMIN, UserRoleEnum.SUPPLIER)
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Get('admin-only')
//   adminEndpoint() { ... }
// =============================================================================

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRoleEnum } from '../../domain/value-objects';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupérer les rôles requis depuis le decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleEnum[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si pas de rôles spécifiés, autoriser l'accès
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Récupérer l'utilisateur depuis la requête (ajouté par JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    // Vérifier si l'utilisateur a l'un des rôles requis
    return requiredRoles.includes(user.role as UserRoleEnum);
  }
}
