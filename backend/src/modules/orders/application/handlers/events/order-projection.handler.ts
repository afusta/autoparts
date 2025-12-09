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
import { OrderReadService } from '../../../infrastructure/read-model/services/order-read.service';
import { Neo4jService } from '@infrastructure/neo4j';

@Injectable()
@EventsHandler(OrderCreatedEvent)
export class OrderCreatedProjectionHandler implements IEventHandler<OrderCreatedEvent> {
  private readonly logger = new Logger(OrderCreatedProjectionHandler.name);

  constructor(
    private readonly orderReadService: OrderReadService,
    private readonly neo4j: Neo4jService,
  ) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(`Handling OrderCreatedEvent: ${event.aggregateId}`);

    try {
      // Mettre à jour MongoDB (Read Model)
      await this.orderReadService.createOrder({
        orderId: event.aggregateId,
        garageId: event.payload.garageId,
        garageName: event.payload.garageName,
        lines: event.payload.lines.map((line) => ({
          ...line,
          supplierName: 'Unknown', // Will be enriched if needed
        })),
        totalInCents: event.payload.totalInCents,
        currency: event.payload.currency,
        status: event.payload.status,
        createdAt: event.occurredOn,
      });

      // Mettre à jour Neo4j (Graph - relations garage/supplier/parts)
      await this.createOrderRelationshipsInNeo4j({
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

  private async createOrderRelationshipsInNeo4j(data: {
    orderId: string;
    garageId: string;
    lines: Array<{
      partId: string;
      supplierId: string;
      quantity: number;
      totalInCents: number;
    }>;
    totalInCents: number;
    createdAt: Date;
  }): Promise<void> {
    // Créer le nœud Order
    await this.neo4j.write(
      `
      MERGE (o:Order {id: $orderId})
      ON CREATE SET
        o.totalInCents = $totalInCents,
        o.createdAt = datetime($createdAt)
      `,
      {
        orderId: data.orderId,
        totalInCents: data.totalInCents,
        createdAt: data.createdAt.toISOString(),
      },
    );

    // Relier le garage à la commande
    await this.neo4j.write(
      `
      MATCH (g:User {id: $garageId})
      MATCH (o:Order {id: $orderId})
      MERGE (g)-[r:PLACED]->(o)
      ON CREATE SET r.createdAt = datetime()
      `,
      {
        garageId: data.garageId,
        orderId: data.orderId,
      },
    );

    // Créer les relations CONTAINS vers les pièces
    for (const line of data.lines) {
      await this.neo4j.write(
        `
        MATCH (o:Order {id: $orderId})
        MATCH (p:Part {id: $partId})
        MERGE (o)-[r:CONTAINS]->(p)
        ON CREATE SET
          r.quantity = $quantity,
          r.totalInCents = $totalInCents
        `,
        {
          orderId: data.orderId,
          partId: line.partId,
          quantity: line.quantity,
          totalInCents: line.totalInCents,
        },
      );

      // Créer/mettre à jour la relation ORDERED_FROM entre garage et supplier
      await this.neo4j.write(
        `
        MATCH (g:User {id: $garageId})
        MATCH (s:User {id: $supplierId})
        MERGE (g)-[r:ORDERED_FROM]->(s)
        ON CREATE SET
          r.orderCount = 1,
          r.totalSpentInCents = $totalInCents,
          r.firstOrderAt = datetime(),
          r.lastOrderAt = datetime()
        ON MATCH SET
          r.orderCount = r.orderCount + 1,
          r.totalSpentInCents = r.totalSpentInCents + $totalInCents,
          r.lastOrderAt = datetime()
        `,
        {
          garageId: data.garageId,
          supplierId: line.supplierId,
          totalInCents: line.totalInCents,
        },
      );
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
    private readonly orderReadService: OrderReadService,
    private readonly neo4j: Neo4jService,
  ) {}

  async handle(event: OrderStatusChangedEvent): Promise<void> {
    this.logger.log(`Handling OrderStatusChangedEvent: ${event.aggregateId}`);

    try {
      // Mettre à jour MongoDB
      await this.orderReadService.updateOrderStatus({
        orderId: event.aggregateId,
        newStatus: event.payload.newStatus,
        changedBy: event.payload.changedBy,
        changedAt: event.occurredOn,
        reason: event.payload.reason,
      });

      // Mettre à jour Neo4j
      await this.neo4j.write(
        `
        MATCH (o:Order {id: $orderId})
        SET o.status = $status, o.updatedAt = datetime()
        `,
        { orderId: event.aggregateId, status: event.payload.newStatus },
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
