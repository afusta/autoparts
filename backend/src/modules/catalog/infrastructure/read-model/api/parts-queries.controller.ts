// =============================================================================
// Parts Queries Controller
// =============================================================================
// API de lecture optimisées pour les pièces (MongoDB Read Model)
// =============================================================================

import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { int } from 'neo4j-driver';
import {
  JwtAuthGuard,
  Roles,
  RolesGuard,
  CurrentUser,
} from '@modules/identity/api';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';
import { PartRead } from '../schemas/part-read.schema';
import { Neo4jService } from '@infrastructure/neo4j';

@ApiTags('Queries - Parts')
@ApiBearerAuth()
@Controller('queries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartsQueriesController {
  private readonly logger = new Logger(PartsQueriesController.name);

  constructor(
    @InjectModel(PartRead.name) private partModel: Model<PartRead>,
    private readonly neo4j: Neo4jService,
  ) {}

  @Get('parts')
  @ApiOperation({ summary: 'Rechercher des pièces (Read Model optimisé)' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Recherche textuelle',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiQuery({ name: 'vehicleBrand', required: false })
  @ApiQuery({ name: 'vehicleModel', required: false })
  @ApiQuery({ name: 'vehicleYear', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchParts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('inStock') inStock?: boolean,
    @Query('vehicleBrand') vehicleBrand?: string,
    @Query('vehicleModel') vehicleModel?: string,
    @Query('vehicleYear') vehicleYear?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const filter: Record<string, unknown> = { isActive: true };

    // Recherche textuelle
    if (search) {
      filter.$text = { $search: search };
    }

    // Filtres simples
    if (category) filter.category = category;
    if (brand) filter.brand = brand;

    // Filtre prix (validate numbers to avoid NaN)
    const minPriceNum = minPrice !== undefined ? Number(minPrice) : NaN;
    const maxPriceNum = maxPrice !== undefined ? Number(maxPrice) : NaN;

    if (!isNaN(minPriceNum) || !isNaN(maxPriceNum)) {
      filter.price = {};
      if (!isNaN(minPriceNum))
        (filter.price as Record<string, number>).$gte = minPriceNum;
      if (!isNaN(maxPriceNum))
        (filter.price as Record<string, number>).$lte = maxPriceNum;
    }

    // Filtre stock
    if (inStock === true || String(inStock) === 'true') {
      filter['stock.isOutOfStock'] = false;
    }

    // Filtre véhicule compatible - use $elemMatch for proper array element matching
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

  @Get('parts/:partId')
  @ApiOperation({ summary: "Détail d'une pièce (Read Model)" })
  @ApiParam({ name: 'partId', description: 'ID de la pièce' })
  async getPartDetail(@Param('partId') partId: string) {
    const part = await this.partModel.findOne({ partId }).exec();

    if (!part) {
      return { error: 'Part not found' };
    }

    // Enrichir avec les pièces souvent commandées ensemble (depuis Neo4j)
    const frequentlyOrderedWith = await this.findFrequentlyOrderedTogether(
      partId,
      5,
    );

    return {
      ...part.toObject(),
      frequentlyOrderedWith,
    };
  }

  @Get('my-parts')
  @Roles(UserRoleEnum.SUPPLIER)
  @ApiOperation({ summary: 'Mes pièces (Supplier)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyParts(
    @CurrentUser() user: { id: string },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const filter: Record<string, unknown> = { 'supplier.id': user.id };
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

  private async findFrequentlyOrderedTogether(
    partId: string,
    limit = 5,
  ): Promise<Array<{ partId: string; count: number }>> {
    const result = await this.neo4j.read(
      `
      MATCH (p1:Part {id: $partId})<-[:CONTAINS]-(o:Order)-[:CONTAINS]->(p2:Part)
      WHERE p1 <> p2
      RETURN p2.id as partId, count(o) as count
      ORDER BY count DESC
      LIMIT $limit
      `,
      { partId, limit: int(limit) },
    );

    return (result as Record<string, unknown>[]).map((record) => ({
      partId: record.partId as string,
      count:
        typeof record.count === 'number'
          ? record.count
          : (record.count as { toNumber: () => number }).toNumber(),
    }));
  }
}
