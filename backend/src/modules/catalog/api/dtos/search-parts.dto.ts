// =============================================================================
// Search Parts DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchPartsDto {
  @ApiProperty({ required: false, description: 'Recherche textuelle' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false, description: 'Filtrer par catégorie' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, description: 'Filtrer par marque' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ required: false, description: 'Marque du véhicule' })
  @IsString()
  @IsOptional()
  vehicleBrand?: string;

  @ApiProperty({ required: false, description: 'Modèle du véhicule' })
  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @ApiProperty({ required: false, description: 'Année du véhicule' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  vehicleYear?: number;

  @ApiProperty({ required: false, description: 'Prix minimum' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @Min(0)
  minPrice?: number;

  @ApiProperty({ required: false, description: 'Prix maximum' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  maxPrice?: number;

  @ApiProperty({ required: false, description: 'Uniquement en stock' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  inStock?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 20)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
