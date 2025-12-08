// =============================================================================
// Order Aggregate Root
// =============================================================================
// Représente une commande de pièces par un garagiste
//
// Responsabilités:
// - Gestion du cycle de vie de la commande
// - Calcul du total
// - Validation des transitions d'état
// - Publication des Domain Events
//
// Règles métier:
// - Une commande doit avoir au moins une ligne
// - Le statut suit un workflow strict
// - Le prix est figé au moment de la commande
// =============================================================================

import { AggregateRoot } from '@shared/ddd';
import { OrderStatus, OrderLine } from '../value-objects';
import { OrderCreatedEvent, OrderStatusChangedEvent } from '../events';

interface OrderProps {
  garageId: string;
  garageName: string;
  lines: OrderLine[];
  status: OrderStatus;
  notes?: string;
  cancelReason?: string;
}

export interface CreateOrderInput {
  garageId: string;
  garageName: string;
  lines: Array<{
    partId: string;
    partName: string;
    partReference: string;
    supplierId: string;
    quantity: number;
    unitPriceInCents: number;
  }>;
  notes?: string;
}

export class Order extends AggregateRoot<OrderProps> {
  private constructor(props: OrderProps, id?: string) {
    super(props, id);
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get garageId(): string {
    return this.props.garageId;
  }

  get garageName(): string {
    return this.props.garageName;
  }

  get lines(): OrderLine[] {
    return [...this.props.lines];
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get cancelReason(): string | undefined {
    return this.props.cancelReason;
  }

  /**
   * Total de la commande en centimes
   */
  get totalInCents(): number {
    return this.props.lines.reduce((sum, line) => sum + line.totalInCents, 0);
  }

  /**
   * Total de la commande en euros
   */
  get total(): number {
    return this.totalInCents / 100;
  }

  /**
   * Devise (prend celle de la première ligne)
   */
  get currency(): string {
    return this.props.lines[0]?.currency || 'EUR';
  }

  /**
   * Liste des fournisseurs impliqués
   */
  get supplierIds(): string[] {
    return [...new Set(this.props.lines.map((l) => l.supplierId))];
  }

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  /**
   * Crée une nouvelle commande
   */
  static create(input: CreateOrderInput): Order {
    if (!input.lines || input.lines.length === 0) {
      throw new Error('Order must have at least one line');
    }

    const orderLines = input.lines.map((line) =>
      OrderLine.create({
        partId: line.partId,
        partName: line.partName,
        partReference: line.partReference,
        supplierId: line.supplierId,
        quantity: line.quantity,
        unitPriceInCents: line.unitPriceInCents,
      }),
    );

    const order = new Order({
      garageId: input.garageId,
      garageName: input.garageName,
      lines: orderLines,
      status: OrderStatus.pending(),
      notes: input.notes,
    });

    // Émettre l'event de création
    order.addDomainEvent(
      new OrderCreatedEvent({
        orderId: order.id,
        garageId: input.garageId,
        garageName: input.garageName,
        lines: input.lines,
        totalInCents: order.totalInCents,
        currency: order.currency,
        status: order.status.value,
        createdAt: new Date(),
      }),
    );

    return order;
  }

  /**
   * Reconstruit depuis la persistence
   */
  static fromPersistence(
    id: string,
    data: {
      garageId: string;
      garageName: string;
      lines: Array<{
        partId: string;
        partName: string;
        partReference: string;
        supplierId: string;
        quantity: number;
        unitPriceInCents: number;
        currency: string;
      }>;
      status: string;
      notes?: string;
      cancelReason?: string;
    },
  ): Order {
    return new Order(
      {
        garageId: data.garageId,
        garageName: data.garageName,
        lines: data.lines.map((l) => OrderLine.fromPersistence(l)),
        status: OrderStatus.fromPersistence(data.status),
        notes: data.notes,
        cancelReason: data.cancelReason,
      },
      id,
    );
  }

  // ===========================================================================
  // State Transitions
  // ===========================================================================

  /**
   * Confirme la commande (par le fournisseur)
   */
  confirm(confirmedBy: string): void {
    if (!this.props.status.canConfirm()) {
      throw new Error(
        `Cannot confirm order in status ${this.props.status.value}`,
      );
    }

    const previousStatus = this.props.status.value;
    this.props.status = OrderStatus.confirmed();
    this.markAsUpdated();

    this.addDomainEvent(
      new OrderStatusChangedEvent({
        orderId: this.id,
        garageId: this.garageId,
        previousStatus,
        newStatus: this.props.status.value,
        changedBy: confirmedBy,
        changedAt: new Date(),
      }),
    );
  }

  /**
   * Marque la commande comme expédiée
   */
  ship(shippedBy: string): void {
    if (!this.props.status.canShip()) {
      throw new Error(`Cannot ship order in status ${this.props.status.value}`);
    }

    const previousStatus = this.props.status.value;
    this.props.status = OrderStatus.shipped();
    this.markAsUpdated();

    this.addDomainEvent(
      new OrderStatusChangedEvent({
        orderId: this.id,
        garageId: this.garageId,
        previousStatus,
        newStatus: this.props.status.value,
        changedBy: shippedBy,
        changedAt: new Date(),
      }),
    );
  }

  /**
   * Marque la commande comme livrée
   */
  deliver(deliveredBy: string): void {
    if (!this.props.status.canDeliver()) {
      throw new Error(
        `Cannot deliver order in status ${this.props.status.value}`,
      );
    }

    const previousStatus = this.props.status.value;
    this.props.status = OrderStatus.delivered();
    this.markAsUpdated();

    this.addDomainEvent(
      new OrderStatusChangedEvent({
        orderId: this.id,
        garageId: this.garageId,
        previousStatus,
        newStatus: this.props.status.value,
        changedBy: deliveredBy,
        changedAt: new Date(),
      }),
    );
  }

  /**
   * Annule la commande
   */
  cancel(cancelledBy: string, reason: string): void {
    if (!this.props.status.canCancel()) {
      throw new Error(
        `Cannot cancel order in status ${this.props.status.value}`,
      );
    }

    const previousStatus = this.props.status.value;
    this.props.status = OrderStatus.cancelled();
    this.props.cancelReason = reason;
    this.markAsUpdated();

    this.addDomainEvent(
      new OrderStatusChangedEvent({
        orderId: this.id,
        garageId: this.garageId,
        previousStatus,
        newStatus: this.props.status.value,
        changedBy: cancelledBy,
        changedAt: new Date(),
        reason,
      }),
    );
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Vérifie si la commande appartient à un garage
   */
  belongsToGarage(garageId: string): boolean {
    return this.garageId === garageId;
  }

  /**
   * Vérifie si la commande contient des pièces d'un fournisseur
   */
  involvesSupplier(supplierId: string): boolean {
    return this.supplierIds.includes(supplierId);
  }

  /**
   * Formate le total
   */
  formatTotal(): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.currency,
    }).format(this.total);
  }
}
