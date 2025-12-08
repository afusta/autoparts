// =============================================================================
// Order Projection Event Handler
// =============================================================================
// Écoute les événements commandes et met à jour les projections
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '@modules/orders/domain/events';
import { MongoProjectionService } from '../mongo/services';
import { Neo4jProjectionService } from '../neo4j/services';

@Injectable()
@EventsHandler(OrderCreatedEvent)
export class OrderCreatedProjectionHandler implements IEventHandler<OrderCreatedEvent> {
  private readonly logger = new Logger(OrderCreatedProjectionHandler.name);

  constructor(
    private readonly mongoProjection: MongoProjectionService,
    private readonly neo4jProjection: Neo4jProjectionService,
  ) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(`Handling OrderCreatedEvent: ${event.aggregateId}`);

    try {
      // Mettre à jour MongoDB (Read Model)
      await this.mongoProjection.createOrder({
        orderId: event.aggregateId,
        garageId: event.payload.garageId,
        garageName: event.payload.garageName,
        lines: event.payload.lines,
        totalInCents: event.payload.totalInCents,
        currency: event.payload.currency,
        status: event.payload.status,
        createdAt: event.occurredOn,
      });

      // Mettre à jour Neo4j (Graph - relations garage/supplier/parts)
      await this.neo4jProjection.createOrderRelationships({
        orderId: event.aggregateId,
        garageId: event.payload.garageId,
        lines: event.payload.lines.map((line) => ({
          partId: line.partId,
          supplierId: line.supplierId,
          quantity: line.quantity,
          totalInCents: line.unitPriceInCents * line.quantity,
        })),
        totalInCents: event.payload.totalInCents,
        createdAt: event.occurredOn,
      });

      this.logger.log(
        `Order projections created successfully: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create order projections: ${event.aggregateId}`,
        error,
      );
      throw error;
    }
  }
}

@Injectable()
@EventsHandler(OrderStatusChangedEvent)
export class OrderStatusChangedProjectionHandler implements IEventHandler<OrderStatusChangedEvent> {
  private readonly logger = new Logger(
    OrderStatusChangedProjectionHandler.name,
  );

  constructor(
    private readonly mongoProjection: MongoProjectionService,
    private readonly neo4jProjection: Neo4jProjectionService,
  ) {}

  async handle(event: OrderStatusChangedEvent): Promise<void> {
    this.logger.log(`Handling OrderStatusChangedEvent: ${event.aggregateId}`);

    try {
      // Mettre à jour MongoDB
      await this.mongoProjection.updateOrderStatus({
        orderId: event.aggregateId,
        newStatus: event.payload.newStatus,
        changedBy: event.payload.changedBy,
        changedAt: event.occurredOn,
        reason: event.payload.reason,
      });

      // Mettre à jour Neo4j
      await this.neo4jProjection.updateOrderStatus(
        event.aggregateId,
        event.payload.newStatus,
      );

      this.logger.log(
        `Order status projections updated: ${event.aggregateId} → ${event.payload.newStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update order status projections: ${event.aggregateId}`,
        error,
      );
      throw error;
    }
  }
}
