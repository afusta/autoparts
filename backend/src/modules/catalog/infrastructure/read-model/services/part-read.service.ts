// =============================================================================
// Part Read Service (MongoDB Projections)
// =============================================================================
// Service pour mettre à jour les Read Models MongoDB pour les pièces
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PartRead } from '../schemas/part-read.schema';

export interface CreatePartProjectionData {
  partId: string;
  supplierId: string;
  supplierName: string;
  reference: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  priceInCents: number;
  currency: string;
  stockQuantity: number;
  compatibleVehicles: Array<{
    brand: string;
    model: string;
    yearFrom: number;
    yearTo: number;
    engine?: string;
  }>;
}

@Injectable()
export class PartReadService {
  private readonly logger = new Logger(PartReadService.name);

  constructor(@InjectModel(PartRead.name) private partModel: Model<PartRead>) {}

  async createPart(data: CreatePartProjectionData): Promise<void> {
    const price = data.priceInCents / 100;
    const priceFormatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: data.currency,
    }).format(price);

    // Construire le texte de recherche pour les véhicules
    const vehiclesSearchText = data.compatibleVehicles
      .map((v) => `${v.brand} ${v.model} ${v.engine || ''}`.trim())
      .join(' ');

    await this.partModel.create({
      partId: data.partId,
      supplierId: data.supplierId,
      supplier: {
        id: data.supplierId,
        name: data.supplierName,
      },
      reference: data.reference,
      name: data.name,
      description: data.description,
      category: data.category,
      brand: data.brand,
      priceInCents: data.priceInCents,
      price,
      priceFormatted,
      currency: data.currency,
      stock: {
        quantity: data.stockQuantity,
        reserved: 0,
        available: data.stockQuantity,
        isLow: data.stockQuantity <= 5,
        isOutOfStock: data.stockQuantity === 0,
      },
      compatibleVehicles: data.compatibleVehicles.map((v) => ({
        ...v,
        searchText:
          `${v.brand} ${v.model} ${v.yearFrom}-${v.yearTo} ${v.engine || ''}`.trim(),
      })),
      vehiclesSearchText,
      isActive: true,
    });

    this.logger.log(`Part projection created: ${data.partId}`);
  }

  async updatePart(
    partId: string,
    changes: {
      name?: string;
      description?: string;
      priceInCents?: number;
      category?: string;
      brand?: string;
      isActive?: boolean;
    },
  ): Promise<void> {
    const updateData: Record<string, unknown> = { ...changes };

    if (changes.priceInCents !== undefined) {
      const price = changes.priceInCents / 100;
      updateData.price = price;
      updateData.priceFormatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(price);
    }

    await this.partModel.updateOne({ partId }, { $set: updateData });
    this.logger.log(`Part projection updated: ${partId}`);
  }

  async updatePartStock(
    partId: string,
    quantity: number,
    reserved: number,
  ): Promise<void> {
    const available = quantity - reserved;

    await this.partModel.updateOne(
      { partId },
      {
        $set: {
          'stock.quantity': quantity,
          'stock.reserved': reserved,
          'stock.available': available,
          'stock.isLow': available <= 5,
          'stock.isOutOfStock': available === 0,
        },
      },
    );
    this.logger.log(`Part stock projection updated: ${partId}`);
  }

  async incrementOrderCount(partId: string): Promise<void> {
    await this.partModel.updateOne(
      { partId },
      { $inc: { orderCount: 1 }, $set: { lastOrderedAt: new Date() } },
    );
  }

  async findById(partId: string): Promise<PartRead | null> {
    return this.partModel.findOne({ partId }).exec();
  }
}
