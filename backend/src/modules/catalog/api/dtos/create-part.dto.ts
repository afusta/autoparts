// =============================================================================
// Create Part DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  MinLength,
  Min,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VehicleCompatibilityDto {
  @ApiProperty({ example: 'Renault' })
  @IsString()
  brand: string;

  @ApiProperty({ example: 'Clio' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2015 })
  @IsNumber()
  @Min(1900)
  yearFrom: number;

  @ApiProperty({ example: 2023 })
  @IsNumber()
  @Min(1900)
  yearTo: number;

  @ApiProperty({ example: '1.5 dCi', required: false })
  @IsString()
  @IsOptional()
  engine?: string;
}

export class CreatePartDto {
  @ApiProperty({
    description: 'Référence unique de la pièce',
    example: 'BOSCH-FLT-12345',
  })
  @IsString()
  @MinLength(3)
  reference: string;

  @ApiProperty({
    description: 'Nom de la pièce',
    example: "Filtre à huile BOSCH P7124",
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Description détaillée',
    example: 'Filtre à huile haute performance pour moteurs diesel',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Catégorie de la pièce',
    example: 'Filtration',
  })
  @IsString()
  @MinLength(2)
  category: string;

  @ApiProperty({
    description: 'Marque du fabricant',
    example: 'BOSCH',
  })
  @IsString()
  @MinLength(2)
  brand: string;

  @ApiProperty({
    description: 'Prix en euros',
    example: 12.99,
  })
  @IsNumber()
  @Min(0.01)
  price: number;

  @ApiProperty({
    description: 'Quantité en stock initial',
    example: 50,
  })
  @IsNumber()
  @Min(0)
  initialStock: number;

  @ApiProperty({
    description: 'Véhicules compatibles',
    type: [VehicleCompatibilityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VehicleCompatibilityDto)
  compatibleVehicles: VehicleCompatibilityDto[];
}
