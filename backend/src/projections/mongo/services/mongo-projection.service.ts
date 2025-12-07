// =============================================================================
// MongoDB Projection Service
// =============================================================================
// Service pour mettre à jour les Read Models MongoDB
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PartRead } from '../schemas/part-read.schema';
import { OrderRead } from '../schemas/order-read.schema';
import { UserRead } from '../schemas/user-read.schema';

@Injectable()
export class MongoProjectionService {
  private readonly logger = new Logger(MongoProjectionService.name);

  constructor(
    @InjectModel(PartRead.name) private partModel: Model<PartRead>,
    @InjectModel(OrderRead.name) private orderModel: Model<OrderRead>,
    @InjectModel(UserRead.name) private userModel: Model<UserRead>,
  ) {}

  // ===========================================================================
  // User Projections
  // ===========================================================================

  async createUser(data: {
    userId: string;
    email: string;
    companyName: string;
    role: string;
  }): Promise<void> {
    await this.userModel.create({
      userId: data.userId,
      email: data.email,
      companyName: data.companyName,
      role: data.role,
      isActive: true,
    });
    this.logger.log(`User projection created: ${data.userId}`);
  }

  async getUserById(userId: string): Promise<UserRead | null> {
    return this.userModel.findOne({ userId }).exec();
  }

  // ===========================================================================
  // Part Projections
  // ===========================================================================

  async createPart(data: {
    partId: string;
    supplierId: string;
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
  }): Promise<void> {
    // Récupérer les infos du supplier
    const supplier = await this.userModel.findOne({ userId: data.supplierId }).exec();

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
      supplier: {
        id: data.supplierId,
        name: supplier?.companyName || 'Unknown',
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
        searchText: `${v.brand} ${v.model} ${v.yearFrom}-${v.yearTo} ${v.engine || ''}`.trim(),
      })),
      vehiclesSearchText,
      isActive: true,
    });

    // Incrémenter le compteur de pièces du supplier
    await this.userModel.updateOne(
      { userId: data.supplierId },
      { $inc: { totalParts: 1 } },
    );

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

  // ===========================================================================
  // Order Projections
  // ===========================================================================

  async createOrder(data: {
    orderId: string;
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
    totalInCents: number;
    currency: string;
    status: string;
    createdAt: Date;
  }): Promise<void> {
    // Enrichir les lignes avec les noms des suppliers
    const enrichedLines = await Promise.all(
      data.lines.map(async (line) => {
        const supplier = await this.userModel
          .findOne({ userId: line.supplierId })
          .exec();

        const unitPrice = line.unitPriceInCents / 100;
        const totalInCents = line.unitPriceInCents * line.quantity;
        const total = totalInCents / 100;

        return {
          ...line,
          supplierName: supplier?.companyName || 'Unknown',
          unitPrice,
          totalInCents,
          total,
          totalFormatted: new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: data.currency,
          }).format(total),
        };
      }),
    );

    const total = data.totalInCents / 100;
    const supplierIds = [...new Set(data.lines.map((l) => l.supplierId))];

    await this.orderModel.create({
      orderId: data.orderId,
      garage: {
        id: data.garageId,
        name: data.garageName,
      },
      lines: enrichedLines,
      supplierIds,
      status: data.status,
      totalInCents: data.totalInCents,
      total,
      totalFormatted: new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: data.currency,
      }).format(total),
      currency: data.currency,
      statusHistory: [
        {
          status: data.status,
          changedAt: data.createdAt,
        },
      ],
      createdAt: data.createdAt,
    });

    // Incrémenter les compteurs
    await this.userModel.updateOne(
      { userId: data.garageId },
      { $inc: { totalOrders: 1 }, $set: { lastActivityAt: new Date() } },
    );

    // Incrémenter les compteurs de commandes sur les pièces
    for (const line of data.lines) {
      await this.partModel.updateOne(
        { partId: line.partId },
        { $inc: { orderCount: 1 }, $set: { lastOrderedAt: new Date() } },
      );
    }

    this.logger.log(`Order projection created: ${data.orderId}`);
  }

  async updateOrderStatus(data: {
    orderId: string;
    newStatus: string;
    changedBy: string;
    changedAt: Date;
    reason?: string;
  }): Promise<void> {
    const update: Record<string, unknown> = {
      status: data.newStatus,
    };

    if (data.reason) {
      update.cancelReason = data.reason;
    }

    await this.orderModel.updateOne(
      { orderId: data.orderId },
      {
        $set: update,
        $push: {
          statusHistory: {
            status: data.newStatus,
            changedAt: data.changedAt,
            changedBy: data.changedBy,
            reason: data.reason,
          },
        },
      },
    );
    this.logger.log(`Order status projection updated: ${data.orderId} → ${data.newStatus}`);
  }
}
