// =============================================================================
// RegisterUser Command
// =============================================================================
// Command CQRS pour l'inscription d'un utilisateur
//
// Une Command représente une intention de modifier l'état du système.
// Elle est immutable et contient toutes les données nécessaires.
//
// Flow:
// Controller → CommandBus.execute(command) → CommandHandler → Repository
// =============================================================================

import { UserRoleEnum } from '../../domain/value-objects';

export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly companyName: string,
    public readonly role: UserRoleEnum,
  ) {}
}
