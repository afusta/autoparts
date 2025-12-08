// =============================================================================
// CreatePart Command Handler
// =============================================================================

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, ConflictException, Logger } from '@nestjs/common';
import { CreatePartCommand } from '../commands/create-part.command';
import { Part } from '../../domain/entities/part.entity';
import {
  IPartRepository,
  PART_REPOSITORY,
} from '../../domain/repositories/part.repository.interface';
import { EventPublisherService } from '@infrastructure/rabbitmq';

@CommandHandler(CreatePartCommand)
export class CreatePartHandler implements ICommandHandler<CreatePartCommand> {
  private readonly logger = new Logger(CreatePartHandler.name);

  constructor(
    @Inject(PART_REPOSITORY)
    private readonly partRepository: IPartRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async execute(command: CreatePartCommand): Promise<Part> {
    this.logger.log(
      `Creating part: ${command.reference} for supplier ${command.supplierId}`,
    );

    // Vérifier que la référence n'existe pas déjà pour ce fournisseur
    const exists = await this.partRepository.referenceExists(
      command.supplierId,
      command.reference,
    );

    if (exists) {
      throw new ConflictException(
        `Part reference ${command.reference} already exists for this supplier`,
      );
    }

    // Créer l'aggregate
    const part = Part.create({
      supplierId: command.supplierId,
      reference: command.reference,
      name: command.name,
      description: command.description || '',
      category: command.category,
      brand: command.brand,
      priceInEuros: command.priceInEuros,
      initialStock: command.initialStock,
      compatibleVehicles: command.compatibleVehicles,
    });

    // Persister
    await this.partRepository.save(part);

    // Publier les events
    await this.eventPublisher.publishAggregateEvents(part);

    this.logger.log(`Part created: ${part.id}`);

    return part;
  }
}
