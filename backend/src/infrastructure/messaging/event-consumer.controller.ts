// =============================================================================
// Event Consumer Controller
// =============================================================================
// Consomme les Domain Events depuis RabbitMQ et met à jour les projections
// Utilise @EventPattern pour écouter les messages du broker
//
// Ce contrôleur est partagé car il consomme des événements de tous les domaines
// et délègue le traitement aux services spécifiques de chaque domaine.
// =============================================================================

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { UserReadService } from '@modules/identity/infrastructure/read-model';
import { PartReadService } from '@modules/catalog/infrastructure/read-model';
import { OrderReadService } from '@modules/orders/infrastructure/read-model';
import { Neo4jService } from '@infrastructure/neo4j';

interface DomainEventMessage {
  eventName: string;
  metadata: {
    eventId: string;
    timestamp: string;
    aggregateId: string;
    aggregateType: string;
    version: number;
    correlationId?: string;
    causationId?: string;
    userId?: string;
  };
  payload: Record<string, unknown>;
}

@Controller()
export class EventConsumerController {
  private readonly logger = new Logger(EventConsumerController.name);

  constructor(
    private readonly userReadService: UserReadService,
    private readonly partReadService: PartReadService,
    private readonly orderReadService: OrderReadService,
    private readonly neo4j: Neo4jService,
  ) {}

  // ===========================================================================
  // User Events
  // ===========================================================================

  @EventPattern('UserRegistered')
  async handleUserRegistered(
    @Payload() data: DomainEventMessage,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(
      `Received UserRegistered event: ${data.metadata.aggregateId}`,
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.userReadService.createUser({
        userId: data.metadata.aggregateId,
        email: data.payload.email as string,
        companyName: data.payload.companyName as string,
        role: data.payload.role as string,
      });

      await this.createUserNodeInNeo4j({
        userId: data.metadata.aggregateId,
        email: data.payload.email as string,
        companyName: data.payload.companyName as string,
        role: data.payload.role as string,
      });

      channel.ack(originalMsg);
      this.logger.log(`User projection created: ${data.metadata.aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to process UserRegistered: ${error}`);
      channel.nack(originalMsg, false, false);
    }
  }

  // ===========================================================================
  // Part Events
  // ===========================================================================

  @EventPattern('PartCreated')
  async handlePartCreated(
    @Payload() data: DomainEventMessage,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received PartCreated event: ${data.metadata.aggregateId}`);
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      // Get supplier name
      const supplier = await this.userReadService.findById(
        data.payload.supplierId as string,
      );

      await this.partReadService.createPart({
        partId: data.metadata.aggregateId,
        supplierId: data.payload.supplierId as string,
        supplierName: supplier?.companyName || 'Unknown',
        reference: data.payload.reference as string,
        name: data.payload.name as string,
        description: (data.payload.description as string) || '',
        category: data.payload.category as string,
        brand: data.payload.brand as string,
        priceInCents: data.payload.priceInCents as number,
        currency: (data.payload.currency as string) || 'EUR',
        stockQuantity: data.payload.stockQuantity as number,
        compatibleVehicles: data.payload.compatibleVehicles as Array<{
          brand: string;
          model: string;
          yearFrom: number;
          yearTo: number;
        }>,
      });

      await this.createPartNodeInNeo4j({
        partId: data.metadata.aggregateId,
        supplierId: data.payload.supplierId as string,
        reference: data.payload.reference as string,
        name: data.payload.name as string,
        category: data.payload.category as string,
        brand: data.payload.brand as string,
        priceInCents: data.payload.priceInCents as number,
        compatibleVehicles: data.payload.compatibleVehicles as Array<{
          brand: string;
          model: string;
          yearFrom: number;
          yearTo: number;
        }>,
      });

      // Increment supplier's total parts
      await this.userReadService.incrementTotalParts(
        data.payload.supplierId as string,
      );

      channel.ack(originalMsg);
      this.logger.log(`Part projection created: ${data.metadata.aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to process PartCreated: ${error}`);
      channel.nack(originalMsg, false, false);
    }
  }

  @EventPattern('PartUpdated')
  async handlePartUpdated(
    @Payload() data: DomainEventMessage,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received PartUpdated event: ${data.metadata.aggregateId}`);
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const changes = data.payload.changes as Record<string, unknown>;
      await this.partReadService.updatePart(data.metadata.aggregateId, changes);
      await this.updatePartNodeInNeo4j(data.metadata.aggregateId, changes);

      channel.ack(originalMsg);
      this.logger.log(`Part projection updated: ${data.metadata.aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to process PartUpdated: ${error}`);
      channel.nack(originalMsg, false, false);
    }
  }

  @EventPattern('StockUpdated')
  async handleStockUpdated(
    @Payload() data: DomainEventMessage,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(
      `Received StockUpdated event: ${data.metadata.aggregateId}`,
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.partReadService.updatePartStock(
        data.metadata.aggregateId,
        data.payload.newQuantity as number,
        data.payload.newReserved as number,
      );

      channel.ack(originalMsg);
      this.logger.log(`Stock projection updated: ${data.metadata.aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to process StockUpdated: ${error}`);
      channel.nack(originalMsg, false, false);
    }
  }

  // ===========================================================================
  // Order Events
  // ===========================================================================

  @EventPattern('OrderCreated')
  async handleOrderCreated(
    @Payload() data: DomainEventMessage,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(
      `Received OrderCreated event: ${data.metadata.aggregateId}`,
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const lines = data.payload.lines as Array<{
        partId: string;
        partName: string;
        partReference: string;
        supplierId: string;
        quantity: number;
        unitPriceInCents: number;
      }>;

      // Enrich lines with supplier names
      const enrichedLines = await Promise.all(
        lines.map(async (line) => {
          const supplier = await this.userReadService.findById(line.supplierId);
          return {
            ...line,
            supplierName: supplier?.companyName || 'Unknown',
          };
        }),
      );

      await this.orderReadService.createOrder({
        orderId: data.metadata.aggregateId,
        garageId: data.payload.garageId as string,
        garageName: data.payload.garageName as string,
        lines: enrichedLines,
        totalInCents: data.payload.totalInCents as number,
        currency: (data.payload.currency as string) || 'EUR',
        status: (data.payload.status as string) || 'PENDING',
        createdAt: new Date(data.metadata.timestamp),
      });

      await this.createOrderRelationshipsInNeo4j({
        orderId: data.metadata.aggregateId,
        garageId: data.payload.garageId as string,
        lines: lines.map((line) => ({
          partId: line.partId,
          supplierId: line.supplierId,
          quantity: line.quantity,
          totalInCents: line.unitPriceInCents * line.quantity,
        })),
        totalInCents: data.payload.totalInCents as number,
        createdAt: new Date(data.metadata.timestamp),
      });

      // Increment garage's total orders
      await this.userReadService.incrementTotalOrders(
        data.payload.garageId as string,
      );

      // Increment part order counts
      for (const line of lines) {
        await this.partReadService.incrementOrderCount(line.partId);
      }

      channel.ack(originalMsg);
      this.logger.log(`Order projection created: ${data.metadata.aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to process OrderCreated: ${error}`);
      channel.nack(originalMsg, false, false);
    }
  }

  @EventPattern('OrderStatusChanged')
  async handleOrderStatusChanged(
    @Payload() data: DomainEventMessage,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(
      `Received OrderStatusChanged event: ${data.metadata.aggregateId}`,
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.orderReadService.updateOrderStatus({
        orderId: data.metadata.aggregateId,
        newStatus: data.payload.newStatus as string,
        changedBy: (data.payload.changedBy as string) || 'system',
        changedAt: new Date(data.metadata.timestamp),
        reason: data.payload.reason as string | undefined,
      });

      await this.neo4j.write(
        `
        MATCH (o:Order {id: $orderId})
        SET o.status = $status, o.updatedAt = datetime()
        `,
        {
          orderId: data.metadata.aggregateId,
          status: data.payload.newStatus as string,
        },
      );

      channel.ack(originalMsg);
      this.logger.log(
        `Order status projection updated: ${data.metadata.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to process OrderStatusChanged: ${error}`);
      channel.nack(originalMsg, false, false);
    }
  }

  // ===========================================================================
  // Neo4j Helper Methods
  // ===========================================================================

  private async createUserNodeInNeo4j(data: {
    userId: string;
    email: string;
    companyName: string;
    role: string;
  }): Promise<void> {
    await this.neo4j.write(
      `
      MERGE (u:User {id: $userId})
      ON CREATE SET
        u.email = $email,
        u.companyName = $companyName,
        u.role = $role,
        u.createdAt = datetime()
      ON MATCH SET
        u.email = $email,
        u.companyName = $companyName,
        u.role = $role
      `,
      {
        userId: data.userId,
        email: data.email,
        companyName: data.companyName,
        role: data.role,
      },
    );

    const roleLabel = data.role.charAt(0) + data.role.slice(1).toLowerCase();
    await this.neo4j.write(
      `
      MATCH (u:User {id: $userId})
      SET u:${roleLabel}
      `,
      { userId: data.userId },
    );
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

  private async updatePartNodeInNeo4j(
    partId: string,
    changes: Record<string, unknown>,
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
