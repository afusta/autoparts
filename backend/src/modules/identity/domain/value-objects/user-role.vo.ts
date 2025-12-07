// =============================================================================
// UserRole Value Object
// =============================================================================
// Représente le rôle d'un utilisateur dans le système
//
// Rôles disponibles:
// - GARAGE    : Garagiste qui commande des pièces
// - SUPPLIER  : Fournisseur qui vend des pièces
// - ADMIN     : Administrateur de la plateforme
//
// Chaque rôle a des permissions différentes:
// - GARAGE    : Rechercher, Commander
// - SUPPLIER  : Gérer son catalogue, Voir ses commandes
// - ADMIN     : Tout (modération, analytics, etc.)
// =============================================================================

import { ValueObject } from '@shared/ddd';

/**
 * Énumération des rôles possibles
 */
export enum UserRoleEnum {
  GARAGE = 'GARAGE',
  SUPPLIER = 'SUPPLIER',
  ADMIN = 'ADMIN',
}

interface UserRoleProps {
  value: UserRoleEnum;
}

export class UserRole extends ValueObject<UserRoleProps> {
  private constructor(props: UserRoleProps) {
    super(props);
  }

  /**
   * Retourne la valeur du rôle
   */
  get value(): UserRoleEnum {
    return this.props.value;
  }

  /**
   * Factory: Crée un rôle Garage (Garagiste)
   */
  static garage(): UserRole {
    return new UserRole({ value: UserRoleEnum.GARAGE });
  }

  /**
   * Factory: Crée un rôle Supplier (Fournisseur)
   */
  static supplier(): UserRole {
    return new UserRole({ value: UserRoleEnum.SUPPLIER });
  }

  /**
   * Factory: Crée un rôle Admin
   */
  static admin(): UserRole {
    return new UserRole({ value: UserRoleEnum.ADMIN });
  }

  /**
   * Crée un UserRole à partir d'une string
   * @throws Error si le rôle est invalide
   */
  static fromString(role: string): UserRole {
    const upperRole = role.toUpperCase();

    if (!Object.values(UserRoleEnum).includes(upperRole as UserRoleEnum)) {
      throw new Error(
        `Invalid role: ${role}. Must be one of: ${Object.values(UserRoleEnum).join(', ')}`,
      );
    }

    return new UserRole({ value: upperRole as UserRoleEnum });
  }

  /**
   * Reconstruit depuis la persistence
   */
  static fromPersistence(role: string): UserRole {
    return new UserRole({ value: role as UserRoleEnum });
  }

  /**
   * Vérifie si c'est un garagiste
   */
  isGarage(): boolean {
    return this.props.value === UserRoleEnum.GARAGE;
  }

  /**
   * Vérifie si c'est un fournisseur
   */
  isSupplier(): boolean {
    return this.props.value === UserRoleEnum.SUPPLIER;
  }

  /**
   * Vérifie si c'est un admin
   */
  isAdmin(): boolean {
    return this.props.value === UserRoleEnum.ADMIN;
  }

  toString(): string {
    return this.props.value;
  }
}
