// =============================================================================
// GetSupplierOrders Query (Orders received by supplier)
// =============================================================================

export interface GetSupplierOrdersParams {
  userId: string;
  userRole: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class GetSupplierOrdersQuery {
  constructor(public readonly params: GetSupplierOrdersParams) {}
}
