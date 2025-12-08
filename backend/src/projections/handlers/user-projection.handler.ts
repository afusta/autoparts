// =============================================================================
// User Projection Event Handler
// =============================================================================
// Écoute les événements utilisateur et met à jour les projections
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserRegisteredEvent } from '@modules/identity/domain/events';
import { MongoProjectionService } from '../mongo/services';
import { Neo4jProjectionService } from '../neo4j/services';

@Injectable()
@EventsHandler(UserRegisteredEvent)
export class UserProjectionHandler implements IEventHandler<UserRegisteredEvent> {
  private readonly logger = new Logger(UserProjectionHandler.name);

  constructor(
    private readonly mongoProjection: MongoProjectionService,
    private readonly neo4jProjection: Neo4jProjectionService,
  ) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`Handling UserRegisteredEvent: ${event.aggregateId}`);

    try {
      // Mettre à jour MongoDB (Read Model)
      await this.mongoProjection.createUser({
        userId: event.aggregateId,
        email: event.payload.email,
        companyName: event.payload.companyName,
        role: event.payload.role,
      });

      // Mettre à jour Neo4j (Graph)
      await this.neo4jProjection.createUserNode({
        userId: event.aggregateId,
        email: event.payload.email,
        companyName: event.payload.companyName,
        role: event.payload.role,
      });

      this.logger.log(
        `User projections updated successfully: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update user projections: ${event.aggregateId}`,
        error,
      );
      throw error;
    }
  }
}
