// =============================================================================
// User Repository Implementation
// =============================================================================
// Implémentation concrète du IUserRepository avec TypeORM
//
// Responsabilités:
// - Convertir User (Domain) ↔ UserOrmEntity (Persistence)
// - Exécuter les requêtes SQL
// - Gérer les transactions si nécessaire
//
// Le repository isole complètement le domaine de l'infrastructure.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserOrmEntity } from './user.orm-entity';

@Injectable()
export class UserRepository implements IUserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly ormRepository: Repository<UserOrmEntity>,
  ) {}

  /**
   * Trouve un utilisateur par son ID
   */
  async findById(id: string): Promise<User | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  /**
   * Trouve un utilisateur par son email
   */
  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.ormRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  /**
   * Vérifie si un email existe déjà
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.ormRepository.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  /**
   * Persiste un utilisateur (création ou mise à jour)
   */
  async save(user: User): Promise<User> {
    const entity = this.toOrmEntity(user);

    await this.ormRepository.save(entity);

    this.logger.debug(`User saved: ${user.id}`);

    return user;
  }

  /**
   * Supprime un utilisateur
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.ormRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Vérifie si un utilisateur existe
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { id } });
    return count > 0;
  }

  // ===========================================================================
  // Private: Mapping methods
  // ===========================================================================

  /**
   * Convertit une ORM Entity en Domain Entity
   */
  private toDomain(entity: UserOrmEntity): User {
    return User.fromPersistence(entity.id, {
      email: entity.email,
      passwordHash: entity.passwordHash,
      role: entity.role,
      companyName: entity.companyName,
      isActive: entity.isActive,
      lastLoginAt: entity.lastLoginAt ?? undefined,
    });
  }

  /**
   * Convertit une Domain Entity en ORM Entity
   */
  private toOrmEntity(user: User): UserOrmEntity {
    const entity = new UserOrmEntity();
    entity.id = user.id;
    entity.email = user.email.value;
    entity.passwordHash = user.password.value;
    entity.role = user.role.value;
    entity.companyName = user.companyName;
    entity.isActive = user.isActive;
    entity.lastLoginAt = user.lastLoginAt ?? null;
    return entity;
  }
}
