// =============================================================================
// Domain Event Base Class
// =============================================================================
// Classe de base pour tous les Domain Events
//
// Un Domain Event représente quelque chose d'important qui s'est produit
// dans le domaine métier. Les events sont IMMUTABLES et au passé.
//
// Exemples:
// - OrderCreated     : Une commande a été créée
// - PartUpdated      : Une pièce a été mise à jour
// - StockReserved    : Du stock a été réservé
// - UserRegistered   : Un utilisateur s'est inscrit
//
// Les Domain Events permettent:
// - Le découplage entre bounded contexts
// - La communication asynchrone via RabbitMQ
// - La construction des Read Models (projections)
// - L'audit trail / Event Sourcing
// =============================================================================

import { v4 as uuidv4 } from 'uuid';

/**
 * Interface de base pour les métadonnées d'un event
 */
export interface DomainEventMetadata {
  /** ID unique de l'event */
  eventId: string;
  /** Timestamp de l'event */
  timestamp: Date;
  /** ID de l'agrégat concerné */
  aggregateId: string;
  /** Type de l'agrégat */
  aggregateType: string;
  /** Version de l'event (pour compatibilité) */
  version: number;
  /** ID de corrélation pour tracer les chaînes d'events */
  correlationId?: string;
  /** ID de causalité (event qui a déclenché celui-ci) */
  causationId?: string;
  /** ID de l'utilisateur qui a déclenché l'action */
  userId?: string;
}

/**
 * Classe de base abstraite pour les Domain Events
 *
 * @typeParam Payload - Les données spécifiques à l'event
 */
export abstract class DomainEvent<Payload = unknown> {
  public readonly metadata: DomainEventMetadata;
  public readonly payload: Payload;

  /**
   * Nom de l'event (ex: "OrderCreated", "PartUpdated")
   * Doit être implémenté par chaque event concret
   */
  abstract readonly eventName: string;

  /** Raccourci vers l'ID de l'agrégat */
  get aggregateId(): string {
    return this.metadata.aggregateId;
  }

  /** Raccourci vers le timestamp de l'event */
  get occurredOn(): Date {
    return this.metadata.timestamp;
  }

  constructor(
    payload: Payload,
    metadata: Partial<DomainEventMetadata> & {
      aggregateId: string;
      aggregateType: string;
    },
  ) {
    this.payload = payload;
    this.metadata = {
      eventId: metadata.eventId || uuidv4(),
      timestamp: metadata.timestamp || new Date(),
      aggregateId: metadata.aggregateId,
      aggregateType: metadata.aggregateType,
      version: metadata.version || 1,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      userId: metadata.userId,
    };
  }

  /**
   * Sérialise l'event pour le transport (RabbitMQ)
   */
  public toJSON(): Record<string, unknown> {
    return {
      eventName: this.eventName,
      metadata: this.metadata,
      payload: this.payload,
    };
  }

  /**
   * Crée une copie de l'event avec une nouvelle corrélation
   */
  public withCorrelation(correlationId: string): this {
    const Constructor = this.constructor as new (
      payload: Payload,
      metadata: Partial<DomainEventMetadata> & {
        aggregateId: string;
        aggregateType: string;
      },
    ) => this;

    return new Constructor(this.payload, {
      ...this.metadata,
      correlationId,
    });
  }
}
