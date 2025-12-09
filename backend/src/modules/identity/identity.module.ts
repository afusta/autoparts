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
// Architecture CQRS:
// - Write Side: Commands → PostgreSQL
// - Read Side: Queries → MongoDB (projections)
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Domain
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';

// Application - Handlers
import { RegisterUserHandler } from './application/handlers/register-user.handler';

// Infrastructure - Write Model (PostgreSQL)
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { AuthService } from './infrastructure/services/auth.service';
import { JwtStrategy } from './infrastructure/services/jwt.strategy';

// Infrastructure - Read Model (MongoDB)
import {
  UserRead,
  UserReadSchema,
} from './infrastructure/read-model/schemas/user-read.schema';
import { UserReadService } from './infrastructure/read-model/services/user-read.service';
import { UserProjectionHandler } from './infrastructure/read-model/handlers/user-projection.handler';

// API
import { AuthController } from './api/controllers/auth.controller';

// Command Handlers à enregistrer
const CommandHandlers = [RegisterUserHandler];

// Event Handlers (Projections)
const EventHandlers = [UserProjectionHandler];

@Module({
  imports: [
    // TypeORM pour l'entité User (Write Model)
    TypeOrmModule.forFeature([UserOrmEntity]),

    // Mongoose pour le Read Model
    MongooseModule.forFeature([
      { name: UserRead.name, schema: UserReadSchema },
    ]),

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
    // Repository (Write Model)
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },

    // Read Model Service
    UserReadService,

    // Services
    AuthService,
    JwtStrategy,

    // Command Handlers
    ...CommandHandlers,

    // Event Handlers (Projections)
    ...EventHandlers,
  ],
  exports: [
    // Exporter pour utilisation dans d'autres modules
    USER_REPOSITORY,
    UserReadService,
    AuthService,
    JwtModule,
    PassportModule,
  ],
})
export class IdentityModule {}
