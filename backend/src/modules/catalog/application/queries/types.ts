// =============================================================================
// Catalog Query Response Types
// =============================================================================

import { PartRead } from '../../infrastructure/read-model/schemas/part-read.schema';

export interface PaginatedPartsResult {
  items: PartRead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PartDetailResult {
  part: PartRead | null;
  frequentlyOrderedWith: Array<{
    partId: string;
    name: string;
    reference: string;
    count: number;
  }>;
}
