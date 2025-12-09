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

// Application - Command Handlers
import {
  CreatePartHandler,
  UpdatePartHandler,
  AddStockHandler,
} from './application/handlers/commands';

// Application - Query Handlers
import {
  SearchPartsHandler,
  GetPartDetailHandler,
  GetMyPartsHandler,
} from './application/handlers/queries';

// Application - Event Handlers (Projections)
import {
  PartCreatedProjectionHandler,
  PartUpdatedProjectionHandler,
  StockUpdatedProjectionHandler,
} from './application/handlers/events';

// Infrastructure - Write Model (PostgreSQL)
import { PartOrmEntity } from './infrastructure/persistence/part.orm-entity';
import { PartRepository } from './infrastructure/persistence/part.repository';

// Infrastructure - Read Model (MongoDB)
import {
  PartRead,
  PartReadSchema,
} from './infrastructure/read-model/schemas/part-read.schema';
import { PartReadService } from './infrastructure/read-model/services/part-read.service';

// API - Commands & Queries
import { PartsController } from './api/controllers/parts.controller';
import { PartsQueriesController } from './api/controllers/parts-queries.controller';

// Identity Module (pour guards et decorators)
import { IdentityModule } from '@modules/identity';

const CommandHandlers = [CreatePartHandler, UpdatePartHandler, AddStockHandler];

const QueryHandlers = [
  SearchPartsHandler,
  GetPartDetailHandler,
  GetMyPartsHandler,
];

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
    // Query Handlers
    ...QueryHandlers,
    // Event Handlers (Projections)
    ...EventHandlers,
  ],
  exports: [PART_REPOSITORY, PartReadService],
})
export class CatalogModule {}
