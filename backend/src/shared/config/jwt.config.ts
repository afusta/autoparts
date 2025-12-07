// =============================================================================
// JWT Configuration
// =============================================================================
// Configuration pour l'authentification JWT
// =============================================================================

import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret:
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
}));
