// =============================================================================
// Part ORM Entity
// =============================================================================
// Entity TypeORM pour PostgreSQL
// =============================================================================

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('parts')
@Index(['supplierId', 'reference'], { unique: true })
export class PartOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  @Index()
  supplierId: string;

  @Column()
  @Index()
  reference: string;

  @Column()
  @Index()
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column()
  @Index()
  category: string;

  @Column()
  @Index()
  brand: string;

  @Column({ name: 'price_in_cents', type: 'integer' })
  priceInCents: number;

  @Column({ default: 'EUR' })
  currency: string;

  @Column({ name: 'stock_quantity', type: 'integer', default: 0 })
  stockQuantity: number;

  @Column({ name: 'stock_reserved', type: 'integer', default: 0 })
  stockReserved: number;

  @Column({ name: 'compatible_vehicles', type: 'jsonb', default: '[]' })
  compatibleVehicles: Array<{
    brand: string;
    model: string;
    yearFrom: number;
    yearTo: number;
    engine?: string;
  }>;

  @Column({ name: 'is_active', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
