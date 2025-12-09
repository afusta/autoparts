// =============================================================================
// User Projection Event Handler
// =============================================================================
// Écoute les événements utilisateur et met à jour les projections
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserRegisteredEvent } from '@modules/identity/domain/events';
import { UserReadService } from '../services/user-read.service';
import { Neo4jService } from '@infrastructure/neo4j';

@Injectable()
@EventsHandler(UserRegisteredEvent)
export class UserProjectionHandler
  implements IEventHandler<UserRegisteredEvent>
{
  private readonly logger = new Logger(UserProjectionHandler.name);

  constructor(
    private readonly userReadService: UserReadService,
    private readonly neo4j: Neo4jService,
  ) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`Handling UserRegisteredEvent: ${event.aggregateId}`);

    try {
      // Mettre à jour MongoDB (Read Model)
      await this.userReadService.createUser({
        userId: event.aggregateId,
        email: event.payload.email,
        companyName: event.payload.companyName,
        role: event.payload.role,
      });

      // Mettre à jour Neo4j (Graph)
      await this.createUserNodeInNeo4j({
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

    // Créer un label supplémentaire basé sur le rôle
    const roleLabel = data.role.charAt(0) + data.role.slice(1).toLowerCase();
    await this.neo4j.write(
      `
      MATCH (u:User {id: $userId})
      SET u:${roleLabel}
      `,
      { userId: data.userId },
    );
  }
}
