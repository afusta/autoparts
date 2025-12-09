// =============================================================================
// Orders Module
// =============================================================================
// Module pour la gestion des commandes
//
// Fonctionnalités:
// - Création de commandes par les garagistes
// - Workflow de commande (PENDING → CONFIRMED → SHIPPED → DELIVERED)
// - Réservation/libération automatique du stock
// - Statistiques par rôle
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
import { ORDER_REPOSITORY } from './domain/repositories/order.repository.interface';

// Application - Command Handlers
import {
  CreateOrderHandler,
  ConfirmOrderHandler,
  ShipOrderHandler,
  DeliverOrderHandler,
  CancelOrderHandler,
} from './application/handlers/commands';

// Application - Query Handlers
import {
  GetMyOrdersHandler,
  GetSupplierOrdersHandler,
  GetMyTopSuppliersHandler,
} from './application/handlers/queries';

// Application - Event Handlers (Projections)
import {
  OrderCreatedProjectionHandler,
  OrderStatusChangedProjectionHandler,
} from './application/handlers/events';

// Infrastructure - Write Model (PostgreSQL)
import { OrderOrmEntity } from './infrastructure/persistence/order.orm-entity';
import { OrderRepository } from './infrastructure/persistence/order.repository';

// Infrastructure - Read Model (MongoDB)
import {
  OrderRead,
  OrderReadSchema,
} from './infrastructure/read-model/schemas/order-read.schema';
import { OrderReadService } from './infrastructure/read-model/services/order-read.service';

// API - Commands & Queries
import { OrdersController } from './api/controllers/orders.controller';
import { OrdersQueriesController } from './api/controllers/orders-queries.controller';

// Modules externes
import { IdentityModule } from '@modules/identity';
import { CatalogModule } from '@modules/catalog';

const CommandHandlers = [
  CreateOrderHandler,
  ConfirmOrderHandler,
  ShipOrderHandler,
  DeliverOrderHandler,
  CancelOrderHandler,
];

const QueryHandlers = [
  GetMyOrdersHandler,
  GetSupplierOrdersHandler,
  GetMyTopSuppliersHandler,
];

const EventHandlers = [
  OrderCreatedProjectionHandler,
  OrderStatusChangedProjectionHandler,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderOrmEntity]),
    MongooseModule.forFeature([
      { name: OrderRead.name, schema: OrderReadSchema },
    ]),
    CqrsModule,
    IdentityModule,
    CatalogModule, // Pour accéder au PART_REPOSITORY
  ],
  controllers: [OrdersController, OrdersQueriesController],
  providers: [
    // Repository (Write Model)
    {
      provide: ORDER_REPOSITORY,
      useClass: OrderRepository,
    },
    // Read Model Service
    OrderReadService,
    // Command Handlers
    ...CommandHandlers,
    // Query Handlers
    ...QueryHandlers,
    // Event Handlers (Projections)
    ...EventHandlers,
  ],
  exports: [ORDER_REPOSITORY, OrderReadService],
})
export class OrdersModule {}
