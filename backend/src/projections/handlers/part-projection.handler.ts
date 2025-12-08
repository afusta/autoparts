// =============================================================================
// Part Projection Event Handler
// =============================================================================
// Écoute les événements pièces et met à jour les projections
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  PartCreatedEvent,
  PartUpdatedEvent,
  StockUpdatedEvent,
} from '@modules/catalog/domain/events';
import { MongoProjectionService } from '../mongo/services';
import { Neo4jProjectionService } from '../neo4j/services';

@Injectable()
@EventsHandler(PartCreatedEvent)
export class PartCreatedProjectionHandler implements IEventHandler<PartCreatedEvent> {
  private readonly logger = new Logger(PartCreatedProjectionHandler.name);

  constructor(
    private readonly mongoProjection: MongoProjectionService,
    private readonly neo4jProjection: Neo4jProjectionService,
  ) {}

  async handle(event: PartCreatedEvent): Promise<void> {
    this.logger.log(`Handling PartCreatedEvent: ${event.aggregateId}`);

    try {
      // Mettre à jour MongoDB (Read Model)
      await this.mongoProjection.createPart({
        partId: event.aggregateId,
        supplierId: event.payload.supplierId,
        reference: event.payload.reference,
        name: event.payload.name,
        description: event.payload.description,
        category: event.payload.category,
        brand: event.payload.brand,
        priceInCents: event.payload.priceInCents,
        currency: event.payload.currency,
        stockQuantity: event.payload.stockQuantity,
        compatibleVehicles: event.payload.compatibleVehicles,
      });

      // Mettre à jour Neo4j (Graph avec relations véhicules)
      await this.neo4jProjection.createPartNode({
        partId: event.aggregateId,
        supplierId: event.payload.supplierId,
        reference: event.payload.reference,
        name: event.payload.name,
        category: event.payload.category,
        brand: event.payload.brand,
        priceInCents: event.payload.priceInCents,
        compatibleVehicles: event.payload.compatibleVehicles,
      });

      this.logger.log(
        `Part projections created successfully: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create part projections: ${event.aggregateId}`,
        error,
      );
      throw error;
    }
  }
}

@Injectable()
@EventsHandler(PartUpdatedEvent)
export class PartUpdatedProjectionHandler implements IEventHandler<PartUpdatedEvent> {
  private readonly logger = new Logger(PartUpdatedProjectionHandler.name);

  constructor(
    private readonly mongoProjection: MongoProjectionService,
    private readonly neo4jProjection: Neo4jProjectionService,
  ) {}

  async handle(event: PartUpdatedEvent): Promise<void> {
    this.logger.log(`Handling PartUpdatedEvent: ${event.aggregateId}`);

    try {
      const changes = event.payload.changes;

      // Mettre à jour MongoDB
      await this.mongoProjection.updatePart(event.aggregateId, changes);

      // Mettre à jour Neo4j
      await this.neo4jProjection.updatePartNode(event.aggregateId, changes);

      this.logger.log(
        `Part projections updated successfully: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update part projections: ${event.aggregateId}`,
        error,
      );
      throw error;
    }
  }
}

@Injectable()
@EventsHandler(StockUpdatedEvent)
export class StockUpdatedProjectionHandler implements IEventHandler<StockUpdatedEvent> {
  private readonly logger = new Logger(StockUpdatedProjectionHandler.name);

  constructor(private readonly mongoProjection: MongoProjectionService) {}

  async handle(event: StockUpdatedEvent): Promise<void> {
    this.logger.log(`Handling StockUpdatedEvent: ${event.aggregateId}`);

    try {
      await this.mongoProjection.updatePartStock(
        event.aggregateId,
        event.payload.newQuantity,
        event.payload.newReserved,
      );

      this.logger.log(
        `Stock projection updated successfully: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update stock projection: ${event.aggregateId}`,
        error,
      );
      throw error;
    }
  }
}
