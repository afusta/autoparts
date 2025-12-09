// =============================================================================
// GetMyTopSuppliers Query Handler (Analytics)
// =============================================================================

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { int } from 'neo4j-driver';
import { GetMyTopSuppliersQuery } from '../../queries/get-my-top-suppliers.query';
import { TopSupplierResult } from '../../queries/types';
import { Neo4jService } from '@infrastructure/neo4j';

@QueryHandler(GetMyTopSuppliersQuery)
export class GetMyTopSuppliersHandler implements IQueryHandler<GetMyTopSuppliersQuery> {
  private readonly logger = new Logger(GetMyTopSuppliersHandler.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async execute(query: GetMyTopSuppliersQuery): Promise<TopSupplierResult[]> {
    this.logger.debug(`Getting top suppliers for garage: ${query.garageId}`);

    try {
      const result = await this.neo4j.read(
        `
        MATCH (g:Garage {id: $garageId})-[r:ORDERED_FROM]->(s:Supplier)
        RETURN
          s.id as supplierId,
          s.companyName as companyName,
          r.orderCount as orderCount,
          r.totalSpentInCents as totalSpent
        ORDER BY r.totalSpentInCents DESC
        LIMIT $limit
        `,
        { garageId: query.garageId, limit: int(query.limit) },
      );

      return (result as Record<string, unknown>[]).map((record) => ({
        supplierId: record.supplierId as string,
        companyName: record.companyName as string,
        orderCount:
          typeof record.orderCount === 'number'
            ? record.orderCount
            : (record.orderCount as { toNumber: () => number }).toNumber(),
        totalSpent:
          (typeof record.totalSpent === 'number'
            ? record.totalSpent
            : (record.totalSpent as { toNumber: () => number }).toNumber()) /
          100,
      }));
    } catch (error) {
      this.logger.warn(`Failed to get top suppliers: ${error}`);
      return [];
    }
  }
}
