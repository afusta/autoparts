// =============================================================================
// Orders Query Response Types
// =============================================================================

import { OrderRead } from '../../infrastructure/read-model/schemas/order-read.schema';

export interface PaginatedOrdersResult {
  items: OrderRead[] | any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TopSupplierResult {
  supplierId: string;
  companyName: string;
  orderCount: number;
  totalSpent: number;
}
