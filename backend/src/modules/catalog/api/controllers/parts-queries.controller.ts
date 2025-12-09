// =============================================================================
// Parts Queries Controller
// =============================================================================
// API de lecture optimisées pour les pièces - dispatches to Query Handlers
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
import { QueryBus } from '@nestjs/cqrs';
import {
  JwtAuthGuard,
  Roles,
  RolesGuard,
  CurrentUser,
} from '@modules/identity/api';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';
import {
  SearchPartsQuery,
  GetPartDetailQuery,
  GetMyPartsQuery,
  PaginatedPartsResult,
  PartDetailResult,
} from '@modules/catalog/application/queries';

@ApiTags('Queries - Parts')
@ApiBearerAuth()
@Controller('queries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartsQueriesController {
  private readonly logger = new Logger(PartsQueriesController.name);

  constructor(private readonly queryBus: QueryBus) {}

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
  ): Promise<PaginatedPartsResult> {
    const query = new SearchPartsQuery({
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      inStock,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      page,
      limit,
    });

    return this.queryBus.execute(query);
  }

  @Get('parts/:partId')
  @ApiOperation({ summary: "Détail d'une pièce (Read Model)" })
  @ApiParam({ name: 'partId', description: 'ID de la pièce' })
  async getPartDetail(@Param('partId') partId: string) {
    const query = new GetPartDetailQuery(partId);
    const result = await this.queryBus.execute<
      GetPartDetailQuery,
      PartDetailResult
    >(query);

    if (!result.part) {
      return { error: 'Part not found' };
    }

    return {
      ...result.part.toObject(),
      frequentlyOrderedWith: result.frequentlyOrderedWith,
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
  ): Promise<PaginatedPartsResult> {
    const query = new GetMyPartsQuery({
      supplierId: user.id,
      page,
      limit,
    });

    return this.queryBus.execute(query);
  }
}
