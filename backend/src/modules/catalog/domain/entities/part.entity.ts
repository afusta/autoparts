// =============================================================================
// Part Aggregate Root
// =============================================================================
// Représente une pièce automobile dans le catalogue d'un fournisseur
//
// Responsabilités:
// - Gestion des informations produit (nom, description, prix)
// - Gestion du stock
// - Gestion des compatibilités véhicules
// - Publication des Domain Events
//
// Règles métier:
// - Une pièce appartient à un seul fournisseur
// - La référence est unique par fournisseur
// - Le prix doit être positif
// - Le stock ne peut pas être négatif
// =============================================================================

import { AggregateRoot } from '@shared/ddd';
import {
  Money,
  Stock,
  PartReference,
  VehicleCompatibility,
} from '../value-objects';
import { PartCreatedEvent, PartUpdatedEvent, StockUpdatedEvent } from '../events';

interface PartProps {
  supplierId: string;
  reference: PartReference;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: Money;
  stock: Stock;
  compatibleVehicles: VehicleCompatibility[];
  isActive: boolean;
}

export interface CreatePartInput {
  supplierId: string;
  reference: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  priceInEuros: number;
  initialStock: number;
  compatibleVehicles: Array<{
    brand: string;
    model: string;
    yearFrom: number;
    yearTo: number;
    engine?: string;
  }>;
}

export class Part extends AggregateRoot<PartProps> {
  private constructor(props: PartProps, id?: string) {
    super(props, id);
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get supplierId(): string {
    return this.props.supplierId;
  }

  get reference(): PartReference {
    return this.props.reference;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }

  get brand(): string {
    return this.props.brand;
  }

  get price(): Money {
    return this.props.price;
  }

  get stock(): Stock {
    return this.props.stock;
  }

  get compatibleVehicles(): VehicleCompatibility[] {
    return [...this.props.compatibleVehicles];
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  /**
   * Crée une nouvelle pièce
   */
  static create(input: CreatePartInput): Part {
    // Validation des champs obligatoires
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Part name must be at least 2 characters');
    }

    if (!input.category || input.category.trim().length === 0) {
      throw new Error('Category is required');
    }

    if (!input.brand || input.brand.trim().length === 0) {
      throw new Error('Brand is required');
    }

    // Créer les Value Objects
    const reference = PartReference.create(input.reference);
    const price = Money.fromEuros(input.priceInEuros);
    const stock = Stock.create(input.initialStock);
    const compatibleVehicles = input.compatibleVehicles.map((v) =>
      VehicleCompatibility.create(v.brand, v.model, v.yearFrom, v.yearTo, v.engine),
    );

    const part = new Part({
      supplierId: input.supplierId,
      reference,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      category: input.category.trim(),
      brand: input.brand.trim(),
      price,
      stock,
      compatibleVehicles,
      isActive: true,
    });

    // Émettre l'event de création
    part.addDomainEvent(
      new PartCreatedEvent({
        partId: part.id,
        supplierId: input.supplierId,
        reference: reference.value,
        name: part.name,
        description: part.description,
        category: part.category,
        brand: part.brand,
        priceInCents: price.amount,
        currency: price.currency,
        stockQuantity: stock.quantity,
        compatibleVehicles: input.compatibleVehicles,
        createdAt: new Date(),
      }),
    );

    return part;
  }

  /**
   * Reconstruit depuis la persistence
   */
  static fromPersistence(
    id: string,
    data: {
      supplierId: string;
      reference: string;
      name: string;
      description: string;
      category: string;
      brand: string;
      priceInCents: number;
      currency: string;
      stockQuantity: number;
      stockReserved: number;
      compatibleVehicles: Array<{
        brand: string;
        model: string;
        yearFrom: number;
        yearTo: number;
        engine?: string;
      }>;
      isActive: boolean;
    },
  ): Part {
    return new Part(
      {
        supplierId: data.supplierId,
        reference: PartReference.fromPersistence(data.reference),
        name: data.name,
        description: data.description,
        category: data.category,
        brand: data.brand,
        price: Money.fromPersistence(data.priceInCents, data.currency),
        stock: Stock.fromPersistence(data.stockQuantity, data.stockReserved),
        compatibleVehicles: data.compatibleVehicles.map((v) =>
          VehicleCompatibility.fromPersistence(v),
        ),
        isActive: data.isActive,
      },
      id,
    );
  }

  // ===========================================================================
  // Behavior Methods
  // ===========================================================================

  /**
   * Met à jour les informations de la pièce
   */
  update(changes: {
    name?: string;
    description?: string;
    priceInEuros?: number;
    category?: string;
    brand?: string;
  }): void {
    const appliedChanges: PartUpdatedEvent['payload']['changes'] = {};

    if (changes.name !== undefined) {
      if (changes.name.trim().length < 2) {
        throw new Error('Part name must be at least 2 characters');
      }
      this.props.name = changes.name.trim();
      appliedChanges.name = this.props.name;
    }

    if (changes.description !== undefined) {
      this.props.description = changes.description.trim();
      appliedChanges.description = this.props.description;
    }

    if (changes.priceInEuros !== undefined) {
      this.props.price = Money.fromEuros(changes.priceInEuros);
      appliedChanges.priceInCents = this.props.price.amount;
    }

    if (changes.category !== undefined) {
      this.props.category = changes.category.trim();
      appliedChanges.category = this.props.category;
    }

    if (changes.brand !== undefined) {
      this.props.brand = changes.brand.trim();
      appliedChanges.brand = this.props.brand;
    }

    if (Object.keys(appliedChanges).length > 0) {
      this.markAsUpdated();
      this.addDomainEvent(
        new PartUpdatedEvent({
          partId: this.id,
          supplierId: this.supplierId,
          changes: appliedChanges,
          updatedAt: new Date(),
        }),
      );
    }
  }

  /**
   * Ajoute du stock (réapprovisionnement)
   */
  addStock(quantity: number): void {
    const previousStock = this.props.stock;
    this.props.stock = this.props.stock.add(quantity);

    this.markAsUpdated();
    this.addDomainEvent(
      new StockUpdatedEvent({
        partId: this.id,
        supplierId: this.supplierId,
        previousQuantity: previousStock.quantity,
        previousReserved: previousStock.reserved,
        newQuantity: this.props.stock.quantity,
        newReserved: this.props.stock.reserved,
        reason: 'RESTOCK',
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * Réserve du stock pour une commande
   */
  reserveStock(quantity: number): void {
    const previousStock = this.props.stock;
    this.props.stock = this.props.stock.reserve(quantity);

    this.markAsUpdated();
    this.addDomainEvent(
      new StockUpdatedEvent({
        partId: this.id,
        supplierId: this.supplierId,
        previousQuantity: previousStock.quantity,
        previousReserved: previousStock.reserved,
        newQuantity: this.props.stock.quantity,
        newReserved: this.props.stock.reserved,
        reason: 'RESERVED',
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * Confirme la réservation (commande expédiée)
   */
  confirmStock(quantity: number): void {
    const previousStock = this.props.stock;
    this.props.stock = this.props.stock.confirm(quantity);

    this.markAsUpdated();
    this.addDomainEvent(
      new StockUpdatedEvent({
        partId: this.id,
        supplierId: this.supplierId,
        previousQuantity: previousStock.quantity,
        previousReserved: previousStock.reserved,
        newQuantity: this.props.stock.quantity,
        newReserved: this.props.stock.reserved,
        reason: 'CONFIRMED',
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * Libère le stock réservé (commande annulée)
   */
  releaseStock(quantity: number): void {
    const previousStock = this.props.stock;
    this.props.stock = this.props.stock.release(quantity);

    this.markAsUpdated();
    this.addDomainEvent(
      new StockUpdatedEvent({
        partId: this.id,
        supplierId: this.supplierId,
        previousQuantity: previousStock.quantity,
        previousReserved: previousStock.reserved,
        newQuantity: this.props.stock.quantity,
        newReserved: this.props.stock.reserved,
        reason: 'RELEASED',
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * Ajoute une compatibilité véhicule
   */
  addVehicleCompatibility(
    brand: string,
    model: string,
    yearFrom: number,
    yearTo: number,
    engine?: string,
  ): void {
    const compatibility = VehicleCompatibility.create(
      brand,
      model,
      yearFrom,
      yearTo,
      engine,
    );

    // Vérifier si déjà existant
    const exists = this.props.compatibleVehicles.some(
      (v) => v.toKey() === compatibility.toKey(),
    );

    if (!exists) {
      this.props.compatibleVehicles.push(compatibility);
      this.markAsUpdated();
    }
  }

  /**
   * Désactive la pièce
   */
  deactivate(): void {
    if (!this.props.isActive) {
      return;
    }

    this.props.isActive = false;
    this.markAsUpdated();
    this.addDomainEvent(
      new PartUpdatedEvent({
        partId: this.id,
        supplierId: this.supplierId,
        changes: { isActive: false },
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * Réactive la pièce
   */
  activate(): void {
    if (this.props.isActive) {
      return;
    }

    this.props.isActive = true;
    this.markAsUpdated();
    this.addDomainEvent(
      new PartUpdatedEvent({
        partId: this.id,
        supplierId: this.supplierId,
        changes: { isActive: true },
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * Vérifie si compatible avec un véhicule
   */
  isCompatibleWith(brand: string, model: string, year: number): boolean {
    return this.props.compatibleVehicles.some((v) =>
      v.isCompatibleWith(brand, model, year),
    );
  }
}
