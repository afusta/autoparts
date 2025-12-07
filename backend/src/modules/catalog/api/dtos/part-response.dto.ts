// =============================================================================
// Part Response DTOs
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';

export class VehicleCompatibilityResponseDto {
  @ApiProperty()
  brand: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  yearFrom: number;

  @ApiProperty()
  yearTo: number;

  @ApiProperty({ required: false })
  engine?: string;
}

export class StockResponseDto {
  @ApiProperty({ description: 'Quantité totale' })
  quantity: number;

  @ApiProperty({ description: 'Quantité réservée' })
  reserved: number;

  @ApiProperty({ description: 'Quantité disponible' })
  available: number;
}

export class PartResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  supplierId: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  brand: string;

  @ApiProperty({ description: 'Prix en euros' })
  price: number;

  @ApiProperty({ description: 'Prix formaté' })
  priceFormatted: string;

  @ApiProperty({ type: StockResponseDto })
  stock: StockResponseDto;

  @ApiProperty({ type: [VehicleCompatibilityResponseDto] })
  compatibleVehicles: VehicleCompatibilityResponseDto[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedPartsResponseDto {
  @ApiProperty({ type: [PartResponseDto] })
  data: PartResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
