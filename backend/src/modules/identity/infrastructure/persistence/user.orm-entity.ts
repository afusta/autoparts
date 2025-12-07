// =============================================================================
// User ORM Entity
// =============================================================================
// Entity TypeORM pour la persistance PostgreSQL
//
// Cette entité est distincte de l'Aggregate User du domaine:
// - ORM Entity: représentation en base de données
// - Domain Entity: logique métier
//
// Le Repository fait la conversion entre les deux.
// =============================================================================

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column()
  role: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
