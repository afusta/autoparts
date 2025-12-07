// =============================================================================
// Order Response DTOs
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { OrderStatusEnum } from '../../domain/value-objects';

export class OrderLineResponseDto {
  @ApiProperty()
  partId: string;

  @ApiProperty()
  partName: string;

  @ApiProperty()
  partReference: string;

  @ApiProperty()
  supplierId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ description: 'Prix unitaire en euros' })
  unitPrice: number;

  @ApiProperty({ description: 'Total de la ligne en euros' })
  total: number;

  @ApiProperty()
  totalFormatted: string;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  garageId: string;

  @ApiProperty()
  garageName: string;

  @ApiProperty({ type: [OrderLineResponseDto] })
  lines: OrderLineResponseDto[];

  @ApiProperty({ enum: OrderStatusEnum })
  status: string;

  @ApiProperty({ description: 'Total en euros' })
  total: number;

  @ApiProperty()
  totalFormatted: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  cancelReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  data: OrderResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class OrderStatsDto {
  @ApiProperty()
  pending: number;

  @ApiProperty()
  confirmed: number;

  @ApiProperty()
  shipped: number;

  @ApiProperty()
  delivered: number;

  @ApiProperty()
  cancelled: number;
}
