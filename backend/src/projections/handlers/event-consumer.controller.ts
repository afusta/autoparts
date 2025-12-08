// =============================================================================
// Event Consumer Controller
// =============================================================================
// Consomme les Domain Events depuis RabbitMQ et met à jour les projections
// Utilise @EventPattern pour écouter les messages du broker
// =============================================================================

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { MongoProjectionService } from '../mongo/services';
import { Neo4jProjectionService } from '../neo4j/services';

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
    private readonly mongoProjection: MongoProjectionService,
    private readonly neo4jProjection: Neo4jProjectionService,
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
      await this.mongoProjection.createUser({
        userId: data.metadata.aggregateId,
        email: data.payload.email as string,
        companyName: data.payload.companyName as string,
        role: data.payload.role as string,
      });

      await this.neo4jProjection.createUserNode({
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
      await this.mongoProjection.createPart({
        partId: data.metadata.aggregateId,
        supplierId: data.payload.supplierId as string,
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

      await this.neo4jProjection.createPartNode({
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
      await this.mongoProjection.updatePart(data.metadata.aggregateId, changes);
      await this.neo4jProjection.updatePartNode(
        data.metadata.aggregateId,
        changes,
      );

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
      await this.mongoProjection.updatePartStock(
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
      await this.mongoProjection.createOrder({
        orderId: data.metadata.aggregateId,
        garageId: data.payload.garageId as string,
        garageName: data.payload.garageName as string,
        lines: data.payload.lines as Array<{
          partId: string;
          partName: string;
          partReference: string;
          supplierId: string;
          quantity: number;
          unitPriceInCents: number;
        }>,
        totalInCents: data.payload.totalInCents as number,
        currency: (data.payload.currency as string) || 'EUR',
        status: (data.payload.status as string) || 'PENDING',
        createdAt: new Date(data.metadata.timestamp),
      });

      await this.neo4jProjection.createOrderRelationships({
        orderId: data.metadata.aggregateId,
        garageId: data.payload.garageId as string,
        lines: (
          data.payload.lines as Array<{
            partId: string;
            supplierId: string;
            quantity: number;
            unitPriceInCents: number;
          }>
        ).map((line) => ({
          partId: line.partId,
          supplierId: line.supplierId,
          quantity: line.quantity,
          totalInCents: line.unitPriceInCents * line.quantity,
        })),
        totalInCents: data.payload.totalInCents as number,
        createdAt: new Date(data.metadata.timestamp),
      });

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
      await this.mongoProjection.updateOrderStatus({
        orderId: data.metadata.aggregateId,
        newStatus: data.payload.newStatus as string,
        changedBy: (data.payload.changedBy as string) || 'system',
        changedAt: new Date(data.metadata.timestamp),
        reason: data.payload.reason as string | undefined,
      });

      await this.neo4jProjection.updateOrderStatus(
        data.metadata.aggregateId,
        data.payload.newStatus as string,
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
}
