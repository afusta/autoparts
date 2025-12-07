// =============================================================================
// Worker Entry Point - Event Consumer
// =============================================================================
// Point d'entrée du Worker NestJS (Read Model Updater)
//
// Ce worker est responsable de:
// - Consommer les Domain Events depuis RabbitMQ
// - Mettre à jour les projections MongoDB
// - Mettre à jour le graphe Neo4j
//
// Flux:
// RabbitMQ → Worker → EventHandler → MongoDB/Neo4j
//
// Le worker est un processus SÉPARÉ de l'API pour:
// - Scalabilité indépendante
// - Isolation des erreurs
// - Traitement asynchrone
// =============================================================================

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Worker');

  // Créer d'abord l'app pour accéder à ConfigService
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const configService = appContext.get(ConfigService);

  const rabbitmqUri = configService.get<string>('rabbitmq.uri');
  const queue = configService.get<string>('rabbitmq.queue');

  await appContext.close();

  // Créer le microservice
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri as string],
        queue: queue,
        queueOptions: {
          durable: true,
        },
        // Nombre de messages traités en parallèle
        prefetchCount: 10,
        // Ne pas auto-ack les messages (ack manuel après traitement)
        noAck: false,
      },
    },
  );

  await app.listen();

  logger.log(`🔄 Worker started, listening on queue: ${queue}`);
  logger.log(`📥 Consuming Domain Events from RabbitMQ`);
  logger.log(`📊 Updating Read Models: MongoDB + Neo4j`);
}

bootstrap();
