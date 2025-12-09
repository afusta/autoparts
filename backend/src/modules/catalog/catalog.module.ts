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
//
// Architecture CQRS:
// - Write Side: Commands → PostgreSQL
// - Read Side: Queries → MongoDB (projections)
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';

// Domain
import { PART_REPOSITORY } from './domain/repositories/part.repository.interface';

// Application
import { CreatePartHandler } from './application/handlers/create-part.handler';
import {
  UpdatePartHandler,
  AddStockHandler,
} from './application/handlers/update-part.handler';

// Infrastructure - Write Model (PostgreSQL)
import { PartOrmEntity } from './infrastructure/persistence/part.orm-entity';
import { PartRepository } from './infrastructure/persistence/part.repository';

// Infrastructure - Read Model (MongoDB)
import {
  PartRead,
  PartReadSchema,
} from './infrastructure/read-model/schemas/part-read.schema';
import { PartReadService } from './infrastructure/read-model/services/part-read.service';
import {
  PartCreatedProjectionHandler,
  PartUpdatedProjectionHandler,
  StockUpdatedProjectionHandler,
} from './infrastructure/read-model/handlers/part-projection.handler';
import { PartsQueriesController } from './infrastructure/read-model/api/parts-queries.controller';

// API - Commands
import { PartsController } from './api/controllers/parts.controller';

// Identity Module (pour guards et decorators)
import { IdentityModule } from '@modules/identity';

const CommandHandlers = [CreatePartHandler, UpdatePartHandler, AddStockHandler];

const EventHandlers = [
  PartCreatedProjectionHandler,
  PartUpdatedProjectionHandler,
  StockUpdatedProjectionHandler,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([PartOrmEntity]),
    MongooseModule.forFeature([
      { name: PartRead.name, schema: PartReadSchema },
    ]),
    CqrsModule,
    IdentityModule,
  ],
  controllers: [PartsController, PartsQueriesController],
  providers: [
    // Repository (Write Model)
    {
      provide: PART_REPOSITORY,
      useClass: PartRepository,
    },
    // Read Model Service
    PartReadService,
    // Command Handlers
    ...CommandHandlers,
    // Event Handlers (Projections)
    ...EventHandlers,
  ],
  exports: [PART_REPOSITORY, PartReadService],
})
export class CatalogModule {}
