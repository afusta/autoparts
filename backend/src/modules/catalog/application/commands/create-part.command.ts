// =============================================================================
// CreatePart Command
// =============================================================================

export class CreatePartCommand {
  constructor(
    public readonly supplierId: string,
    public readonly reference: string,
    public readonly name: string,
    public readonly description: string,
    public readonly category: string,
    public readonly brand: string,
    public readonly priceInEuros: number,
    public readonly initialStock: number,
    public readonly compatibleVehicles: Array<{
      brand: string;
      model: string;
      yearFrom: number;
      yearTo: number;
      engine?: string;
    }>,
  ) {}
}
