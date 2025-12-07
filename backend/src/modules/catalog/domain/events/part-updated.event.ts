// =============================================================================
// PartUpdated Domain Event
// =============================================================================
// Émis lorsqu'une pièce est modifiée (prix, description, etc.)
//
// Déclenche:
// - Mise à jour du document MongoDB
// - Mise à jour des propriétés du nœud Neo4j
// =============================================================================

import { DomainEvent } from '@shared/ddd';

export interface PartUpdatedPayload {
  partId: string;
  supplierId: string;
  changes: {
    name?: string;
    description?: string;
    priceInCents?: number;
    category?: string;
    brand?: string;
    isActive?: boolean;
  };
  updatedAt: Date;
}

export class PartUpdatedEvent extends DomainEvent<PartUpdatedPayload> {
  readonly eventName = 'PartUpdated';

  constructor(payload: PartUpdatedPayload) {
    super(payload, {
      aggregateId: payload.partId,
      aggregateType: 'Part',
    });
  }
}
