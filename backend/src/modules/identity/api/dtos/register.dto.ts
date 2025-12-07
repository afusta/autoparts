// =============================================================================
// Register DTO
// =============================================================================
// Data Transfer Object pour l'inscription
// Utilise class-validator pour la validation automatique
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRoleEnum } from '../../domain/value-objects';

export class RegisterDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'contact@garage-martin.fr',
  })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({
    description:
      'Mot de passe (min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre)',
    example: 'Password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  password: string;

  @ApiProperty({
    description: "Nom de l'entreprise",
    example: 'Garage Martin SARL',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, {
    message: "Le nom de l'entreprise doit faire au moins 2 caractères",
  })
  companyName: string;

  @ApiProperty({
    description: "Rôle de l'utilisateur",
    enum: [UserRoleEnum.GARAGE, UserRoleEnum.SUPPLIER],
    example: UserRoleEnum.GARAGE,
  })
  @IsEnum([UserRoleEnum.GARAGE, UserRoleEnum.SUPPLIER], {
    message: 'Le rôle doit être GARAGE ou SUPPLIER',
  })
  role: UserRoleEnum;
}
