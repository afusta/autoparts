// =============================================================================
// Order Repository Implementation
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult, PaginationOptions } from '@shared/ddd';
import { Order } from '../../domain/entities/order.entity';
import { OrderStatusEnum } from '../../domain/value-objects';
import {
  IOrderRepository,
  OrderSearchCriteria,
} from '../../domain/repositories/order.repository.interface';
import { OrderOrmEntity } from './order.orm-entity';

@Injectable()
export class OrderRepository implements IOrderRepository {
  private readonly logger = new Logger(OrderRepository.name);

  constructor(
    @InjectRepository(OrderOrmEntity)
    private readonly ormRepository: Repository<OrderOrmEntity>,
  ) {}

  async findById(id: string): Promise<Order | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByGarage(
    garageId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Order>> {
    const [entities, total] = await this.ormRepository.findAndCount({
      where: { garageId },
      order: { createdAt: 'DESC' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    return {
      data: entities.map((e) => this.toDomain(e)),
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async findBySupplier(
    supplierId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Order>> {
    // Recherche dans le JSONB pour trouver les commandes avec ce fournisseur
    const qb = this.ormRepository.createQueryBuilder('order');

    qb.where(
      `EXISTS (
        SELECT 1 FROM jsonb_array_elements(order.lines) AS line
        WHERE line->>'supplierId' = :supplierId
      )`,
      { supplierId },
    );

    qb.orderBy('order.created_at', 'DESC');
    qb.skip((options.page - 1) * options.limit);
    qb.take(options.limit);

    const [entities, total] = await qb.getManyAndCount();

    return {
      data: entities.map((e) => this.toDomain(e)),
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async search(
    criteria: OrderSearchCriteria,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Order>> {
    const qb = this.ormRepository.createQueryBuilder('order');

    if (criteria.garageId) {
      qb.andWhere('order.garage_id = :garageId', {
        garageId: criteria.garageId,
      });
    }

    if (criteria.supplierId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements(order.lines) AS line
          WHERE line->>'supplierId' = :supplierId
        )`,
        { supplierId: criteria.supplierId },
      );
    }

    if (criteria.status) {
      qb.andWhere('order.status = :status', { status: criteria.status });
    }

    if (criteria.fromDate) {
      qb.andWhere('order.created_at >= :fromDate', {
        fromDate: criteria.fromDate,
      });
    }

    if (criteria.toDate) {
      qb.andWhere('order.created_at <= :toDate', { toDate: criteria.toDate });
    }

    qb.orderBy('order.created_at', 'DESC');
    qb.skip((options.page - 1) * options.limit);
    qb.take(options.limit);

    const [entities, total] = await qb.getManyAndCount();

    return {
      data: entities.map((e) => this.toDomain(e)),
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async countByStatusForGarage(
    garageId: string,
  ): Promise<Record<OrderStatusEnum, number>> {
    const result = await this.ormRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.garage_id = :garageId', { garageId })
      .groupBy('order.status')
      .getRawMany();

    return this.buildStatusCounts(result);
  }

  async countByStatusForSupplier(
    supplierId: string,
  ): Promise<Record<OrderStatusEnum, number>> {
    const result = await this.ormRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements(order.lines) AS line
          WHERE line->>'supplierId' = :supplierId
        )`,
        { supplierId },
      )
      .groupBy('order.status')
      .getRawMany();

    return this.buildStatusCounts(result);
  }

  private buildStatusCounts(
    result: Array<{ status: string; count: string }>,
  ): Record<OrderStatusEnum, number> {
    const counts: Record<OrderStatusEnum, number> = {
      [OrderStatusEnum.PENDING]: 0,
      [OrderStatusEnum.CONFIRMED]: 0,
      [OrderStatusEnum.SHIPPED]: 0,
      [OrderStatusEnum.DELIVERED]: 0,
      [OrderStatusEnum.CANCELLED]: 0,
    };

    for (const row of result) {
      counts[row.status as OrderStatusEnum] = parseInt(row.count, 10);
    }

    return counts;
  }

  async save(order: Order): Promise<Order> {
    const entity = this.toOrmEntity(order);
    await this.ormRepository.save(entity);
    this.logger.debug(`Order saved: ${order.id}`);
    return order;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.ormRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { id } });
    return count > 0;
  }

  // ===========================================================================
  // Mapping
  // ===========================================================================

  private toDomain(entity: OrderOrmEntity): Order {
    return Order.fromPersistence(entity.id, {
      garageId: entity.garageId,
      garageName: entity.garageName,
      lines: entity.lines,
      status: entity.status,
      notes: entity.notes ?? undefined,
      cancelReason: entity.cancelReason ?? undefined,
    });
  }

  private toOrmEntity(order: Order): OrderOrmEntity {
    const entity = new OrderOrmEntity();
    entity.id = order.id;
    entity.garageId = order.garageId;
    entity.garageName = order.garageName;
    entity.lines = order.lines.map((l) => ({
      partId: l.partId,
      partName: l.partName,
      partReference: l.partReference,
      supplierId: l.supplierId,
      quantity: l.quantity,
      unitPriceInCents: l.unitPriceInCents,
      currency: l.currency,
    }));
    entity.status = order.status.value;
    entity.totalInCents = order.totalInCents;
    entity.currency = order.currency;
    entity.notes = order.notes ?? null;
    entity.cancelReason = order.cancelReason ?? null;
    return entity;
  }
}
