// =============================================================================
// Value Object Base Class
// =============================================================================
// Classe de base pour tous les Value Objects DDD
//
// Un Value Object est un objet défini par ses attributs plutôt que par son identité.
// Deux Value Objects sont égaux si tous leurs attributs sont égaux.
// Les Value Objects sont IMMUTABLES - on ne peut pas les modifier après création.
//
// Exemples:
// - Email: email1 === email2 si les adresses sont identiques
// - Money: 10€ === 10€ peu importe l'instance
// - Address: Même rue, ville, code postal = même adresse
// =============================================================================

/**
 * Classe de base abstraite pour les Value Objects DDD
 *
 * @typeParam Props - Les propriétés du Value Object
 */
export abstract class ValueObject<Props> {
  protected readonly props: Props;

  constructor(props: Props) {
    this.props = Object.freeze(props); // Immutabilité
  }

  /**
   * Vérifie l'égalité entre deux Value Objects basée sur leurs propriétés
   */
  public equals(vo?: ValueObject<Props>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }

    if (vo.props === undefined) {
      return false;
    }

    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * Clone le Value Object (utile pour créer une copie avec modifications)
   */
  protected clone(props: Partial<Props>): Props {
    return {
      ...this.props,
      ...props,
    };
  }
}
