// =============================================================================
// Aggregate Root Base Class
// =============================================================================
// Classe de base pour tous les Aggregate Roots DDD
//
// Un Aggregate Root est le point d'entrée d'un ensemble d'objets liés.
// C'est lui qui:
// - Garantit la cohérence des données
// - Publie les Domain Events
// - Applique les règles métier
//
// Règles importantes:
// 1. Toute modification passe par l'Aggregate Root
// 2. Les objets internes ne sont pas accessibles directement
// 3. Un Aggregate = une transaction
// 4. Les références entre Aggregates se font par ID uniquement
//
// Exemples d'Aggregates dans notre domaine:
// - Order (contient OrderItems)
// - User (contient ses rôles)
// - Part (contient son stock)
// =============================================================================

import { Entity } from './entity.base';
import { DomainEvent } from './domain-event.base';

/**
 * Classe de base abstraite pour les Aggregate Roots DDD
 *
 * @typeParam Props - Les propriétés spécifiques à l'agrégat
 */
export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = [];
  private _version: number = 0;

  constructor(props: Props, id?: string) {
    super(props, id);
  }

  /**
   * Version de l'agrégat (utile pour optimistic locking)
   */
  get version(): number {
    return this._version;
  }

  /**
   * Liste des Domain Events en attente de publication
   */
  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Enregistre un Domain Event à publier
   * L'event sera publié après la persistance de l'agrégat
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
    this.markAsUpdated();
  }

  /**
   * Supprime tous les events en attente
   * Appelé après publication réussie
   */
  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Incrémente la version (après persistance)
   */
  public incrementVersion(): void {
    this._version++;
  }

  /**
   * Définit la version (lors du chargement depuis la DB)
   */
  public setVersion(version: number): void {
    this._version = version;
  }
}
