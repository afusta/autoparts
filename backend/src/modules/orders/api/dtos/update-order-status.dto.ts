// =============================================================================
// Update Order Status DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({
    description: "Raison de l'annulation",
    example: 'Pièce plus disponible',
  })
  @IsString()
  @MinLength(5, { message: 'Reason must be at least 5 characters' })
  reason: string;
}
