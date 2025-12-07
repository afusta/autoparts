// =============================================================================
// StockUpdated Domain Event
// =============================================================================
// Émis lorsque le stock d'une pièce change
//
// Cas d'émission:
// - Réapprovisionnement (ajout de stock)
// - Réservation (commande créée)
// - Confirmation (commande expédiée)
// - Libération (commande annulée)
//
// Déclenche:
// - Mise à jour du stock dans MongoDB
// - Alerte si stock bas
// =============================================================================

import { DomainEvent } from '@shared/ddd';

export type StockUpdateReason =
  | 'RESTOCK' // Réapprovisionnement
  | 'RESERVED' // Réservation pour commande
  | 'CONFIRMED' // Commande expédiée
  | 'RELEASED'; // Commande annulée

export interface StockUpdatedPayload {
  partId: string;
  supplierId: string;
  previousQuantity: number;
  previousReserved: number;
  newQuantity: number;
  newReserved: number;
  reason: StockUpdateReason;
  updatedAt: Date;
}

export class StockUpdatedEvent extends DomainEvent<StockUpdatedPayload> {
  readonly eventName = 'StockUpdated';

  constructor(payload: StockUpdatedPayload) {
    super(payload, {
      aggregateId: payload.partId,
      aggregateType: 'Part',
    });
  }
}
