// =============================================================================
// Analytics Controller
// =============================================================================
// API pour les statistiques globales du graphe (Admin uniquement)
// =============================================================================

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard, Roles, RolesGuard } from '@modules/identity/api';
import { UserRoleEnum } from '@modules/identity/domain/value-objects';
import { GetGraphStatsQuery } from '@infrastructure/analytics/queries';
import { GraphStatsResult } from '@infrastructure/analytics/handlers/get-graph-stats.handler';

@ApiTags('Queries - Analytics')
@ApiBearerAuth()
@Controller('queries/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly queryBus: QueryBus) {}

  @Get('graph-stats')
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({ summary: 'Statistiques du graphe (Admin)' })
  async getGraphStats(): Promise<GraphStatsResult> {
    const query = new GetGraphStatsQuery();
    return this.queryBus.execute(query);
  }
}
