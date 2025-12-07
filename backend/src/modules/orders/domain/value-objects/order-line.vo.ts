// =============================================================================
// Order Line Value Object
// =============================================================================
// Représente une ligne de commande (pièce + quantité + prix)
//
// Immuable: le prix est figé au moment de la commande
// =============================================================================

import { ValueObject } from '@shared/ddd';

interface OrderLineProps {
  partId: string;
  partName: string;
  partReference: string;
  supplierId: string;
  quantity: number;
  unitPriceInCents: number;
  currency: string;
}

export class OrderLine extends ValueObject<OrderLineProps> {
  private constructor(props: OrderLineProps) {
    super(props);
  }

  get partId(): string {
    return this.props.partId;
  }

  get partName(): string {
    return this.props.partName;
  }

  get partReference(): string {
    return this.props.partReference;
  }

  get supplierId(): string {
    return this.props.supplierId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPriceInCents(): number {
    return this.props.unitPriceInCents;
  }

  get unitPrice(): number {
    return this.props.unitPriceInCents / 100;
  }

  get currency(): string {
    return this.props.currency;
  }

  /**
   * Prix total de la ligne en centimes
   */
  get totalInCents(): number {
    return this.props.unitPriceInCents * this.props.quantity;
  }

  /**
   * Prix total de la ligne en euros
   */
  get total(): number {
    return this.totalInCents / 100;
  }

  /**
   * Crée une nouvelle ligne de commande
   */
  static create(input: {
    partId: string;
    partName: string;
    partReference: string;
    supplierId: string;
    quantity: number;
    unitPriceInCents: number;
    currency?: string;
  }): OrderLine {
    if (input.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    if (input.unitPriceInCents < 0) {
      throw new Error('Unit price cannot be negative');
    }

    return new OrderLine({
      partId: input.partId,
      partName: input.partName,
      partReference: input.partReference,
      supplierId: input.supplierId,
      quantity: input.quantity,
      unitPriceInCents: input.unitPriceInCents,
      currency: input.currency || 'EUR',
    });
  }

  /**
   * Reconstruit depuis la persistence
   */
  static fromPersistence(data: {
    partId: string;
    partName: string;
    partReference: string;
    supplierId: string;
    quantity: number;
    unitPriceInCents: number;
    currency: string;
  }): OrderLine {
    return new OrderLine(data);
  }

  /**
   * Formate le prix total
   */
  formatTotal(): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.currency,
    }).format(this.total);
  }

  toString(): string {
    return `${this.quantity}x ${this.partName} @ ${this.unitPrice}€ = ${this.formatTotal()}`;
  }
}
