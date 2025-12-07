// =============================================================================
// Event Publisher Service
// =============================================================================
// Service responsable de la publication des Domain Events sur RabbitMQ
//
// Ce service est appelé après chaque opération réussie sur un Aggregate
// pour propager les changements vers les Read Models.
//
// Pattern: Transactional Outbox (simplifié)
// En production, on utiliserait un pattern Outbox complet pour garantir
// la cohérence entre la persistance et la publication des events.
// =============================================================================

import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { DomainEvent } from '@shared/ddd';
import { RABBITMQ_CLIENT } from './rabbitmq.module';

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(
    @Inject(RABBITMQ_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  /**
   * Publie un Domain Event sur RabbitMQ
   *
   * @param event - L'event à publier
   */
  async publish(event: DomainEvent): Promise<void> {
    const pattern = event.eventName; // Ex: "OrderCreated", "PartUpdated"

    try {
      this.logger.debug(
        `Publishing event: ${pattern} (${event.metadata.eventId})`,
      );

      // Emit est fire-and-forget (pas de réponse attendue)
      this.client.emit(pattern, event.toJSON());

      this.logger.log(
        `Event published: ${pattern} for aggregate ${event.metadata.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish event: ${pattern}`, error);
      throw error;
    }
  }

  /**
   * Publie plusieurs Domain Events
   *
   * @param events - Liste d'events à publier
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }

  /**
   * Publie les events d'un Aggregate et les efface
   *
   * @param aggregate - L'aggregate dont on publie les events
   */
  async publishAggregateEvents(aggregate: {
    domainEvents: DomainEvent[];
    clearDomainEvents: () => void;
  }): Promise<void> {
    const events = aggregate.domainEvents;

    if (events.length === 0) {
      return;
    }

    await this.publishAll(events);
    aggregate.clearDomainEvents();
  }
}
