// =============================================================================
// Queries Controller
// =============================================================================
// API de lecture optimisées utilisant les Read Models (MongoDB + Neo4j)
//
// Ce contrôleur expose des endpoints de lecture rapides qui ne passent pas
// par les agrégats du domaine. C'est le "Q" de CQRS.
//
// Avantages:
// - Requêtes optimisées pour chaque cas d'usage
// - Données dénormalisées prêtes à l'emploi
// - Pas de transformation côté client
// - Analytique via le graphe Neo4j
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
import {
  JwtAuthGuard,
  Roles,
  RolesGuard,
  CurrentUser,
} from '@modules/identity/api';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';
import { PartRead } from '../mongo/schemas/part-read.schema';
import { OrderRead } from '../mongo/schemas/order-read.schema';
import { Neo4jProjectionService } from '../neo4j/services';

@ApiTags('Queries (Read Models)')
@ApiBearerAuth()
@Controller('queries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueriesController {
  private readonly logger = new Logger(QueriesController.name);

  constructor(
    @InjectModel(PartRead.name) private partModel: Model<PartRead>,
    @InjectModel(OrderRead.name) private orderModel: Model<OrderRead>,
    private readonly neo4jProjection: Neo4jProjectionService,
  ) {}

  // ===========================================================================
  // Parts Queries (MongoDB)
  // ===========================================================================

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

    // Filtre véhicule compatible
    if (vehicleBrand || vehicleModel || vehicleYear) {
      const vehicleFilter: Record<string, unknown> = {};
      if (vehicleBrand)
        vehicleFilter['compatibleVehicles.brand'] = vehicleBrand;
      if (vehicleModel)
        vehicleFilter['compatibleVehicles.model'] = vehicleModel;
      if (vehicleYear) {
        vehicleFilter['compatibleVehicles.yearFrom'] = {
          $lte: Number(vehicleYear),
        };
        vehicleFilter['compatibleVehicles.yearTo'] = {
          $gte: Number(vehicleYear),
        };
      }
      Object.assign(filter, vehicleFilter);
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
    const frequentlyOrderedWith =
      await this.neo4jProjection.findFrequentlyOrderedTogether(partId, 5);

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
    const filter: Record<string, unknown> = { supplierId: user.id };
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

  // ===========================================================================
  // Orders Queries (MongoDB)
  // ===========================================================================

  @Get('my-orders')
  @Roles(UserRoleEnum.GARAGE)
  @ApiOperation({ summary: 'Mes commandes (Garage)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyOrders(
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const filter: Record<string, unknown> = { 'garage.id': user.id };
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

  @Get('supplier-orders')
  @Roles(UserRoleEnum.SUPPLIER)
  @ApiOperation({ summary: 'Commandes reçues (Supplier)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSupplierOrders(
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const filter: Record<string, unknown> = { supplierIds: user.id };
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

    // Filtrer les lignes pour ne montrer que celles du supplier
    const filteredItems = items.map((order) => ({
      ...order.toObject(),
      lines: order.lines.filter((line) => line.supplierId === user.id),
    }));

    return {
      items: filteredItems,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  // ===========================================================================
  // Analytics Queries (Neo4j)
  // ===========================================================================

  @Get('analytics/my-top-suppliers')
  @Roles(UserRoleEnum.GARAGE)
  @ApiOperation({ summary: 'Mes top fournisseurs (Garage)' })
  async getMyTopSuppliers(@CurrentUser() user: { id: string }) {
    return this.neo4jProjection.findTopSuppliersForGarage(user.id);
  }

  @Get('analytics/parts-for-vehicle')
  @ApiOperation({
    summary: 'Pièces compatibles avec un véhicule (Neo4j Graph)',
  })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getPartsForVehicle(
    @Query('brand') brand: string,
    @Query('model') model: string,
    @Query('year') year: number,
  ) {
    return this.neo4jProjection.findPartsForVehicle(brand, model, Number(year));
  }

  @Get('analytics/graph-stats')
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Statistiques du graphe (Admin)' })
  async getGraphStats() {
    return this.neo4jProjection.getGraphStats();
  }
}
