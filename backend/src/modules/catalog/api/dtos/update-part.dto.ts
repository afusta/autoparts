// =============================================================================
// Update Part DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, MinLength, Min, IsOptional } from 'class-validator';

export class UpdatePartDto {
  @ApiProperty({ required: false, example: "Filtre à huile BOSCH P7124 Premium" })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, example: 14.99 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  price?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  brand?: string;
}

export class UpdateStockDto {
  @ApiProperty({
    description: 'Quantité à ajouter au stock',
    example: 25,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
}
