// =============================================================================
// Parts Controller (Commands Only - CQRS Write Side)
// =============================================================================
// Controller REST pour les commandes d'écriture uniquement.
// Les lectures passent par /api/v1/queries/* (voir queries.controller.ts)
//
// Endpoints:
// - POST   /parts           : Créer une pièce (Supplier)
// - PUT    /parts/:id       : Modifier une pièce (Supplier owner)
// - POST   /parts/:id/stock : Ajouter du stock (Supplier owner)
// =============================================================================

import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { Part } from '../../domain/entities/part.entity';
import {
  IPartRepository,
  PART_REPOSITORY,
} from '../../domain/repositories/part.repository.interface';
import {
  CreatePartCommand,
  UpdatePartCommand,
  AddStockCommand,
} from '../../application/commands';
import {
  CreatePartDto,
  UpdatePartDto,
  UpdateStockDto,
  PartResponseDto,
} from '../dtos';
import { JwtAuthGuard, RolesGuard } from '@modules/identity/api/guards';
import { Roles } from '@modules/identity/api/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '@modules/identity/api/decorators/current-user.decorator';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';

@ApiTags('Catalog')
@Controller('parts')
export class PartsController {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(PART_REPOSITORY)
    private readonly partRepository: IPartRepository,
  ) {}

  // ===========================================================================
  // POST /parts - Créer une pièce (Supplier uniquement)
  // ===========================================================================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleEnum.SUPPLIER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new part', description: 'Supplier only' })
  @ApiResponse({ status: 201, type: PartResponseDto })
  @ApiResponse({ status: 409, description: 'Reference already exists' })
  async createPart(
    @Body() dto: CreatePartDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartResponseDto> {
    const command = new CreatePartCommand(
      user.id,
      dto.reference,
      dto.name,
      dto.description || '',
      dto.category,
      dto.brand,
      dto.price,
      dto.initialStock,
      dto.compatibleVehicles,
    );

    const part = await this.commandBus.execute<CreatePartCommand, Part>(
      command,
    );
    return this.toResponse(part);
  }

  // ===========================================================================
  // PUT /parts/:id - Modifier une pièce
  // ===========================================================================
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleEnum.SUPPLIER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a part',
    description: 'Supplier owner only',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: PartResponseDto })
  async updatePart(
    @Param('id') id: string,
    @Body() dto: UpdatePartDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartResponseDto> {
    const command = new UpdatePartCommand(id, user.id, {
      name: dto.name,
      description: dto.description,
      priceInEuros: dto.price,
      category: dto.category,
      brand: dto.brand,
    });

    const part = await this.commandBus.execute<UpdatePartCommand, Part>(
      command,
    );
    return this.toResponse(part);
  }

  // ===========================================================================
  // POST /parts/:id/stock - Ajouter du stock
  // ===========================================================================
  @Post(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleEnum.SUPPLIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add stock', description: 'Supplier owner only' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: PartResponseDto })
  async addStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartResponseDto> {
    const command = new AddStockCommand(id, user.id, dto.quantity);
    const part = await this.commandBus.execute<AddStockCommand, Part>(command);
    return this.toResponse(part);
  }

  // ===========================================================================
  // Helper: Convert Part to DTO
  // ===========================================================================
  private toResponse(part: Part): PartResponseDto {
    return {
      id: part.id,
      supplierId: part.supplierId,
      reference: part.reference.value,
      name: part.name,
      description: part.description,
      category: part.category,
      brand: part.brand,
      price: part.price.value,
      priceFormatted: part.price.format(),
      stock: {
        quantity: part.stock.quantity,
        reserved: part.stock.reserved,
        available: part.stock.available,
      },
      compatibleVehicles: part.compatibleVehicles.map((v) => ({
        brand: v.brand,
        model: v.model,
        yearFrom: v.yearFrom,
        yearTo: v.yearTo,
        engine: v.engine,
      })),
      isActive: part.isActive,
      createdAt: part.createdAt,
      updatedAt: part.updatedAt,
    };
  }
}
