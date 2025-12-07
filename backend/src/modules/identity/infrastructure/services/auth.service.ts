// =============================================================================
// Authentication Service
// =============================================================================
// Service responsable de l'authentification des utilisateurs
//
// Fonctionnalités:
// - Validation des credentials (email/password)
// - Génération des JWT tokens
// - Extraction des infos utilisateur depuis le token
// =============================================================================

import {
  Injectable,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  companyName: string;
}

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    companyName: string;
    role: string;
    isActive: boolean;
    lastLoginAt?: Date;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authentifie un utilisateur et retourne un JWT
   */
  async login(email: string, password: string): Promise<AuthResult> {
    // 1. Trouver l'utilisateur par email
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      this.logger.warn(`Login attempt failed: user not found (${email})`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Vérifier que le compte est actif
    if (!user.isActive) {
      this.logger.warn(`Login attempt failed: user inactive (${email})`);
      throw new UnauthorizedException('Account is deactivated');
    }

    // 3. Vérifier le mot de passe
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      this.logger.warn(`Login attempt failed: invalid password (${email})`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Enregistrer la connexion
    user.recordLogin();
    await this.userRepository.save(user);

    // 5. Générer le JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email.value,
      role: user.role.value,
      companyName: user.companyName,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User logged in: ${email}`);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email.value,
        companyName: user.companyName,
        role: user.role.value,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }

  /**
   * Valide un JWT et retourne l'utilisateur
   */
  async validateToken(payload: JwtPayload): Promise<User | null> {
    return this.userRepository.findById(payload.sub);
  }
}
