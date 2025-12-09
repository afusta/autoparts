// =============================================================================
// Orders Queries Controller
// =============================================================================
// API de lecture optimisées pour les commandes (MongoDB Read Model)
// =============================================================================

import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
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
import { OrderRead } from '../schemas/order-read.schema';
import { Neo4jService } from '@infrastructure/neo4j';

@ApiTags('Queries - Orders')
@ApiBearerAuth()
@Controller('queries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersQueriesController {
  private readonly logger = new Logger(OrdersQueriesController.name);

  constructor(
    @InjectModel(OrderRead.name) private orderModel: Model<OrderRead>,
    private readonly neo4j: Neo4jService,
  ) {}

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

  @Get('analytics/my-top-suppliers')
  @Roles(UserRoleEnum.GARAGE)
  @ApiOperation({ summary: 'Mes top fournisseurs (Garage)' })
  async getMyTopSuppliers(@CurrentUser() user: { id: string }) {
    const result = await this.neo4j.read(
      `
      MATCH (g:User {id: $garageId})-[r:ORDERED_FROM]->(s:User)
      RETURN
        s.id as supplierId,
        s.companyName as companyName,
        r.orderCount as orderCount,
        r.totalSpentInCents as totalSpent
      ORDER BY r.totalSpentInCents DESC
      LIMIT $limit
      `,
      { garageId: user.id, limit: int(10) },
    );

    return (result as Record<string, unknown>[]).map((record) => ({
      supplierId: record.supplierId as string,
      companyName: record.companyName as string,
      orderCount:
        typeof record.orderCount === 'number'
          ? record.orderCount
          : (record.orderCount as { toNumber: () => number }).toNumber(),
      totalSpent:
        (typeof record.totalSpent === 'number'
          ? record.totalSpent
          : (record.totalSpent as { toNumber: () => number }).toNumber()) / 100,
    }));
  }
}
