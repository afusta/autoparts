// =============================================================================
// Login DTO
// =============================================================================
// Data Transfer Object pour la connexion
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'contact@garage-martin.fr',
  })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'Password123',
  })
  @IsString()
  @MinLength(1, { message: 'Le mot de passe est requis' })
  password: string;
}
