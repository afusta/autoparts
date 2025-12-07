// =============================================================================
// Identity Module
// =============================================================================
// Module NestJS qui assemble tous les composants du bounded context Identity
//
// Ce module gère:
// - L'authentification (login/register)
// - La gestion des utilisateurs
// - Les autorisations (RBAC)
//
// Architecture:
// ┌─────────────────────────────────────────────────────────────────┐
// │                      Identity Module                            │
// ├─────────────────────────────────────────────────────────────────┤
// │  API Layer          │  Application      │  Infrastructure      │
// │  ----------------   │  Layer            │  Layer               │
// │  AuthController     │  RegisterHandler  │  UserRepository      │
// │  Guards             │                   │  AuthService         │
// │  Decorators         │                   │  JwtStrategy         │
// └─────────────────────────────────────────────────────────────────┘
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Domain
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';

// Application - Handlers
import { RegisterUserHandler } from './application/handlers/register-user.handler';

// Infrastructure
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { AuthService } from './infrastructure/services/auth.service';
import { JwtStrategy } from './infrastructure/services/jwt.strategy';

// API
import { AuthController } from './api/controllers/auth.controller';

// Command Handlers à enregistrer
const CommandHandlers = [RegisterUserHandler];

@Module({
  imports: [
    // TypeORM pour l'entité User
    TypeOrmModule.forFeature([UserOrmEntity]),

    // CQRS pour CommandBus
    CqrsModule,

    // Passport pour l'authentification
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT Configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') || '1d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Repository (injection avec token)
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },

    // Services
    AuthService,
    JwtStrategy,

    // Command Handlers
    ...CommandHandlers,
  ],
  exports: [
    // Exporter pour utilisation dans d'autres modules
    USER_REPOSITORY,
    AuthService,
    JwtModule,
    PassportModule,
  ],
})
export class IdentityModule {}
