// =============================================================================
// SearchParts Query
// =============================================================================

export interface SearchPartsParams {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  page?: number;
  limit?: number;
}

export class SearchPartsQuery {
  constructor(public readonly params: SearchPartsParams) {}
}
