// =============================================================================
// GetMyParts Query Handler (Supplier's own parts)
// =============================================================================

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { GetMyPartsQuery } from '../../queries/get-my-parts.query';
import { PaginatedPartsResult } from '../../queries/types';
import { PartRead } from '../../../infrastructure/read-model/schemas/part-read.schema';

@QueryHandler(GetMyPartsQuery)
export class GetMyPartsHandler implements IQueryHandler<GetMyPartsQuery> {
  private readonly logger = new Logger(GetMyPartsHandler.name);

  constructor(@InjectModel(PartRead.name) private partModel: Model<PartRead>) {}

  async execute(query: GetMyPartsQuery): Promise<PaginatedPartsResult> {
    const { supplierId, page = 1, limit = 20 } = query.params;

    this.logger.debug(`Getting parts for supplier: ${supplierId}`);

    const filter: Record<string, unknown> = { 'supplier.id': supplierId };
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      this.partModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.partModel.countDocuments(filter).exec(),
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
