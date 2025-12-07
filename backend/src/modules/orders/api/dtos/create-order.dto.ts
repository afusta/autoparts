// =============================================================================
// Create Order DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsUUID,
  Min,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLineDto {
  @ApiProperty({ description: 'ID de la pièce' })
  @IsUUID()
  partId: string;

  @ApiProperty({ description: 'Quantité', example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Lignes de commande',
    type: [OrderLineDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Order must have at least one line' })
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];

  @ApiProperty({ description: 'Notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
