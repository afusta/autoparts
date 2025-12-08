// =============================================================================
// CreateOrder Command Handler
// =============================================================================
// Crée une nouvelle commande et réserve le stock des pièces
//
// Workflow:
// 1. Valider les pièces (existent, actives, stock suffisant)
// 2. Créer l'agrégat Order avec les informations des pièces
// 3. Réserver le stock pour chaque pièce
// 4. Persister la commande
// 5. Publier les Domain Events
// =============================================================================

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, BadRequestException, Logger } from '@nestjs/common';
import { CreateOrderCommand } from '../commands/create-order.command';
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

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  private readonly logger = new Logger(CreateOrderHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PART_REPOSITORY)
    private readonly partRepository: IPartRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async execute(command: CreateOrderCommand): Promise<Order> {
    this.logger.log(`Creating order for garage: ${command.garageId}`);

    // 1. Valider et récupérer les pièces
    const orderLines: Array<{
      partId: string;
      partName: string;
      partReference: string;
      supplierId: string;
      quantity: number;
      unitPriceInCents: number;
    }> = [];

    const partsToReserve: Array<{ part: any; quantity: number }> = [];

    for (const line of command.lines) {
      const part = await this.partRepository.findById(line.partId);

      if (!part) {
        throw new BadRequestException(`Part ${line.partId} not found`);
      }

      if (!part.isActive) {
        throw new BadRequestException(`Part ${part.name} is not available`);
      }

      if (!part.stock.canReserve(line.quantity)) {
        throw new BadRequestException(
          `Insufficient stock for ${part.name}. Available: ${part.stock.available}, Requested: ${line.quantity}`,
        );
      }

      orderLines.push({
        partId: part.id,
        partName: part.name,
        partReference: part.reference.value,
        supplierId: part.supplierId,
        quantity: line.quantity,
        unitPriceInCents: part.price.amount,
      });

      partsToReserve.push({ part, quantity: line.quantity });
    }

    // 2. Créer l'agrégat Order
    const order = Order.create({
      garageId: command.garageId,
      garageName: command.garageName,
      lines: orderLines,
      notes: command.notes,
    });

    // 3. Réserver le stock pour chaque pièce
    for (const { part, quantity } of partsToReserve) {
      part.reserveStock(quantity);
      await this.partRepository.save(part);
      // Publier les events de stock
      await this.eventPublisher.publishAggregateEvents(part);
    }

    // 4. Persister la commande
    await this.orderRepository.save(order);

    // 5. Publier les events de la commande
    await this.eventPublisher.publishAggregateEvents(order);

    this.logger.log(
      `Order created: ${order.id} with ${orderLines.length} lines`,
    );

    return order;
  }
}
