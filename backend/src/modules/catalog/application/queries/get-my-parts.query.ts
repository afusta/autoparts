// =============================================================================
// GetMyParts Query (Supplier's own parts)
// =============================================================================

export interface GetMyPartsParams {
  supplierId: string;
  page?: number;
  limit?: number;
}

export class GetMyPartsQuery {
  constructor(public readonly params: GetMyPartsParams) {}
}
