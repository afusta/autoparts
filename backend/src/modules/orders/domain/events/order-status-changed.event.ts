// =============================================================================
// OrderStatusChanged Domain Event
// =============================================================================
// Émis lorsque le statut d'une commande change
//
// Transitions possibles:
// - PENDING → CONFIRMED (fournisseur confirme)
// - CONFIRMED → SHIPPED (fournisseur expédie)
// - SHIPPED → DELIVERED (livraison confirmée)
// - * → CANCELLED (annulation)
// =============================================================================

import { DomainEvent } from '@shared/ddd';

export interface OrderStatusChangedPayload {
  orderId: string;
  garageId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string; // userId qui a changé le statut
  changedAt: Date;
  reason?: string; // Raison de l'annulation si applicable
}

export class OrderStatusChangedEvent extends DomainEvent<OrderStatusChangedPayload> {
  readonly eventName = 'OrderStatusChanged';

  constructor(payload: OrderStatusChangedPayload) {
    super(payload, {
      aggregateId: payload.orderId,
      aggregateType: 'Order',
    });
  }
}
