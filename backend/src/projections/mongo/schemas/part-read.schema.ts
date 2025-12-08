// =============================================================================
// Part Read Model Schema (MongoDB)
// =============================================================================
// Document dénormalisé optimisé pour la recherche de pièces
//
// Avantages:
// - Une seule requête pour afficher tous les détails
// - Pas de JOINs
// - Indexation sur les champs de recherche
//
// Mis à jour par:
// - PartCreatedEvent
// - PartUpdatedEvent
// - StockUpdatedEvent
// =============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class VehicleCompatibilityRead {
  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  yearFrom: number;

  @Prop({ required: true })
  yearTo: number;

  @Prop()
  engine?: string;

  // Champ calculé pour recherche textuelle
  @Prop()
  searchText: string; // "Renault Clio 2015-2023 1.5 dCi"
}

@Schema({ _id: false })
export class SupplierInfo {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;
}

@Schema({ _id: false })
export class StockInfo {
  @Prop({ default: 0 })
  quantity: number;

  @Prop({ default: 0 })
  reserved: number;

  @Prop({ default: 0 })
  available: number;

  @Prop({ default: false })
  isLow: boolean;

  @Prop({ default: false })
  isOutOfStock: boolean;
}

@Schema({
  collection: 'parts_read',
  timestamps: true,
})
export class PartRead extends Document {
  @Prop({ required: true, unique: true })
  partId: string; // ID du write model

  @Prop({ required: true, type: SupplierInfo })
  supplier: SupplierInfo;

  @Prop({ required: true, index: true })
  reference: string;

  @Prop({ required: true, index: 'text' })
  name: string;

  @Prop({ index: 'text' })
  description: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ required: true, index: true })
  brand: string;

  // Prix
  @Prop({ required: true })
  priceInCents: number;

  @Prop({ required: true })
  price: number; // En euros, pour affichage

  @Prop()
  priceFormatted: string; // "12,99 €"

  @Prop({ default: 'EUR' })
  currency: string;

  // Stock
  @Prop({ type: StockInfo, required: true })
  stock: StockInfo;

  // Compatibilité véhicules
  @Prop({ type: [VehicleCompatibilityRead], default: [] })
  compatibleVehicles: VehicleCompatibilityRead[];

  // Champ pour recherche full-text sur les véhicules
  @Prop({ index: 'text' })
  vehiclesSearchText: string; // "Renault Clio Peugeot 308..."

  @Prop({ default: true, index: true })
  isActive: boolean;

  // Statistiques (optionnel, enrichi plus tard)
  @Prop({ default: 0 })
  orderCount: number;

  @Prop()
  lastOrderedAt?: Date;
}

export const PartReadSchema = SchemaFactory.createForClass(PartRead);

// Index composés pour les recherches fréquentes
PartReadSchema.index({ category: 1, brand: 1 });
PartReadSchema.index({ isActive: 1, 'stock.available': 1 });
PartReadSchema.index({ 'supplier.id': 1 });

// Index text pour la recherche full-text
PartReadSchema.index(
  {
    name: 'text',
    description: 'text',
    reference: 'text',
    vehiclesSearchText: 'text',
  },
  {
    weights: { name: 10, reference: 5, description: 2, vehiclesSearchText: 3 },
  },
);
