// =============================================================================
// Projections Module
// =============================================================================
// Ce module gère la mise à jour des Read Models (CQRS Query Side)
//
// Architecture CQRS:
// ┌─────────────────────────────────────────────────────────────────────────┐
// │                         WRITE SIDE                                      │
// │  Command → Handler → Aggregate → PostgreSQL + Domain Events             │
// └─────────────────────────────────────────────────────────────────────────┘
//                                    │
//                                    ▼ (RabbitMQ)
// ┌─────────────────────────────────────────────────────────────────────────┐
// │                         READ SIDE (ce module)                           │
// │  Domain Event → Event Handler → Projection Services → MongoDB/Neo4j    │
// └─────────────────────────────────────────────────────────────────────────┘
//
// MongoDB: Documents dénormalisés pour requêtes rapides (listes, recherche)
// Neo4j: Graphe de relations pour analyses (recommandations, statistiques)
// =============================================================================

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';

// Schemas MongoDB
import { PartRead, PartReadSchema } from './mongo/schemas/part-read.schema';
import { OrderRead, OrderReadSchema } from './mongo/schemas/order-read.schema';
import { UserRead, UserReadSchema } from './mongo/schemas/user-read.schema';

// Services
import { MongoProjectionService } from './mongo/services';
import { Neo4jProjectionService } from './neo4j/services';

// Event Handlers (CQRS internal events)
import {
  UserProjectionHandler,
  PartCreatedProjectionHandler,
  PartUpdatedProjectionHandler,
  StockUpdatedProjectionHandler,
  OrderCreatedProjectionHandler,
  OrderStatusChangedProjectionHandler,
} from './handlers';

// Event Consumer (RabbitMQ microservice)
import { EventConsumerController } from './handlers/event-consumer.controller';

// API Controller
import { QueriesController } from './api';

const EventHandlers = [
  UserProjectionHandler,
  PartCreatedProjectionHandler,
  PartUpdatedProjectionHandler,
  StockUpdatedProjectionHandler,
  OrderCreatedProjectionHandler,
  OrderStatusChangedProjectionHandler,
];

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([
      { name: PartRead.name, schema: PartReadSchema },
      { name: OrderRead.name, schema: OrderReadSchema },
      { name: UserRead.name, schema: UserReadSchema },
    ]),
  ],
  controllers: [QueriesController, EventConsumerController],
  providers: [
    // Projection Services
    MongoProjectionService,
    Neo4jProjectionService,
    // Event Handlers
    ...EventHandlers,
  ],
  exports: [MongoProjectionService, Neo4jProjectionService],
})
export class ProjectionsModule {}
