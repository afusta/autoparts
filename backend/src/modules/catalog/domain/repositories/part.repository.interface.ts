// =============================================================================
// Part Repository Interface
// =============================================================================
// Définit le contrat pour la persistance des pièces
// =============================================================================

import { IRepository, PaginatedResult, PaginationOptions } from '@shared/ddd';
import { Part } from '../entities/part.entity';

export const PART_REPOSITORY = Symbol('PART_REPOSITORY');

export interface PartSearchCriteria {
  supplierId?: string;
  category?: string;
  brand?: string;
  search?: string; // Recherche textuelle (nom, description, référence)
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isActive?: boolean;
}

export interface IPartRepository extends IRepository<Part> {
  /**
   * Trouve les pièces d'un fournisseur
   */
  findBySupplier(
    supplierId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Part>>;

  /**
   * Trouve une pièce par sa référence chez un fournisseur
   */
  findByReference(supplierId: string, reference: string): Promise<Part | null>;

  /**
   * Vérifie si une référence existe déjà pour un fournisseur
   */
  referenceExists(supplierId: string, reference: string): Promise<boolean>;

  /**
   * Recherche des pièces avec critères
   */
  search(
    criteria: PartSearchCriteria,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Part>>;

  /**
   * Trouve les pièces compatibles avec un véhicule
   */
  findByVehicle(
    vehicleBrand: string,
    vehicleModel: string,
    vehicleYear: number,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Part>>;
}
