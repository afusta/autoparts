// =============================================================================
// Order Read Service (MongoDB Projections)
// =============================================================================
// Service pour mettre à jour les Read Models MongoDB pour les commandes
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderRead } from '../schemas/order-read.schema';

export interface CreateOrderProjectionData {
  orderId: string;
  garageId: string;
  garageName: string;
  lines: Array<{
    partId: string;
    partName: string;
    partReference: string;
    supplierId: string;
    supplierName: string;
    quantity: number;
    unitPriceInCents: number;
  }>;
  totalInCents: number;
  currency: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class OrderReadService {
  private readonly logger = new Logger(OrderReadService.name);

  constructor(
    @InjectModel(OrderRead.name) private orderModel: Model<OrderRead>,
  ) {}

  async createOrder(data: CreateOrderProjectionData): Promise<void> {
    // Enrichir les lignes avec les calculs
    const enrichedLines = data.lines.map((line) => {
      const unitPrice = line.unitPriceInCents / 100;
      const totalInCents = line.unitPriceInCents * line.quantity;
      const total = totalInCents / 100;

      return {
        ...line,
        unitPrice,
        totalInCents,
        total,
        totalFormatted: new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: data.currency,
        }).format(total),
      };
    });

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
    this.logger.log(
      `Order status projection updated: ${data.orderId} → ${data.newStatus}`,
    );
  }

  async findById(orderId: string): Promise<OrderRead | null> {
    return this.orderModel.findOne({ orderId }).exec();
  }
}
