// =============================================================================
// Update Order Status Commands
// =============================================================================

export class ConfirmOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly supplierId: string, // Le fournisseur qui confirme
  ) {}
}

export class ShipOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly supplierId: string,
  ) {}
}

export class DeliverOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly deliveredBy: string,
  ) {}
}

export class CancelOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly cancelledBy: string,
    public readonly reason: string,
  ) {}
}
