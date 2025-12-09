// =============================================================================
// GetMyOrders Query Handler
// =============================================================================

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { GetMyOrdersQuery } from '../../queries/get-my-orders.query';
import { PaginatedOrdersResult } from '../../queries/types';
import { OrderRead } from '../../../infrastructure/read-model/schemas/order-read.schema';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';

@QueryHandler(GetMyOrdersQuery)
export class GetMyOrdersHandler implements IQueryHandler<GetMyOrdersQuery> {
  private readonly logger = new Logger(GetMyOrdersHandler.name);

  constructor(
    @InjectModel(OrderRead.name) private orderModel: Model<OrderRead>,
  ) {}

  async execute(query: GetMyOrdersQuery): Promise<PaginatedOrdersResult> {
    const { userId, userRole, status, page = 1, limit = 20 } = query.params;

    this.logger.debug(`Getting orders for user: ${userId}, role: ${userRole}`);

    const filter: Record<string, unknown> = {};

    // Admin sees all orders, Garage sees only their orders
    if (userRole !== UserRoleEnum.ADMIN) {
      filter['garage.id'] = userId;
    }
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }
}
