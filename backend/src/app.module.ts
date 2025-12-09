// =============================================================================
// App Module - Point d'entrée de l'application NestJS
// =============================================================================
// Ce module configure et assemble tous les composants de l'application:
//
// Architecture CQRS:
// ┌─────────────────────────────────────────────────────────────────┐
// │                        App Module                               │
// ├─────────────────────────────────────────────────────────────────┤
// │  Configuration     │  Infrastructure      │  Feature Modules   │
// │  ----------------  │  ------------------  │  ----------------  │
// │  ConfigModule      │  PostgresModule      │  IdentityModule    │
// │  (env variables)   │  MongoModule         │  CatalogModule     │
// │                    │  Neo4jModule         │  OrdersModule      │
// │                    │  RabbitMQModule      │                    │
// └─────────────────────────────────────────────────────────────────┘
//
// Chaque Feature Module contient:
// - Write Side: Commands → PostgreSQL
// - Read Side: Queries → MongoDB (projections intégrées par domaine)
//
// Flux d'une requête:
// HTTP Request → Controller → CommandHandler → Aggregate → Repository → PostgreSQL
//                                                       ↓
//                                              Domain Event → RabbitMQ → Projections
// =============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

// Configuration
import {
  postgresConfig,
  mongoConfig,
  neo4jConfig,
  rabbitmqConfig,
  jwtConfig,
} from '@shared/config';

// Infrastructure
import { PostgresModule } from '@infrastructure/postgres';
import { MongoModule } from '@infrastructure/mongo';
import { Neo4jModule } from '@infrastructure/neo4j';
import { RabbitMQModule } from '@infrastructure/rabbitmq';

// Feature Modules (chacun inclut ses propres Read Models)
import { IdentityModule } from '@modules/identity';
import { CatalogModule } from '@modules/catalog';
import { OrdersModule } from '@modules/orders';

// Shared Messaging (EventConsumer + Analytics)
import { MessagingModule } from '@infrastructure/messaging/messaging.module';

@Module({
  imports: [
    // =========================================================================
    // Configuration Module
    // =========================================================================
    // Charge les variables d'environnement et les rend disponibles
    // via ConfigService dans toute l'application
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        postgresConfig,
        mongoConfig,
        neo4jConfig,
        rabbitmqConfig,
        jwtConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),

    // =========================================================================
    // CQRS Module
    // =========================================================================
    // Fournit CommandBus, QueryBus, EventBus pour l'architecture CQRS
    CqrsModule.forRoot(),

    // =========================================================================
    // Infrastructure Modules
    // =========================================================================
    // Connexions aux bases de données et services externes
    PostgresModule,
    MongoModule,
    Neo4jModule,
    RabbitMQModule,

    // =========================================================================
    // Feature Modules
    // =========================================================================
    // Bounded Contexts de notre domaine
    // Chaque module inclut ses propres:
    // - Commands & Handlers (Write Side → PostgreSQL)
    // - Queries & Controllers (Read Side → MongoDB)
    // - Event Handlers (Projections)
    IdentityModule, // Auth, Users, Roles
    CatalogModule, // Parts, Suppliers, Stock
    OrdersModule, // Orders, OrderItems

    // =========================================================================
    // Messaging Module
    // =========================================================================
    // Consommation des événements RabbitMQ et analytics cross-domain
    MessagingModule,
  ],
})
export class AppModule {}
