// =============================================================================
// Part Repository Implementation
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { PaginatedResult, PaginationOptions } from '@shared/ddd';
import { Part } from '../../domain/entities/part.entity';
import {
  IPartRepository,
  PartSearchCriteria,
} from '../../domain/repositories/part.repository.interface';
import { PartOrmEntity } from './part.orm-entity';

@Injectable()
export class PartRepository implements IPartRepository {
  private readonly logger = new Logger(PartRepository.name);

  constructor(
    @InjectRepository(PartOrmEntity)
    private readonly ormRepository: Repository<PartOrmEntity>,
  ) {}

  async findById(id: string): Promise<Part | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findBySupplier(
    supplierId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Part>> {
    const [entities, total] = await this.ormRepository.findAndCount({
      where: { supplierId },
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

  async findByReference(supplierId: string, reference: string): Promise<Part | null> {
    const entity = await this.ormRepository.findOne({
      where: { supplierId, reference: reference.toUpperCase() },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async referenceExists(supplierId: string, reference: string): Promise<boolean> {
    const count = await this.ormRepository.count({
      where: { supplierId, reference: reference.toUpperCase() },
    });
    return count > 0;
  }

  async search(
    criteria: PartSearchCriteria,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Part>> {
    const qb = this.ormRepository.createQueryBuilder('part');

    // Filtres de base
    qb.where('part.is_active = :isActive', {
      isActive: criteria.isActive ?? true,
    });

    if (criteria.supplierId) {
      qb.andWhere('part.supplier_id = :supplierId', {
        supplierId: criteria.supplierId,
      });
    }

    if (criteria.category) {
      qb.andWhere('part.category ILIKE :category', {
        category: `%${criteria.category}%`,
      });
    }

    if (criteria.brand) {
      qb.andWhere('part.brand ILIKE :brand', {
        brand: `%${criteria.brand}%`,
      });
    }

    if (criteria.search) {
      qb.andWhere(
        '(part.name ILIKE :search OR part.description ILIKE :search OR part.reference ILIKE :search)',
        { search: `%${criteria.search}%` },
      );
    }

    if (criteria.minPrice !== undefined) {
      qb.andWhere('part.price_in_cents >= :minPrice', {
        minPrice: criteria.minPrice * 100,
      });
    }

    if (criteria.maxPrice !== undefined) {
      qb.andWhere('part.price_in_cents <= :maxPrice', {
        maxPrice: criteria.maxPrice * 100,
      });
    }

    if (criteria.inStock) {
      qb.andWhere('(part.stock_quantity - part.stock_reserved) > 0');
    }

    // Filtrer par compatibilité véhicule (recherche dans JSONB)
    if (criteria.vehicleBrand || criteria.vehicleModel || criteria.vehicleYear) {
      // Recherche dans le tableau JSON
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements(part.compatible_vehicles) AS cv
          WHERE
            (:vehicleBrand IS NULL OR cv->>'brand' ILIKE :vehicleBrand)
            AND (:vehicleModel IS NULL OR cv->>'model' ILIKE :vehicleModel)
            AND (:vehicleYear IS NULL OR (
              (cv->>'yearFrom')::int <= :vehicleYear
              AND (cv->>'yearTo')::int >= :vehicleYear
            ))
        )`,
        {
          vehicleBrand: criteria.vehicleBrand ? `%${criteria.vehicleBrand}%` : null,
          vehicleModel: criteria.vehicleModel ? `%${criteria.vehicleModel}%` : null,
          vehicleYear: criteria.vehicleYear ?? null,
        },
      );
    }

    // Pagination
    qb.orderBy('part.created_at', 'DESC');
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

  async findByVehicle(
    vehicleBrand: string,
    vehicleModel: string,
    vehicleYear: number,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Part>> {
    return this.search(
      {
        vehicleBrand,
        vehicleModel,
        vehicleYear,
        isActive: true,
        inStock: true,
      },
      options,
    );
  }

  async save(part: Part): Promise<Part> {
    const entity = this.toOrmEntity(part);
    await this.ormRepository.save(entity);
    this.logger.debug(`Part saved: ${part.id}`);
    return part;
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

  private toDomain(entity: PartOrmEntity): Part {
    return Part.fromPersistence(entity.id, {
      supplierId: entity.supplierId,
      reference: entity.reference,
      name: entity.name,
      description: entity.description,
      category: entity.category,
      brand: entity.brand,
      priceInCents: entity.priceInCents,
      currency: entity.currency,
      stockQuantity: entity.stockQuantity,
      stockReserved: entity.stockReserved,
      compatibleVehicles: entity.compatibleVehicles,
      isActive: entity.isActive,
    });
  }

  private toOrmEntity(part: Part): PartOrmEntity {
    const entity = new PartOrmEntity();
    entity.id = part.id;
    entity.supplierId = part.supplierId;
    entity.reference = part.reference.value;
    entity.name = part.name;
    entity.description = part.description;
    entity.category = part.category;
    entity.brand = part.brand;
    entity.priceInCents = part.price.amount;
    entity.currency = part.price.currency;
    entity.stockQuantity = part.stock.quantity;
    entity.stockReserved = part.stock.reserved;
    entity.compatibleVehicles = part.compatibleVehicles.map((v) => ({
      brand: v.brand,
      model: v.model,
      yearFrom: v.yearFrom,
      yearTo: v.yearTo,
      engine: v.engine,
    }));
    entity.isActive = part.isActive;
    return entity;
  }
}
