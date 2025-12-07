// =============================================================================
// User Aggregate Root
// =============================================================================
// L'Aggregate Root User est le point d'entrée pour toutes les opérations
// liées à l'identité d'un utilisateur.
//
// Responsabilités:
// - Gestion des données utilisateur (email, password, role)
// - Validation des règles métier
// - Publication des Domain Events
//
// Règles métier:
// - L'email doit être unique (vérifié par le repository)
// - Le mot de passe doit respecter les règles de sécurité
// - Un utilisateur peut être activé/désactivé
// =============================================================================

import { AggregateRoot } from '@shared/ddd';
import { Email, Password, UserRole, UserRoleEnum } from '../value-objects';
import { UserRegisteredEvent } from '../events';

interface UserProps {
  email: Email;
  password: Password;
  role: UserRole;
  companyName: string;
  isActive: boolean;
  lastLoginAt?: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRoleEnum;
  companyName: string;
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: string) {
    super(props, id);
  }

  // ===========================================================================
  // Getters (lecture seule)
  // ===========================================================================

  get email(): Email {
    return this.props.email;
  }

  get password(): Password {
    return this.props.password;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get companyName(): string {
    return this.props.companyName;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  /**
   * Crée un nouvel utilisateur
   * Factory method qui encapsule la logique de création
   */
  static async create(input: CreateUserInput): Promise<User> {
    // Créer les Value Objects (validation automatique)
    const email = Email.create(input.email);
    const password = await Password.create(input.password);
    const role = UserRole.fromString(input.role);

    // Valider le nom de l'entreprise
    if (!input.companyName || input.companyName.trim().length < 2) {
      throw new Error('Company name must be at least 2 characters');
    }

    // Créer l'aggregate
    const user = new User({
      email,
      password,
      role,
      companyName: input.companyName.trim(),
      isActive: true,
    });

    // Ajouter le Domain Event
    user.addDomainEvent(
      new UserRegisteredEvent({
        userId: user.id,
        email: email.value,
        companyName: input.companyName,
        role: role.value,
        registeredAt: new Date(),
      }),
    );

    return user;
  }

  /**
   * Reconstruit un User depuis la base de données
   * Utilisé par le repository pour hydrater l'aggregate
   */
  static fromPersistence(
    id: string,
    data: {
      email: string;
      passwordHash: string;
      role: string;
      companyName: string;
      isActive: boolean;
      lastLoginAt?: Date;
    },
  ): User {
    return new User(
      {
        email: Email.fromPersistence(data.email),
        password: Password.fromPersistence(data.passwordHash),
        role: UserRole.fromPersistence(data.role),
        companyName: data.companyName,
        isActive: data.isActive,
        lastLoginAt: data.lastLoginAt,
      },
      id,
    );
  }

  // ===========================================================================
  // Behavior Methods (modifications)
  // ===========================================================================

  /**
   * Vérifie si le mot de passe fourni est correct
   */
  async validatePassword(plainPassword: string): Promise<boolean> {
    return this.props.password.compare(plainPassword);
  }

  /**
   * Met à jour la date de dernière connexion
   */
  recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.markAsUpdated();
  }

  /**
   * Désactive le compte utilisateur
   */
  deactivate(): void {
    if (!this.props.isActive) {
      throw new Error('User is already deactivated');
    }
    this.props.isActive = false;
    this.markAsUpdated();
  }

  /**
   * Réactive le compte utilisateur
   */
  activate(): void {
    if (this.props.isActive) {
      throw new Error('User is already active');
    }
    this.props.isActive = true;
    this.markAsUpdated();
  }

  /**
   * Change le mot de passe
   */
  async changePassword(newPassword: string): Promise<void> {
    this.props.password = await Password.create(newPassword);
    this.markAsUpdated();
  }

  /**
   * Met à jour le nom de l'entreprise
   */
  updateCompanyName(companyName: string): void {
    if (!companyName || companyName.trim().length < 2) {
      throw new Error('Company name must be at least 2 characters');
    }
    this.props.companyName = companyName.trim();
    this.markAsUpdated();
  }
}
