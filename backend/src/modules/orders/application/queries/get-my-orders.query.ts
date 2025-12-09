// =============================================================================
// GetMyOrders Query (Garage's own orders)
// =============================================================================

export interface GetMyOrdersParams {
  userId: string;
  userRole: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class GetMyOrdersQuery {
  constructor(public readonly params: GetMyOrdersParams) {}
}
