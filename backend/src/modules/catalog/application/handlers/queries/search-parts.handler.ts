// =============================================================================
// SearchParts Query Handler
// =============================================================================

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { SearchPartsQuery } from '../../queries/search-parts.query';
import { PaginatedPartsResult } from '../../queries/types';
import { PartRead } from '../../../infrastructure/read-model/schemas/part-read.schema';

@QueryHandler(SearchPartsQuery)
export class SearchPartsHandler implements IQueryHandler<SearchPartsQuery> {
  private readonly logger = new Logger(SearchPartsHandler.name);

  constructor(@InjectModel(PartRead.name) private partModel: Model<PartRead>) {}

  async execute(query: SearchPartsQuery): Promise<PaginatedPartsResult> {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      inStock,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      page = 1,
      limit = 20,
    } = query.params;

    this.logger.debug(
      `Searching parts with params: ${JSON.stringify(query.params)}`,
    );

    const filter: Record<string, unknown> = { isActive: true };

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Simple filters
    if (category) filter.category = category;
    if (brand) filter.brand = brand;

    // Price filter
    const minPriceNum = minPrice !== undefined ? Number(minPrice) : NaN;
    const maxPriceNum = maxPrice !== undefined ? Number(maxPrice) : NaN;

    if (!isNaN(minPriceNum) || !isNaN(maxPriceNum)) {
      filter.price = {};
      if (!isNaN(minPriceNum)) {
        (filter.price as Record<string, number>).$gte = minPriceNum;
      }
      if (!isNaN(maxPriceNum)) {
        (filter.price as Record<string, number>).$lte = maxPriceNum;
      }
    }

    // Stock filter
    if (inStock === true || String(inStock) === 'true') {
      filter['stock.isOutOfStock'] = false;
    }

    // Vehicle compatibility filter using $elemMatch
    if (vehicleBrand || vehicleModel || vehicleYear) {
      const elemMatch: Record<string, unknown> = {};
      if (vehicleBrand) elemMatch.brand = vehicleBrand;
      if (vehicleModel) elemMatch.model = vehicleModel;
      if (vehicleYear) {
        elemMatch.yearFrom = { $lte: Number(vehicleYear) };
        elemMatch.yearTo = { $gte: Number(vehicleYear) };
      }
      filter.compatibleVehicles = { $elemMatch: elemMatch };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      this.partModel
        .find(filter)
        .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
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
