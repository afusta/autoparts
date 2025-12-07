// =============================================================================
// User Repository Interface
// =============================================================================
// Définit le contrat pour la persistance des Users
//
// Cette interface est définie dans le Domain Layer mais implémentée
// dans l'Infrastructure Layer (PostgreSQL).
//
// Cela permet:
// - D'isoler le domaine de l'infrastructure
// - De tester le domaine sans base de données (mocks)
// - De changer de DB sans modifier le domaine
// =============================================================================

import { IRepository } from '@shared/ddd';
import { User } from '../entities/user.entity';

/**
 * Token d'injection pour le repository
 * Utilisé par NestJS pour la DI
 */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/**
 * Interface du repository User
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * Trouve un utilisateur par son email
   * @returns User ou null
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Vérifie si un email est déjà utilisé
   */
  emailExists(email: string): Promise<boolean>;
}
