// =============================================================================
// Public Decorator
// =============================================================================
// Marque une route comme publique (pas d'authentification requise)
//
// Usage:
//   @Public()
//   @Post('login')
//   login() { ... }
// =============================================================================

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
