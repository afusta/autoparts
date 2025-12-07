// =============================================================================
// Auth Response DTOs
// =============================================================================
// DTOs pour les réponses d'authentification
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'contact@garage-martin.fr' })
  email: string;

  @ApiProperty({ example: 'Garage Martin SARL' })
  companyName: string;

  @ApiProperty({ example: 'GARAGE', enum: ['GARAGE', 'SUPPLIER', 'ADMIN'] })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', required: false })
  lastLoginAt?: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: "Informations de l'utilisateur",
    type: UserResponseDto,
  })
  user: UserResponseDto;
}

export class RegisterResponseDto {
  @ApiProperty({ example: 'User registered successfully' })
  message: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
