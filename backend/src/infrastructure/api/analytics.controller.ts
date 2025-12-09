// =============================================================================
// Analytics Controller
// =============================================================================
// API pour les statistiques globales du graphe (Admin uniquement)
// =============================================================================

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '@modules/identity/api';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';
import { Neo4jService } from '@infrastructure/neo4j';

@ApiTags('Queries - Analytics')
@ApiBearerAuth()
@Controller('queries/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly neo4j: Neo4jService) {}

  @Get('graph-stats')
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Statistiques du graphe (Admin)' })
  async getGraphStats() {
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

    const record = result[0] as Record<string, unknown>;
    return {
      users: this.toNumber(record.users),
      parts: this.toNumber(record.parts),
      orders: this.toNumber(record.orders),
      vehicles: this.toNumber(record.vehicles),
    };
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
      return (value as { toNumber: () => number }).toNumber();
    }
    return 0;
  }
}
