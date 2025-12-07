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
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

// Domain
import { ORDER_REPOSITORY } from './domain/repositories/order.repository.interface';

// Application
import { CreateOrderHandler } from './application/handlers/create-order.handler';
import {
  ConfirmOrderHandler,
  ShipOrderHandler,
  DeliverOrderHandler,
  CancelOrderHandler,
} from './application/handlers/update-order-status.handler';

// Infrastructure
import { OrderOrmEntity } from './infrastructure/persistence/order.orm-entity';
import { OrderRepository } from './infrastructure/persistence/order.repository';

// API
import { OrdersController } from './api/controllers/orders.controller';

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

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderOrmEntity]),
    CqrsModule,
    IdentityModule,
    CatalogModule, // Pour accéder au PART_REPOSITORY
  ],
  controllers: [OrdersController],
  providers: [
    // Repository
    {
      provide: ORDER_REPOSITORY,
      useClass: OrderRepository,
    },
    // Command Handlers
    ...CommandHandlers,
  ],
  exports: [ORDER_REPOSITORY],
})
export class OrdersModule {}
