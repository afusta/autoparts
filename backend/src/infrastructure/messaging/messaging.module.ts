// =============================================================================
// Messaging Module
// =============================================================================
// Module partagé pour la consommation des événements RabbitMQ
// et les endpoints d'analytics globaux
//
// Ce module est partagé car:
// - L'EventConsumer consomme des événements de tous les domaines
// - Les analytics globaux traversent plusieurs bounded contexts
// =============================================================================

import { Module } from '@nestjs/common';
import { IdentityModule } from '@modules/identity';
import { CatalogModule } from '@modules/catalog';
import { OrdersModule } from '@modules/orders';
import { AnalyticsModule } from '@infrastructure/analytics/analytics.module';
import { EventConsumerController } from './event-consumer.controller';

@Module({
  imports: [IdentityModule, CatalogModule, OrdersModule, AnalyticsModule],
  controllers: [EventConsumerController],
})
export class MessagingModule {}
