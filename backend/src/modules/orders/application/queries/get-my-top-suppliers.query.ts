// =============================================================================
// GetMyTopSuppliers Query (Analytics for Garage)
// =============================================================================

export class GetMyTopSuppliersQuery {
  constructor(
    public readonly garageId: string,
    public readonly limit: number = 10,
  ) {}
}
