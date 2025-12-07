// =============================================================================
// Entity Base Class
// =============================================================================
// Classe de base pour toutes les Entités DDD
//
// Une Entité est un objet défini par son identité plutôt que par ses attributs.
// Deux entités sont égales si elles ont le même ID, même si leurs attributs diffèrent.
//
// Exemple: Un User avec id="123" reste le même User même si son email change.
// =============================================================================

import { v4 as uuidv4 } from 'uuid';

/**
 * Props de base pour toute entité
 */
export interface BaseEntityProps {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Classe de base abstraite pour les Entités DDD
 *
 * @typeParam Props - Les propriétés spécifiques à l'entité
 */
export abstract class Entity<Props> {
  protected readonly _id: string;
  protected readonly props: Props;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;

  constructor(props: Props, id?: string) {
    this._id = id || uuidv4();
    this.props = props;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Identifiant unique de l'entité
   */
  get id(): string {
    return this._id;
  }

  /**
   * Date de création
   */
  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Date de dernière modification
   */
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Marque l'entité comme modifiée
   */
  protected markAsUpdated(): void {
    this._updatedAt = new Date();
  }

  /**
   * Vérifie l'égalité entre deux entités basée sur leur ID
   */
  public equals(entity?: Entity<Props>): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }

    if (this === entity) {
      return true;
    }

    return this._id === entity._id;
  }
}
