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

import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { DomainEvent } from '@shared/ddd';
import { RABBITMQ_CLIENT } from './rabbitmq.constants';

@Injectable()
export class EventPublisherService implements OnModuleInit {
  private readonly logger = new Logger(EventPublisherService.name);
  private isConnected = false;

  constructor(
    @Inject(RABBITMQ_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.warn(
        'Failed to connect to RabbitMQ - events will not be published',
        error,
      );
    }
  }

  /**
   * Publie un Domain Event sur RabbitMQ
   *
   * @param event - L'event à publier
   */
  async publish(event: DomainEvent): Promise<void> {
    const pattern = event.eventName; // Ex: "OrderCreated", "PartUpdated"

    if (!this.isConnected) {
      this.logger.warn(`RabbitMQ not connected - skipping event: ${pattern}`);
      return;
    }

    try {
      this.logger.debug(
        `Publishing event: ${pattern} (${event.metadata.eventId})`,
      );

      // emit() returns an Observable - must convert to Promise
      await lastValueFrom(
        this.client.emit(pattern, event.toJSON()).pipe(
          timeout(5000),
          catchError((err) => {
            this.logger.error(`Failed to publish event: ${pattern}`, err);
            throw err;
          }),
        ),
      );

      this.logger.log(
        `Event published: ${pattern} for aggregate ${event.metadata.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish event: ${pattern}`, error);
      // Don't throw - allow the operation to complete even if event publishing fails
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
