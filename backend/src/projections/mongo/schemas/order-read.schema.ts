// =============================================================================
// Order Read Model Schema (MongoDB)
// =============================================================================
// Document dénormalisé pour l'affichage des commandes
//
// Mis à jour par:
// - OrderCreatedEvent
// - OrderStatusChangedEvent
// =============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class OrderLineRead {
  @Prop({ required: true })
  partId: string;

  @Prop({ required: true })
  partName: string;

  @Prop({ required: true })
  partReference: string;

  @Prop({ required: true })
  supplierId: string;

  @Prop()
  supplierName: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPriceInCents: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  totalInCents: number;

  @Prop({ required: true })
  total: number;

  @Prop()
  totalFormatted: string;
}

@Schema({ _id: false })
export class GarageInfo {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;
}

@Schema({ _id: false })
export class StatusHistory {
  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  changedAt: Date;

  @Prop()
  changedBy: string;

  @Prop()
  reason?: string;
}

@Schema({
  collection: 'orders_read',
  timestamps: true,
})
export class OrderRead extends Document {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop({ required: true, type: GarageInfo })
  garage: GarageInfo;

  @Prop({ type: [OrderLineRead], required: true })
  lines: OrderLineRead[];

  // Liste des fournisseurs impliqués (pour recherche)
  @Prop({ type: [String], index: true })
  supplierIds: string[];

  @Prop({ required: true, index: true })
  status: string;

  @Prop({ required: true })
  totalInCents: number;

  @Prop({ required: true })
  total: number;

  @Prop()
  totalFormatted: string;

  @Prop({ default: 'EUR' })
  currency: string;

  @Prop()
  notes?: string;

  @Prop()
  cancelReason?: string;

  // Historique des changements de statut
  @Prop({ type: [StatusHistory], default: [] })
  statusHistory: StatusHistory[];

  @Prop({ required: true, index: true })
  createdAt: Date;
}

export const OrderReadSchema = SchemaFactory.createForClass(OrderRead);

// Index composés
OrderReadSchema.index({ 'garage.id': 1, status: 1 });
OrderReadSchema.index({ supplierIds: 1, status: 1 });
OrderReadSchema.index({ createdAt: -1 });
