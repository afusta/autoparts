// =============================================================================
// CreateOrder Command
// =============================================================================

export class CreateOrderCommand {
  constructor(
    public readonly garageId: string,
    public readonly garageName: string,
    public readonly lines: Array<{
      partId: string;
      quantity: number;
    }>,
    public readonly notes?: string,
  ) {}
}
