// =============================================================================
// Stock Value Object
// =============================================================================
// Représente la quantité en stock d'une pièce
//
// Règles:
// - La quantité ne peut pas être négative
// - Gère les réservations (stock réservé pour commandes en cours)
// =============================================================================

import { ValueObject } from '@shared/ddd';

interface StockProps {
  quantity: number;
  reserved: number;
}

export class Stock extends ValueObject<StockProps> {
  private constructor(props: StockProps) {
    super(props);
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get reserved(): number {
    return this.props.reserved;
  }

  /**
   * Quantité disponible (total - réservé)
   */
  get available(): number {
    return this.props.quantity - this.props.reserved;
  }

  /**
   * Crée un nouveau Stock
   */
  static create(quantity: number, reserved = 0): Stock {
    if (quantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }
    if (reserved < 0) {
      throw new Error('Reserved quantity cannot be negative');
    }
    if (reserved > quantity) {
      throw new Error('Reserved quantity cannot exceed total quantity');
    }

    return new Stock({ quantity, reserved });
  }

  /**
   * Reconstruit depuis la persistence
   */
  static fromPersistence(quantity: number, reserved: number): Stock {
    return new Stock({ quantity, reserved });
  }

  /**
   * Vérifie si la quantité demandée est disponible
   */
  canReserve(quantity: number): boolean {
    return this.available >= quantity;
  }

  /**
   * Réserve du stock (pour une commande)
   */
  reserve(quantity: number): Stock {
    if (!this.canReserve(quantity)) {
      throw new Error(
        `Cannot reserve ${quantity} items. Only ${this.available} available.`,
      );
    }

    return Stock.create(this.quantity, this.reserved + quantity);
  }

  /**
   * Libère du stock réservé (commande annulée)
   */
  release(quantity: number): Stock {
    if (quantity > this.reserved) {
      throw new Error(`Cannot release ${quantity} items. Only ${this.reserved} reserved.`);
    }

    return Stock.create(this.quantity, this.reserved - quantity);
  }

  /**
   * Confirme la réservation (commande expédiée)
   * Réduit le stock total et le stock réservé
   */
  confirm(quantity: number): Stock {
    if (quantity > this.reserved) {
      throw new Error(`Cannot confirm ${quantity} items. Only ${this.reserved} reserved.`);
    }

    return Stock.create(this.quantity - quantity, this.reserved - quantity);
  }

  /**
   * Ajoute du stock (réapprovisionnement)
   */
  add(quantity: number): Stock {
    if (quantity < 0) {
      throw new Error('Cannot add negative quantity');
    }

    return Stock.create(this.quantity + quantity, this.reserved);
  }

  /**
   * Vérifie si le stock est bas
   */
  isLow(threshold = 5): boolean {
    return this.available <= threshold;
  }

  /**
   * Vérifie si le stock est épuisé
   */
  isOutOfStock(): boolean {
    return this.available === 0;
  }

  toString(): string {
    return `${this.available} available (${this.reserved} reserved)`;
  }
}
