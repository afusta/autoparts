// =============================================================================
// Catalog Module
// =============================================================================
// Module pour la gestion du catalogue de pièces automobiles
//
// Fonctionnalités:
// - CRUD pièces (fournisseur)
// - Gestion du stock
// - Recherche de pièces (garagiste)
// - Compatibilité véhicules
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

// Domain
import { PART_REPOSITORY } from './domain/repositories/part.repository.interface';

// Application
import { CreatePartHandler } from './application/handlers/create-part.handler';
import { UpdatePartHandler, AddStockHandler } from './application/handlers/update-part.handler';

// Infrastructure
import { PartOrmEntity } from './infrastructure/persistence/part.orm-entity';
import { PartRepository } from './infrastructure/persistence/part.repository';

// API
import { PartsController } from './api/controllers/parts.controller';

// Identity Module (pour guards et decorators)
import { IdentityModule } from '@modules/identity';

const CommandHandlers = [CreatePartHandler, UpdatePartHandler, AddStockHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([PartOrmEntity]),
    CqrsModule,
    IdentityModule,
  ],
  controllers: [PartsController],
  providers: [
    // Repository
    {
      provide: PART_REPOSITORY,
      useClass: PartRepository,
    },
    // Command Handlers
    ...CommandHandlers,
  ],
  exports: [PART_REPOSITORY],
})
export class CatalogModule {}
