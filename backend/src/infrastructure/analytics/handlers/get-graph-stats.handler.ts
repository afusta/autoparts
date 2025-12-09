// =============================================================================
// GetGraphStats Query Handler
// =============================================================================

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetGraphStatsQuery } from '../queries/get-graph-stats.query';
import { Neo4jService } from '@infrastructure/neo4j';

export interface GraphStatsResult {
  totalUsers: number;
  totalParts: number;
  totalOrders: number;
  totalVehicles: number;
  usersByRole: Record<string, number>;
}

@QueryHandler(GetGraphStatsQuery)
export class GetGraphStatsHandler implements IQueryHandler<GetGraphStatsQuery> {
  private readonly logger = new Logger(GetGraphStatsHandler.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async execute(_query: GetGraphStatsQuery): Promise<GraphStatsResult> {
    this.logger.debug('Getting graph stats');

    try {
      // Get total counts
      const countsResult = await this.neo4j.read(`
        MATCH (u:User) WITH count(u) as users
        MATCH (p:Part) WITH users, count(p) as parts
        MATCH (o:Order) WITH users, parts, count(o) as orders
        MATCH (v:Vehicle) WITH users, parts, orders, count(v) as vehicles
        RETURN users, parts, orders, vehicles
      `);

      // Get users by role
      const roleResult = await this.neo4j.read(`
        MATCH (u:User)
        RETURN u.role as role, count(u) as count
      `);

      const counts =
        countsResult.length > 0
          ? (countsResult[0] as Record<string, unknown>)
          : { users: 0, parts: 0, orders: 0, vehicles: 0 };

      const usersByRole: Record<string, number> = {};
      for (const record of roleResult as Array<Record<string, unknown>>) {
        const role = record.role as string;
        if (role) {
          usersByRole[role] = this.toNumber(record.count);
        }
      }

      return {
        totalUsers: this.toNumber(counts.users),
        totalParts: this.toNumber(counts.parts),
        totalOrders: this.toNumber(counts.orders),
        totalVehicles: this.toNumber(counts.vehicles),
        usersByRole,
      };
    } catch (error) {
      this.logger.error(`Failed to get graph stats: ${error}`);
      return {
        totalUsers: 0,
        totalParts: 0,
        totalOrders: 0,
        totalVehicles: 0,
        usersByRole: {},
      };
    }
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (
      value &&
      typeof (value as { toNumber?: () => number }).toNumber === 'function'
    ) {
      return (value as { toNumber: () => number }).toNumber();
    }
    return 0;
  }
}
