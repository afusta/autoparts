// =============================================================================
// User Read Model Schema (MongoDB)
// =============================================================================
// Document pour lookup rapide des infos utilisateur
//
// Mis à jour par:
// - UserRegisteredEvent
// =============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'users_read',
  timestamps: true,
})
export class UserRead extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true, index: true })
  email: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true, index: true })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  // Statistiques (enrichies par les events)
  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 0 })
  totalParts: number; // Pour suppliers

  @Prop()
  lastActivityAt?: Date;
}

export const UserReadSchema = SchemaFactory.createForClass(UserRead);
