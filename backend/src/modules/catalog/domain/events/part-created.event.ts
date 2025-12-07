// =============================================================================
// PartCreated Domain Event
// =============================================================================
// Émis lorsqu'une nouvelle pièce est ajoutée au catalogue
//
// Déclenche:
// - Création du document MongoDB (Read Model)
// - Création du nœud Part dans Neo4j avec relations véhicules
// =============================================================================

import { DomainEvent } from '@shared/ddd';

export interface PartCreatedPayload {
  partId: string;
  supplierId: string;
  reference: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  priceInCents: number;
  currency: string;
  stockQuantity: number;
  compatibleVehicles: Array<{
    brand: string;
    model: string;
    yearFrom: number;
    yearTo: number;
    engine?: string;
  }>;
  createdAt: Date;
}

export class PartCreatedEvent extends DomainEvent<PartCreatedPayload> {
  readonly eventName = 'PartCreated';

  constructor(payload: PartCreatedPayload) {
    super(payload, {
      aggregateId: payload.partId,
      aggregateType: 'Part',
    });
  }
}
