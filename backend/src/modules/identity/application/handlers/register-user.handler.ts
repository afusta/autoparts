// =============================================================================
// RegisterUser Command Handler
// =============================================================================
// Handler CQRS qui traite la commande RegisterUser
//
// Responsabilités:
// 1. Valider que l'email n'existe pas déjà
// 2. Créer l'aggregate User
// 3. Persister l'aggregate
// 4. Publier les Domain Events
//
// Le handler orchestre la logique applicative mais délègue
// la logique métier à l'Aggregate User.
// =============================================================================

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, ConflictException, Logger } from '@nestjs/common';
import { RegisterUserCommand } from '../commands/register-user.command';
import { User } from '../../domain/entities/user.entity';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { EventPublisherService } from '@infrastructure/rabbitmq';

export interface RegisterUserResult {
  id: string;
  email: string;
  companyName: string;
  role: string;
  isActive: boolean;
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand, RegisterUserResult>
{
  private readonly logger = new Logger(RegisterUserHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    this.logger.log(`Registering user: ${command.email}`);

    // 1. Vérifier que l'email n'existe pas
    const emailExists = await this.userRepository.emailExists(command.email);
    if (emailExists) {
      throw new ConflictException(`Email ${command.email} is already in use`);
    }

    // 2. Créer l'aggregate User (logique métier dans l'aggregate)
    const user = await User.create({
      email: command.email,
      password: command.password,
      companyName: command.companyName,
      role: command.role,
    });

    // 3. Persister l'aggregate
    await this.userRepository.save(user);

    // 4. Publier les Domain Events
    await this.eventPublisher.publishAggregateEvents(user);

    this.logger.log(`User registered successfully: ${user.id}`);

    // 5. Retourner le résultat
    return {
      id: user.id,
      email: user.email.value,
      companyName: user.companyName,
      role: user.role.value,
      isActive: user.isActive,
    };
  }
}
