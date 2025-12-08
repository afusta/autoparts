// =============================================================================
// Update Order Status Handlers
// =============================================================================

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ConfirmOrderCommand,
  ShipOrderCommand,
  DeliverOrderCommand,
  CancelOrderCommand,
} from '../commands/update-order-status.command';
import { Order } from '../../domain/entities/order.entity';
import {
  IOrderRepository,
  ORDER_REPOSITORY,
} from '../../domain/repositories/order.repository.interface';
import {
  IPartRepository,
  PART_REPOSITORY,
} from '@modules/catalog/domain/repositories/part.repository.interface';
import { EventPublisherService } from '@infrastructure/rabbitmq';

// =============================================================================
// ConfirmOrder Handler
// =============================================================================
@CommandHandler(ConfirmOrderCommand)
export class ConfirmOrderHandler implements ICommandHandler<ConfirmOrderCommand> {
  private readonly logger = new Logger(ConfirmOrderHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async execute(command: ConfirmOrderCommand): Promise<Order> {
    const order = await this.orderRepository.findById(command.orderId);

    if (!order) {
      throw new NotFoundException(`Order ${command.orderId} not found`);
    }

    // Vérifier que le fournisseur est impliqué dans la commande
    if (!order.involvesSupplier(command.supplierId)) {
      throw new ForbiddenException(
        'You can only confirm orders that involve your products',
      );
    }

    order.confirm(command.supplierId);

    await this.orderRepository.save(order);
    await this.eventPublisher.publishAggregateEvents(order);

    this.logger.log(
      `Order ${order.id} confirmed by supplier ${command.supplierId}`,
    );

    return order;
  }
}

// =============================================================================
// ShipOrder Handler
// =============================================================================
@CommandHandler(ShipOrderCommand)
export class ShipOrderHandler implements ICommandHandler<ShipOrderCommand> {
  private readonly logger = new Logger(ShipOrderHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PART_REPOSITORY)
    private readonly partRepository: IPartRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async execute(command: ShipOrderCommand): Promise<Order> {
    const order = await this.orderRepository.findById(command.orderId);

    if (!order) {
      throw new NotFoundException(`Order ${command.orderId} not found`);
    }

    if (!order.involvesSupplier(command.supplierId)) {
      throw new ForbiddenException(
        'You can only ship orders that involve your products',
      );
    }

    // Confirmer le stock (réduire le stock total)
    for (const line of order.lines) {
      if (line.supplierId === command.supplierId) {
        const part = await this.partRepository.findById(line.partId);
        if (part) {
          part.confirmStock(line.quantity);
          await this.partRepository.save(part);
          await this.eventPublisher.publishAggregateEvents(part);
        }
      }
    }

    order.ship(command.supplierId);

    await this.orderRepository.save(order);
    await this.eventPublisher.publishAggregateEvents(order);

    this.logger.log(
      `Order ${order.id} shipped by supplier ${command.supplierId}`,
    );

    return order;
  }
}

// =============================================================================
// DeliverOrder Handler
// =============================================================================
@CommandHandler(DeliverOrderCommand)
export class DeliverOrderHandler implements ICommandHandler<DeliverOrderCommand> {
  private readonly logger = new Logger(DeliverOrderHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async execute(command: DeliverOrderCommand): Promise<Order> {
    const order = await this.orderRepository.findById(command.orderId);

    if (!order) {
      throw new NotFoundException(`Order ${command.orderId} not found`);
    }

    order.deliver(command.deliveredBy);

    await this.orderRepository.save(order);
    await this.eventPublisher.publishAggregateEvents(order);

    this.logger.log(`Order ${order.id} delivered`);

    return order;
  }
}

// =============================================================================
// CancelOrder Handler
// =============================================================================
@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
  private readonly logger = new Logger(CancelOrderHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PART_REPOSITORY)
    private readonly partRepository: IPartRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async execute(command: CancelOrderCommand): Promise<Order> {
    const order = await this.orderRepository.findById(command.orderId);

    if (!order) {
      throw new NotFoundException(`Order ${command.orderId} not found`);
    }

    // Libérer le stock réservé si la commande n'a pas encore été expédiée
    if (order.status.isPending() || order.status.isConfirmed()) {
      for (const line of order.lines) {
        const part = await this.partRepository.findById(line.partId);
        if (part) {
          part.releaseStock(line.quantity);
          await this.partRepository.save(part);
          await this.eventPublisher.publishAggregateEvents(part);
        }
      }
    }

    order.cancel(command.cancelledBy, command.reason);

    await this.orderRepository.save(order);
    await this.eventPublisher.publishAggregateEvents(order);

    this.logger.log(`Order ${order.id} cancelled: ${command.reason}`);

    return order;
  }
}
