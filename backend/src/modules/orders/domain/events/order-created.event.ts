// =============================================================================
// OrderCreated Domain Event
// =============================================================================
// Émis lorsqu'une nouvelle commande est créée
//
// Déclenche:
// - Création du document MongoDB (Read Model)
// - Création des relations dans Neo4j (Garage → Order → Parts)
// - Réservation du stock des pièces
// =============================================================================

import { DomainEvent } from '@shared/ddd';

export interface OrderCreatedPayload {
  orderId: string;
  garageId: string;
  garageName: string;
  lines: Array<{
    partId: string;
    partName: string;
    partReference: string;
    supplierId: string;
    quantity: number;
    unitPriceInCents: number;
  }>;
  totalInCents: number;
  currency: string;
  status: string;
  createdAt: Date;
}

export class OrderCreatedEvent extends DomainEvent<OrderCreatedPayload> {
  readonly eventName = 'OrderCreated';

  constructor(payload: OrderCreatedPayload) {
    super(payload, {
      aggregateId: payload.orderId,
      aggregateType: 'Order',
    });
  }
}
