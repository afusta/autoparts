// =============================================================================
// Order Repository Interface
// =============================================================================

import { IRepository, PaginatedResult, PaginationOptions } from '@shared/ddd';
import { Order } from '../entities/order.entity';
import { OrderStatusEnum } from '../value-objects';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderSearchCriteria {
  garageId?: string;
  supplierId?: string;
  status?: OrderStatusEnum;
  fromDate?: Date;
  toDate?: Date;
}

export interface IOrderRepository extends IRepository<Order> {
  /**
   * Trouve les commandes d'un garage
   */
  findByGarage(
    garageId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Order>>;

  /**
   * Trouve les commandes impliquant un fournisseur
   */
  findBySupplier(
    supplierId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Order>>;

  /**
   * Recherche avec critères
   */
  search(
    criteria: OrderSearchCriteria,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Order>>;

  /**
   * Compte les commandes par statut pour un garage
   */
  countByStatusForGarage(
    garageId: string,
  ): Promise<Record<OrderStatusEnum, number>>;

  /**
   * Compte les commandes par statut pour un fournisseur
   */
  countByStatusForSupplier(
    supplierId: string,
  ): Promise<Record<OrderStatusEnum, number>>;
}
