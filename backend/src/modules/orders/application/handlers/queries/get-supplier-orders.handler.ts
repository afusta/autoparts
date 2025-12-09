// =============================================================================
// GetSupplierOrders Query Handler
// =============================================================================

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { GetSupplierOrdersQuery } from '../../queries/get-supplier-orders.query';
import { PaginatedOrdersResult } from '../../queries/types';
import { OrderRead } from '../../../infrastructure/read-model/schemas/order-read.schema';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';

@QueryHandler(GetSupplierOrdersQuery)
export class GetSupplierOrdersHandler implements IQueryHandler<GetSupplierOrdersQuery> {
  private readonly logger = new Logger(GetSupplierOrdersHandler.name);

  constructor(
    @InjectModel(OrderRead.name) private orderModel: Model<OrderRead>,
  ) {}

  async execute(query: GetSupplierOrdersQuery): Promise<PaginatedOrdersResult> {
    const { userId, userRole, status, page = 1, limit = 20 } = query.params;

    this.logger.debug(
      `Getting supplier orders for user: ${userId}, role: ${userRole}`,
    );

    const isAdmin = userRole === UserRoleEnum.ADMIN;
    const skip = (Number(page) - 1) * Number(limit);

    // Build match stage
    const matchStage: Record<string, unknown> = {};
    if (!isAdmin) {
      matchStage.supplierIds = userId;
    }
    if (status) {
      matchStage.status = status;
    }

    // Aggregation pipeline - filter lines at DB level
    const pipeline: any[] = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: Number(limit) },
            // Filter lines only for non-admin users
            ...(isAdmin
              ? []
              : [
                  {
                    $addFields: {
                      lines: {
                        $filter: {
                          input: '$lines',
                          as: 'line',
                          cond: { $eq: ['$$line.supplierId', userId] },
                        },
                      },
                    },
                  },
                ]),
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const result = await this.orderModel.aggregate(pipeline).exec();
    const items = result[0]?.items || [];
    const total = result[0]?.totalCount[0]?.count || 0;

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
