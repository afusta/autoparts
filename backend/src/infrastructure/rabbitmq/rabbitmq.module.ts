// =============================================================================
// RabbitMQ Module
// =============================================================================
// Configuration de RabbitMQ pour le transport des Domain Events
//
// RabbitMQ est notre Event Bus dans l'architecture CQRS:
//
// Flux des événements:
// 1. API reçoit une Command (ex: CreateOrder)
// 2. Aggregate traite la command et génère un Domain Event
// 3. Event est publié sur RabbitMQ
// 4. Worker consomme l'event et met à jour les Read Models
//
// Architecture des exchanges/queues:
//
// [Producer] → [Exchange: autoparts_exchange] → [Queue: autoparts_events] → [Consumer]
//                      │
//                      ├── routingKey: "order.created"
//                      ├── routingKey: "part.updated"
//                      └── routingKey: "user.registered"
//
// Avantages:
// - Découplage total entre Write et Read
// - Scalabilité horizontale des workers
// - Résilience (events persistés si worker down)
// - Possibilité de replay des events
// =============================================================================

import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventPublisherService } from './event-publisher.service';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RABBITMQ_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('rabbitmq.uri') as string],
            queue: configService.get<string>('rabbitmq.queue'),
            queueOptions: {
              durable: true, // Queue survit aux restarts
            },
            // Prefetch: nombre de messages traités en parallèle
            prefetchCount: 10,
            // Persistent messages
            persistent: true,
          },
        }),
      },
    ]),
  ],
  providers: [EventPublisherService],
  exports: [ClientsModule, EventPublisherService],
})
export class RabbitMQModule {}
