// =============================================================================
// JWT Strategy
// =============================================================================
// Stratégie Passport pour valider les JWT tokens
//
// Cette stratégie:
// 1. Extrait le JWT du header Authorization
// 2. Vérifie la signature et l'expiration
// 3. Charge l'utilisateur correspondant
// 4. Attache l'utilisateur à la requête (req.user)
// =============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Appelé par Passport après validation du JWT
   * Le résultat sera attaché à req.user
   */
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateToken(payload);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Retourne les infos utilisateur pour req.user
    return {
      id: user.id,
      email: user.email.value,
      role: user.role.value,
      companyName: user.companyName,
    };
  }
}
