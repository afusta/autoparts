// =============================================================================
// UpdatePart Command
// =============================================================================

export class UpdatePartCommand {
  constructor(
    public readonly partId: string,
    public readonly supplierId: string,
    public readonly changes: {
      name?: string;
      description?: string;
      priceInEuros?: number;
      category?: string;
      brand?: string;
    },
  ) {}
}

export class AddStockCommand {
  constructor(
    public readonly partId: string,
    public readonly supplierId: string,
    public readonly quantity: number,
  ) {}
}
