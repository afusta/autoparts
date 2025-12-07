// =============================================================================
// Neo4j Projection Service
// =============================================================================
// Service pour créer et maintenir le graphe de relations dans Neo4j
//
// Modèle de graphe:
// (:User {role: 'SUPPLIER'}) -[:SUPPLIES]-> (:Part) <-[:ORDERED]- (:User {role: 'GARAGE'})
//                               ↓
//                        [:COMPATIBLE_WITH]
//                               ↓
//                          (:Vehicle)
//
// Requêtes analytiques possibles:
// - Quels garages commandent chez quels fournisseurs ?
// - Quelles pièces sont souvent commandées ensemble ?
// - Quels véhicules ont le plus de pièces compatibles ?
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '@infrastructure/neo4j';

@Injectable()
export class Neo4jProjectionService {
  private readonly logger = new Logger(Neo4jProjectionService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  // ===========================================================================
  // User Nodes
  // ===========================================================================

  async createUserNode(data: {
    userId: string;
    email: string;
    companyName: string;
    role: string;
  }): Promise<void> {
    await this.neo4j.write(
      `
      MERGE (u:User {id: $userId})
      ON CREATE SET
        u.email = $email,
        u.companyName = $companyName,
        u.role = $role,
        u.createdAt = datetime()
      ON MATCH SET
        u.email = $email,
        u.companyName = $companyName,
        u.role = $role
      `,
      {
        userId: data.userId,
        email: data.email,
        companyName: data.companyName,
        role: data.role,
      },
    );

    // Créer un label supplémentaire basé sur le rôle
    const roleLabel = data.role.charAt(0) + data.role.slice(1).toLowerCase();
    await this.neo4j.write(
      `
      MATCH (u:User {id: $userId})
      SET u:${roleLabel}
      `,
      { userId: data.userId },
    );

    this.logger.log(`User node created in Neo4j: ${data.userId}`);
  }

  // ===========================================================================
  // Part Nodes & Relationships
  // ===========================================================================

  async createPartNode(data: {
    partId: string;
    supplierId: string;
    reference: string;
    name: string;
    category: string;
    brand: string;
    priceInCents: number;
    compatibleVehicles: Array<{
      brand: string;
      model: string;
      yearFrom: number;
      yearTo: number;
      engine?: string;
    }>;
  }): Promise<void> {
    // Créer le nœud Part
    await this.neo4j.write(
      `
      MERGE (p:Part {id: $partId})
      ON CREATE SET
        p.reference = $reference,
        p.name = $name,
        p.category = $category,
        p.brand = $brand,
        p.priceInCents = $priceInCents,
        p.createdAt = datetime()
      `,
      {
        partId: data.partId,
        reference: data.reference,
        name: data.name,
        category: data.category,
        brand: data.brand,
        priceInCents: data.priceInCents,
      },
    );

    // Créer la relation SUPPLIES depuis le fournisseur
    await this.neo4j.write(
      `
      MATCH (s:User {id: $supplierId})
      MATCH (p:Part {id: $partId})
      MERGE (s)-[r:SUPPLIES]->(p)
      ON CREATE SET r.createdAt = datetime()
      `,
      {
        supplierId: data.supplierId,
        partId: data.partId,
      },
    );

    // Créer les nœuds Vehicle et relations COMPATIBLE_WITH
    for (const vehicle of data.compatibleVehicles) {
      const vehicleId = `${vehicle.brand}-${vehicle.model}`.toLowerCase().replace(/\s+/g, '-');

      await this.neo4j.write(
        `
        MERGE (v:Vehicle {id: $vehicleId})
        ON CREATE SET
          v.brand = $brand,
          v.model = $model
        `,
        {
          vehicleId,
          brand: vehicle.brand,
          model: vehicle.model,
        },
      );

      await this.neo4j.write(
        `
        MATCH (p:Part {id: $partId})
        MATCH (v:Vehicle {id: $vehicleId})
        MERGE (p)-[r:COMPATIBLE_WITH]->(v)
        ON CREATE SET
          r.yearFrom = $yearFrom,
          r.yearTo = $yearTo,
          r.engine = $engine
        `,
        {
          partId: data.partId,
          vehicleId,
          yearFrom: vehicle.yearFrom,
          yearTo: vehicle.yearTo,
          engine: vehicle.engine || null,
        },
      );
    }

    this.logger.log(`Part node created in Neo4j with ${data.compatibleVehicles.length} vehicle relations: ${data.partId}`);
  }

  async updatePartNode(
    partId: string,
    changes: {
      name?: string;
      category?: string;
      brand?: string;
      priceInCents?: number;
      isActive?: boolean;
    },
  ): Promise<void> {
    const setClauses: string[] = [];
    const params: Record<string, unknown> = { partId };

    if (changes.name !== undefined) {
      setClauses.push('p.name = $name');
      params.name = changes.name;
    }
    if (changes.category !== undefined) {
      setClauses.push('p.category = $category');
      params.category = changes.category;
    }
    if (changes.brand !== undefined) {
      setClauses.push('p.brand = $brand');
      params.brand = changes.brand;
    }
    if (changes.priceInCents !== undefined) {
      setClauses.push('p.priceInCents = $priceInCents');
      params.priceInCents = changes.priceInCents;
    }
    if (changes.isActive !== undefined) {
      setClauses.push('p.isActive = $isActive');
      params.isActive = changes.isActive;
    }

    if (setClauses.length > 0) {
      await this.neo4j.write(
        `
        MATCH (p:Part {id: $partId})
        SET ${setClauses.join(', ')}
        `,
        params,
      );
      this.logger.log(`Part node updated in Neo4j: ${partId}`);
    }
  }

  // ===========================================================================
  // Order Relationships
  // ===========================================================================

  async createOrderRelationships(data: {
    orderId: string;
    garageId: string;
    lines: Array<{
      partId: string;
      supplierId: string;
      quantity: number;
      totalInCents: number;
    }>;
    totalInCents: number;
    createdAt: Date;
  }): Promise<void> {
    // Créer le nœud Order
    await this.neo4j.write(
      `
      MERGE (o:Order {id: $orderId})
      ON CREATE SET
        o.totalInCents = $totalInCents,
        o.createdAt = datetime($createdAt)
      `,
      {
        orderId: data.orderId,
        totalInCents: data.totalInCents,
        createdAt: data.createdAt.toISOString(),
      },
    );

    // Relier le garage à la commande
    await this.neo4j.write(
      `
      MATCH (g:User {id: $garageId})
      MATCH (o:Order {id: $orderId})
      MERGE (g)-[r:PLACED]->(o)
      ON CREATE SET r.createdAt = datetime()
      `,
      {
        garageId: data.garageId,
        orderId: data.orderId,
      },
    );

    // Créer les relations CONTAINS vers les pièces
    for (const line of data.lines) {
      await this.neo4j.write(
        `
        MATCH (o:Order {id: $orderId})
        MATCH (p:Part {id: $partId})
        MERGE (o)-[r:CONTAINS]->(p)
        ON CREATE SET
          r.quantity = $quantity,
          r.totalInCents = $totalInCents
        `,
        {
          orderId: data.orderId,
          partId: line.partId,
          quantity: line.quantity,
          totalInCents: line.totalInCents,
        },
      );

      // Créer/mettre à jour la relation ORDERED_FROM entre garage et supplier
      await this.neo4j.write(
        `
        MATCH (g:User {id: $garageId})
        MATCH (s:User {id: $supplierId})
        MERGE (g)-[r:ORDERED_FROM]->(s)
        ON CREATE SET
          r.orderCount = 1,
          r.totalSpentInCents = $totalInCents,
          r.firstOrderAt = datetime(),
          r.lastOrderAt = datetime()
        ON MATCH SET
          r.orderCount = r.orderCount + 1,
          r.totalSpentInCents = r.totalSpentInCents + $totalInCents,
          r.lastOrderAt = datetime()
        `,
        {
          garageId: data.garageId,
          supplierId: line.supplierId,
          totalInCents: line.totalInCents,
        },
      );
    }

    this.logger.log(`Order relationships created in Neo4j: ${data.orderId}`);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await this.neo4j.write(
      `
      MATCH (o:Order {id: $orderId})
      SET o.status = $status, o.updatedAt = datetime()
      `,
      { orderId, status },
    );
    this.logger.log(`Order status updated in Neo4j: ${orderId} → ${status}`);
  }

  // ===========================================================================
  // Analytics Queries
  // ===========================================================================

  /**
   * Trouve les pièces souvent commandées ensemble (pour recommandations)
   */
  async findFrequentlyOrderedTogether(partId: string, limit = 5): Promise<Array<{ partId: string; count: number }>> {
    const result = await this.neo4j.read(
      `
      MATCH (p1:Part {id: $partId})<-[:CONTAINS]-(o:Order)-[:CONTAINS]->(p2:Part)
      WHERE p1 <> p2
      RETURN p2.id as partId, count(o) as count
      ORDER BY count DESC
      LIMIT $limit
      `,
      { partId, limit },
    );

    return result.map((record) => ({
      partId: record.partId as string,
      count: (record.count as { toNumber: () => number }).toNumber(),
    }));
  }

  /**
   * Trouve les top fournisseurs pour un garage
   */
  async findTopSuppliersForGarage(garageId: string, limit = 10): Promise<
    Array<{
      supplierId: string;
      companyName: string;
      orderCount: number;
      totalSpent: number;
    }>
  > {
    const result = await this.neo4j.read(
      `
      MATCH (g:User {id: $garageId})-[r:ORDERED_FROM]->(s:User)
      RETURN
        s.id as supplierId,
        s.companyName as companyName,
        r.orderCount as orderCount,
        r.totalSpentInCents as totalSpent
      ORDER BY r.totalSpentInCents DESC
      LIMIT $limit
      `,
      { garageId, limit },
    );

    return result.map((record) => ({
      supplierId: record.supplierId as string,
      companyName: record.companyName as string,
      orderCount: (record.orderCount as { toNumber: () => number }).toNumber(),
      totalSpent: (record.totalSpent as { toNumber: () => number }).toNumber() / 100,
    }));
  }

  /**
   * Trouve les pièces compatibles avec un véhicule
   */
  async findPartsForVehicle(
    brand: string,
    model: string,
    year: number,
  ): Promise<Array<{ partId: string; name: string; category: string }>> {
    const vehicleId = `${brand}-${model}`.toLowerCase().replace(/\s+/g, '-');

    const result = await this.neo4j.read(
      `
      MATCH (p:Part)-[r:COMPATIBLE_WITH]->(v:Vehicle {id: $vehicleId})
      WHERE r.yearFrom <= $year AND r.yearTo >= $year
      RETURN p.id as partId, p.name as name, p.category as category
      ORDER BY p.category, p.name
      `,
      { vehicleId, year },
    );

    return result.map((record) => ({
      partId: record.partId as string,
      name: record.name as string,
      category: record.category as string,
    }));
  }

  /**
   * Statistiques globales du graphe
   */
  async getGraphStats(): Promise<{
    users: number;
    parts: number;
    orders: number;
    vehicles: number;
  }> {
    const result = await this.neo4j.read(`
      MATCH (u:User) WITH count(u) as users
      MATCH (p:Part) WITH users, count(p) as parts
      MATCH (o:Order) WITH users, parts, count(o) as orders
      MATCH (v:Vehicle) WITH users, parts, orders, count(v) as vehicles
      RETURN users, parts, orders, vehicles
    `);

    if (result.length === 0) {
      return { users: 0, parts: 0, orders: 0, vehicles: 0 };
    }

    const record = result[0];
    return {
      users: (record.users as { toNumber: () => number }).toNumber(),
      parts: (record.parts as { toNumber: () => number }).toNumber(),
      orders: (record.orders as { toNumber: () => number }).toNumber(),
      vehicles: (record.vehicles as { toNumber: () => number }).toNumber(),
    };
  }
}
