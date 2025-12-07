// =============================================================================
// UserRegistered Domain Event
// =============================================================================
// Événement émis lorsqu'un nouvel utilisateur s'inscrit sur la plateforme
//
// Cet event peut déclencher:
// - Envoi d'un email de bienvenue
// - Création du nœud User dans Neo4j
// - Analytics (nouveau user)
// - Notification aux admins
// =============================================================================

import { DomainEvent } from '@shared/ddd';

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  companyName: string;
  role: string;
  registeredAt: Date;
}

export class UserRegisteredEvent extends DomainEvent<UserRegisteredPayload> {
  readonly eventName = 'UserRegistered';

  constructor(payload: UserRegisteredPayload) {
    super(payload, {
      aggregateId: payload.userId,
      aggregateType: 'User',
    });
  }
}
