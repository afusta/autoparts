// =============================================================================
// UpdatePart & AddStock Command Handlers
// =============================================================================

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { UpdatePartCommand, AddStockCommand } from '../commands/update-part.command';
import { Part } from '../../domain/entities/part.entity';
import {
  IPartRepository,
  PART_REPOSITORY,
} from '../../domain/repositories/part.repository.interface';
import { EventPublisherService } from '@infrastructure/rabbitmq';

@CommandHandler(UpdatePartCommand)
export class UpdatePartHandler implements ICommandHandler<UpdatePartCommand> {
  private readonly logger = new Logger(UpdatePartHandler.name);

  constructor(
    @Inject(PART_REPOSITORY)
    private readonly partRepository: IPartRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async execute(command: UpdatePartCommand): Promise<Part> {
    this.logger.log(`Updating part: ${command.partId}`);

    // Charger la pièce
    const part = await this.partRepository.findById(command.partId);

    if (!part) {
      throw new NotFoundException(`Part ${command.partId} not found`);
    }

    // Vérifier que le fournisseur est le propriétaire
    if (part.supplierId !== command.supplierId) {
      throw new ForbiddenException('You can only update your own parts');
    }

    // Appliquer les modifications
    part.update({
      name: command.changes.name,
      description: command.changes.description,
      priceInEuros: command.changes.priceInEuros,
      category: command.changes.category,
      brand: command.changes.brand,
    });

    // Persister
    await this.partRepository.save(part);

    // Publier les events
    await this.eventPublisher.publishAggregateEvents(part);

    this.logger.log(`Part updated: ${part.id}`);

    return part;
  }
}

@CommandHandler(AddStockCommand)
export class AddStockHandler implements ICommandHandler<AddStockCommand> {
  private readonly logger = new Logger(AddStockHandler.name);

  constructor(
    @Inject(PART_REPOSITORY)
    private readonly partRepository: IPartRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async execute(command: AddStockCommand): Promise<Part> {
    this.logger.log(`Adding ${command.quantity} to stock of part: ${command.partId}`);

    // Charger la pièce
    const part = await this.partRepository.findById(command.partId);

    if (!part) {
      throw new NotFoundException(`Part ${command.partId} not found`);
    }

    // Vérifier que le fournisseur est le propriétaire
    if (part.supplierId !== command.supplierId) {
      throw new ForbiddenException('You can only update stock for your own parts');
    }

    // Ajouter du stock
    part.addStock(command.quantity);

    // Persister
    await this.partRepository.save(part);

    // Publier les events
    await this.eventPublisher.publishAggregateEvents(part);

    this.logger.log(`Stock updated for part: ${part.id}`);

    return part;
  }
}
