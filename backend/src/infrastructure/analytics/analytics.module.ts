// =============================================================================
// Analytics Module
// =============================================================================
// Module pour les statistiques et analytics cross-domain
// =============================================================================

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AnalyticsController } from '../api/analytics.controller';
import { GetGraphStatsHandler } from './handlers/get-graph-stats.handler';

const QueryHandlers = [GetGraphStatsHandler];

@Module({
  imports: [CqrsModule],
  controllers: [AnalyticsController],
  providers: [...QueryHandlers],
})
export class AnalyticsModule {}
