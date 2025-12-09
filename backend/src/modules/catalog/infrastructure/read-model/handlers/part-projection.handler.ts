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
import { PartReadService } from '../services/part-read.service';
import { Neo4jService } from '@infrastructure/neo4j';

@Injectable()
@EventsHandler(PartCreatedEvent)
export class PartCreatedProjectionHandler implements IEventHandler<PartCreatedEvent> {
  private readonly logger = new Logger(PartCreatedProjectionHandler.name);

  constructor(
    private readonly partReadService: PartReadService,
    private readonly neo4j: Neo4jService,
  ) {}

  async handle(event: PartCreatedEvent): Promise<void> {
    this.logger.log(`Handling PartCreatedEvent: ${event.aggregateId}`);

    try {
      // Mettre à jour MongoDB (Read Model)
      await this.partReadService.createPart({
        partId: event.aggregateId,
        supplierId: event.payload.supplierId,
        supplierName: 'Unknown', // Will be enriched by user lookup if needed
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
      await this.createPartNodeInNeo4j({
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

  private async createPartNodeInNeo4j(data: {
    partId: string;
    supplierId: string;
    reference: string;
    name: string;
    category: string;
    brand: string;
    priceInCents: number;
    compatibleVehicles: Array<{
      brand: string;
      model: string;
      yearFrom: number;
      yearTo: number;
      engine?: string;
    }>;
  }): Promise<void> {
    // Créer le nœud Part
    await this.neo4j.write(
      `
      MERGE (p:Part {id: $partId})
      ON CREATE SET
        p.reference = $reference,
        p.name = $name,
        p.category = $category,
        p.brand = $brand,
        p.priceInCents = $priceInCents,
        p.createdAt = datetime()
      `,
      {
        partId: data.partId,
        reference: data.reference,
        name: data.name,
        category: data.category,
        brand: data.brand,
        priceInCents: data.priceInCents,
      },
    );

    // Créer la relation SUPPLIES depuis le fournisseur
    await this.neo4j.write(
      `
      MATCH (s:User {id: $supplierId})
      MATCH (p:Part {id: $partId})
      MERGE (s)-[r:SUPPLIES]->(p)
      ON CREATE SET r.createdAt = datetime()
      `,
      {
        supplierId: data.supplierId,
        partId: data.partId,
      },
    );

    // Créer les nœuds Vehicle et relations COMPATIBLE_WITH
    for (const vehicle of data.compatibleVehicles) {
      const vehicleId = `${vehicle.brand}-${vehicle.model}`
        .toLowerCase()
        .replace(/\s+/g, '-');

      await this.neo4j.write(
        `
        MERGE (v:Vehicle {id: $vehicleId})
        ON CREATE SET
          v.brand = $brand,
          v.model = $model
        `,
        {
          vehicleId,
          brand: vehicle.brand,
          model: vehicle.model,
        },
      );

      await this.neo4j.write(
        `
        MATCH (p:Part {id: $partId})
        MATCH (v:Vehicle {id: $vehicleId})
        MERGE (p)-[r:COMPATIBLE_WITH]->(v)
        ON CREATE SET
          r.yearFrom = $yearFrom,
          r.yearTo = $yearTo,
          r.engine = $engine
        `,
        {
          partId: data.partId,
          vehicleId,
          yearFrom: vehicle.yearFrom,
          yearTo: vehicle.yearTo,
          engine: vehicle.engine || null,
        },
      );
    }
  }
}

@Injectable()
@EventsHandler(PartUpdatedEvent)
export class PartUpdatedProjectionHandler implements IEventHandler<PartUpdatedEvent> {
  private readonly logger = new Logger(PartUpdatedProjectionHandler.name);

  constructor(
    private readonly partReadService: PartReadService,
    private readonly neo4j: Neo4jService,
  ) {}

  async handle(event: PartUpdatedEvent): Promise<void> {
    this.logger.log(`Handling PartUpdatedEvent: ${event.aggregateId}`);

    try {
      const changes = event.payload.changes;

      // Mettre à jour MongoDB
      await this.partReadService.updatePart(event.aggregateId, changes);

      // Mettre à jour Neo4j
      await this.updatePartNodeInNeo4j(event.aggregateId, changes);

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

  private async updatePartNodeInNeo4j(
    partId: string,
    changes: {
      name?: string;
      category?: string;
      brand?: string;
      priceInCents?: number;
      isActive?: boolean;
    },
  ): Promise<void> {
    const setClauses: string[] = [];
    const params: Record<string, unknown> = { partId };

    if (changes.name !== undefined) {
      setClauses.push('p.name = $name');
      params.name = changes.name;
    }
    if (changes.category !== undefined) {
      setClauses.push('p.category = $category');
      params.category = changes.category;
    }
    if (changes.brand !== undefined) {
      setClauses.push('p.brand = $brand');
      params.brand = changes.brand;
    }
    if (changes.priceInCents !== undefined) {
      setClauses.push('p.priceInCents = $priceInCents');
      params.priceInCents = changes.priceInCents;
    }
    if (changes.isActive !== undefined) {
      setClauses.push('p.isActive = $isActive');
      params.isActive = changes.isActive;
    }

    if (setClauses.length > 0) {
      await this.neo4j.write(
        `
        MATCH (p:Part {id: $partId})
        SET ${setClauses.join(', ')}
        `,
        params,
      );
    }
  }
}

@Injectable()
@EventsHandler(StockUpdatedEvent)
export class StockUpdatedProjectionHandler implements IEventHandler<StockUpdatedEvent> {
  private readonly logger = new Logger(StockUpdatedProjectionHandler.name);

  constructor(private readonly partReadService: PartReadService) {}

  async handle(event: StockUpdatedEvent): Promise<void> {
    this.logger.log(`Handling StockUpdatedEvent: ${event.aggregateId}`);

    try {
      await this.partReadService.updatePartStock(
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
