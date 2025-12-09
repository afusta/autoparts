// =============================================================================
// Orders Queries Controller
// =============================================================================
// API de lecture optimisées pour les commandes - dispatches to Query Handlers
// =============================================================================

import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import {
  JwtAuthGuard,
  Roles,
  RolesGuard,
  CurrentUser,
} from '@modules/identity/api';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';
import {
  GetMyOrdersQuery,
  GetSupplierOrdersQuery,
  GetMyTopSuppliersQuery,
  PaginatedOrdersResult,
  TopSupplierResult,
} from '@modules/orders/application/queries';

@ApiTags('Queries - Orders')
@ApiBearerAuth()
@Controller('queries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersQueriesController {
  private readonly logger = new Logger(OrdersQueriesController.name);

  constructor(private readonly queryBus: QueryBus) {}

  @Get('my-orders')
  @Roles(UserRoleEnum.GARAGE, UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Mes commandes (Garage/Admin)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyOrders(
    @CurrentUser() user: { id: string; role: string },
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginatedOrdersResult> {
    const query = new GetMyOrdersQuery({
      userId: user.id,
      userRole: user.role,
      status,
      page,
      limit,
    });

    return this.queryBus.execute(query);
  }

  @Get('supplier-orders')
  @Roles(UserRoleEnum.SUPPLIER, UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Commandes reçues (Supplier/Admin)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSupplierOrders(
    @CurrentUser() user: { id: string; role: string },
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginatedOrdersResult> {
    const query = new GetSupplierOrdersQuery({
      userId: user.id,
      userRole: user.role,
      status,
      page,
      limit,
    });

    return this.queryBus.execute(query);
  }

  @Get('analytics/my-top-suppliers')
  @Roles(UserRoleEnum.GARAGE, UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Mes top fournisseurs (Garage)' })
  async getMyTopSuppliers(
    @CurrentUser() user: { id: string },
  ): Promise<TopSupplierResult[]> {
    const query = new GetMyTopSuppliersQuery(user.id, 10);
    return this.queryBus.execute(query);
  }
}
