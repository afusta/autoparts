// =============================================================================
// Order ORM Entity
// =============================================================================

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('orders')
export class OrderOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'garage_id', type: 'uuid' })
  @Index()
  garageId: string;

  @Column({ name: 'garage_name' })
  garageName: string;

  @Column({ type: 'jsonb' })
  lines: Array<{
    partId: string;
    partName: string;
    partReference: string;
    supplierId: string;
    quantity: number;
    unitPriceInCents: number;
    currency: string;
  }>;

  @Column()
  @Index()
  status: string;

  @Column({ name: 'total_in_cents', type: 'integer' })
  totalInCents: number;

  @Column({ default: 'EUR' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
