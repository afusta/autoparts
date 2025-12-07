// =============================================================================
// Orders Controller
// =============================================================================
// Controller REST pour la gestion des commandes
//
// Endpoints Garage:
// - POST   /orders           : Créer une commande
// - GET    /orders/my        : Mes commandes (garage)
// - POST   /orders/:id/cancel: Annuler ma commande
//
// Endpoints Supplier:
// - GET    /orders/supplier  : Commandes de mes pièces
// - POST   /orders/:id/confirm: Confirmer une commande
// - POST   /orders/:id/ship  : Expédier une commande
//
// Endpoints communs:
// - GET    /orders/:id       : Détail d'une commande
// - GET    /orders/stats     : Statistiques
// =============================================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { Order } from '../../domain/entities/order.entity';
import {
  IOrderRepository,
  ORDER_REPOSITORY,
} from '../../domain/repositories/order.repository.interface';
import {
  CreateOrderCommand,
  ConfirmOrderCommand,
  ShipOrderCommand,
  CancelOrderCommand,
} from '../../application/commands';
import {
  CreateOrderDto,
  CancelOrderDto,
  OrderResponseDto,
  PaginatedOrdersResponseDto,
  OrderStatsDto,
} from '../dtos';
import { JwtAuthGuard, RolesGuard } from '@modules/identity/api/guards';
import { Roles } from '@modules/identity/api/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '@modules/identity/api/decorators/current-user.decorator';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  // ===========================================================================
  // POST /orders - Créer une commande (Garage uniquement)
  // ===========================================================================
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.GARAGE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order', description: 'Garage only' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const command = new CreateOrderCommand(
      user.id,
      user.companyName,
      dto.lines,
      dto.notes,
    );

    const order = await this.commandBus.execute<CreateOrderCommand, Order>(
      command,
    );
    return this.toResponse(order);
  }

  // ===========================================================================
  // GET /orders/my - Mes commandes (Garage)
  // ===========================================================================
  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.GARAGE)
  @ApiOperation({ summary: 'Get my orders', description: 'Garage only' })
  @ApiResponse({ status: 200, type: PaginatedOrdersResponseDto })
  async getMyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginatedOrdersResponseDto> {
    const result = await this.orderRepository.findByGarage(user.id, {
      page,
      limit,
    });

    return {
      data: result.data.map((o) => this.toResponse(o)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  // ===========================================================================
  // GET /orders/supplier - Commandes de mes pièces (Supplier)
  // ===========================================================================
  @Get('supplier')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.SUPPLIER)
  @ApiOperation({
    summary: 'Get orders involving my products',
    description: 'Supplier only',
  })
  @ApiResponse({ status: 200, type: PaginatedOrdersResponseDto })
  async getSupplierOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginatedOrdersResponseDto> {
    const result = await this.orderRepository.findBySupplier(user.id, {
      page,
      limit,
    });

    return {
      data: result.data.map((o) => this.toResponse(o)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  // ===========================================================================
  // GET /orders/stats - Statistiques
  // ===========================================================================
  @Get('stats')
  @ApiOperation({ summary: 'Get order statistics' })
  @ApiResponse({ status: 200, type: OrderStatsDto })
  async getStats(@CurrentUser() user: AuthenticatedUser): Promise<OrderStatsDto> {
    let counts;

    if (user.role === UserRoleEnum.GARAGE) {
      counts = await this.orderRepository.countByStatusForGarage(user.id);
    } else if (user.role === UserRoleEnum.SUPPLIER) {
      counts = await this.orderRepository.countByStatusForSupplier(user.id);
    } else {
      // Admin: TODO implémenter stats globales
      counts = await this.orderRepository.countByStatusForGarage(user.id);
    }

    return {
      pending: counts.PENDING,
      confirmed: counts.CONFIRMED,
      shipped: counts.SHIPPED,
      delivered: counts.DELIVERED,
      cancelled: counts.CANCELLED,
    };
  }

  // ===========================================================================
  // GET /orders/:id - Détail d'une commande
  // ===========================================================================
  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async getOrder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new ForbiddenException('Order not found');
    }

    // Vérifier l'accès
    const canAccess =
      order.belongsToGarage(user.id) ||
      order.involvesSupplier(user.id) ||
      user.role === UserRoleEnum.ADMIN;

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponse(order);
  }

  // ===========================================================================
  // POST /orders/:id/confirm - Confirmer (Supplier)
  // ===========================================================================
  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.SUPPLIER)
  @ApiOperation({ summary: 'Confirm an order', description: 'Supplier only' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async confirmOrder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const command = new ConfirmOrderCommand(id, user.id);
    const order = await this.commandBus.execute<ConfirmOrderCommand, Order>(
      command,
    );
    return this.toResponse(order);
  }

  // ===========================================================================
  // POST /orders/:id/ship - Expédier (Supplier)
  // ===========================================================================
  @Post(':id/ship')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.SUPPLIER)
  @ApiOperation({ summary: 'Ship an order', description: 'Supplier only' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async shipOrder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const command = new ShipOrderCommand(id, user.id);
    const order = await this.commandBus.execute<ShipOrderCommand, Order>(
      command,
    );
    return this.toResponse(order);
  }

  // ===========================================================================
  // POST /orders/:id/cancel - Annuler
  // ===========================================================================
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    // Vérifier que l'utilisateur peut annuler cette commande
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new ForbiddenException('Order not found');
    }

    const canCancel =
      order.belongsToGarage(user.id) ||
      order.involvesSupplier(user.id) ||
      user.role === UserRoleEnum.ADMIN;

    if (!canCancel) {
      throw new ForbiddenException('You cannot cancel this order');
    }

    const command = new CancelOrderCommand(id, user.id, dto.reason);
    const updatedOrder = await this.commandBus.execute<
      CancelOrderCommand,
      Order
    >(command);
    return this.toResponse(updatedOrder);
  }

  // ===========================================================================
  // Helper
  // ===========================================================================
  private toResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      garageId: order.garageId,
      garageName: order.garageName,
      lines: order.lines.map((l) => ({
        partId: l.partId,
        partName: l.partName,
        partReference: l.partReference,
        supplierId: l.supplierId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.total,
        totalFormatted: l.formatTotal(),
      })),
      status: order.status.value,
      total: order.total,
      totalFormatted: order.formatTotal(),
      notes: order.notes,
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
