// =============================================================================
// Repository Interface
// =============================================================================
// Interface de base pour tous les Repositories DDD
//
// Un Repository est une abstraction de la persistance des Aggregates.
// Il isole le domaine de l'infrastructure (PostgreSQL, MongoDB, etc.)
//
// Pattern Repository:
// - Interface définie dans le Domain Layer
// - Implémentation dans l'Infrastructure Layer
// - Injecté via Dependency Injection
//
// Cela permet de:
// - Tester le domaine sans base de données
// - Changer de DB sans modifier le domaine
// - Respecter le principe d'inversion de dépendance
// =============================================================================

import { AggregateRoot } from './aggregate-root.base';

/**
 * Options de pagination
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Résultat paginé
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface de base pour les Repositories
 *
 * @typeParam T - Le type d'Aggregate Root géré par le repository
 */
export interface IRepository<T extends AggregateRoot<unknown>> {
  /**
   * Trouve un agrégat par son ID
   * @returns L'agrégat ou null s'il n'existe pas
   */
  findById(id: string): Promise<T | null>;

  /**
   * Persiste un agrégat (création ou mise à jour)
   * @returns L'agrégat persisté avec son ID
   */
  save(aggregate: T): Promise<T>;

  /**
   * Supprime un agrégat
   * @returns true si supprimé, false sinon
   */
  delete(id: string): Promise<boolean>;

  /**
   * Vérifie l'existence d'un agrégat
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Interface étendue avec pagination
 */
export interface IPaginatedRepository<
  T extends AggregateRoot<unknown>,
> extends IRepository<T> {
  /**
   * Retourne une liste paginée
   */
  findAll(options: PaginationOptions): Promise<PaginatedResult<T>>;
}
