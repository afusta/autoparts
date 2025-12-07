// =============================================================================
// Order Status Value Object
// =============================================================================
// Représente l'état d'une commande dans son cycle de vie
//
// Workflow:
// PENDING → CONFIRMED → SHIPPED → DELIVERED
//                ↓          ↓
//           CANCELLED   CANCELLED
//
// Règles:
// - Une commande PENDING peut être confirmée ou annulée
// - Une commande CONFIRMED peut être expédiée ou annulée
// - Une commande SHIPPED peut être livrée ou annulée
// - Une commande DELIVERED ou CANCELLED est finale
// =============================================================================

import { ValueObject } from '@shared/ddd';

export enum OrderStatusEnum {
  PENDING = 'PENDING', // En attente de confirmation fournisseur
  CONFIRMED = 'CONFIRMED', // Confirmée par le fournisseur
  SHIPPED = 'SHIPPED', // Expédiée
  DELIVERED = 'DELIVERED', // Livrée
  CANCELLED = 'CANCELLED', // Annulée
}

interface OrderStatusProps {
  value: OrderStatusEnum;
}

export class OrderStatus extends ValueObject<OrderStatusProps> {
  private constructor(props: OrderStatusProps) {
    super(props);
  }

  get value(): OrderStatusEnum {
    return this.props.value;
  }

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  static pending(): OrderStatus {
    return new OrderStatus({ value: OrderStatusEnum.PENDING });
  }

  static confirmed(): OrderStatus {
    return new OrderStatus({ value: OrderStatusEnum.CONFIRMED });
  }

  static shipped(): OrderStatus {
    return new OrderStatus({ value: OrderStatusEnum.SHIPPED });
  }

  static delivered(): OrderStatus {
    return new OrderStatus({ value: OrderStatusEnum.DELIVERED });
  }

  static cancelled(): OrderStatus {
    return new OrderStatus({ value: OrderStatusEnum.CANCELLED });
  }

  static fromString(status: string): OrderStatus {
    if (!Object.values(OrderStatusEnum).includes(status as OrderStatusEnum)) {
      throw new Error(`Invalid order status: ${status}`);
    }
    return new OrderStatus({ value: status as OrderStatusEnum });
  }

  static fromPersistence(status: string): OrderStatus {
    return new OrderStatus({ value: status as OrderStatusEnum });
  }

  // ===========================================================================
  // State Checks
  // ===========================================================================

  isPending(): boolean {
    return this.props.value === OrderStatusEnum.PENDING;
  }

  isConfirmed(): boolean {
    return this.props.value === OrderStatusEnum.CONFIRMED;
  }

  isShipped(): boolean {
    return this.props.value === OrderStatusEnum.SHIPPED;
  }

  isDelivered(): boolean {
    return this.props.value === OrderStatusEnum.DELIVERED;
  }

  isCancelled(): boolean {
    return this.props.value === OrderStatusEnum.CANCELLED;
  }

  isFinal(): boolean {
    return this.isDelivered() || this.isCancelled();
  }

  // ===========================================================================
  // Transitions
  // ===========================================================================

  canConfirm(): boolean {
    return this.isPending();
  }

  canShip(): boolean {
    return this.isConfirmed();
  }

  canDeliver(): boolean {
    return this.isShipped();
  }

  canCancel(): boolean {
    return !this.isFinal();
  }

  toString(): string {
    return this.props.value;
  }
}
