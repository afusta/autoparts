// =============================================================================
// CurrentUser Decorator
// =============================================================================
// Récupère l'utilisateur connecté depuis la requête
//
// Usage:
//   @Get('profile')
//   getProfile(@CurrentUser() user: AuthenticatedUser) {
//     return user;
//   }
// =============================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  companyName: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    // Si un champ spécifique est demandé, le retourner
    if (data) {
      return user?.[data];
    }

    return user;
  },
);
