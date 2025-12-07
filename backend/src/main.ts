// =============================================================================
// Main Entry Point - API Server
// =============================================================================
// Point d'entrée de l'API NestJS (Write Model)
//
// Ce serveur gère:
// - Les requêtes HTTP REST
// - L'exécution des Commands (Write)
// - L'exécution des Queries (Read)
// - La publication des Domain Events
//
// Endpoints:
// - http://localhost:3000/api/v1/...
// - http://localhost:3000/api/docs (Swagger)
// =============================================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Créer l'application NestJS
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ===========================================================================
  // Global Prefix
  // ===========================================================================
  app.setGlobalPrefix('api/v1');

  // ===========================================================================
  // CORS Configuration
  // ===========================================================================
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // ===========================================================================
  // Validation Pipe
  // ===========================================================================
  // Valide automatiquement les DTOs avec class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non décorées
      forbidNonWhitelisted: true, // Erreur si propriétés inconnues
      transform: true, // Transforme les payloads en instances de DTO
      transformOptions: {
        enableImplicitConversion: true, // Conversion automatique des types
      },
    }),
  );

  // ===========================================================================
  // Swagger Documentation
  // ===========================================================================
  const config = new DocumentBuilder()
    .setTitle('AutoParts B2B API')
    .setDescription(
      `
## B2B Auto Parts Platform API

Cette API implémente une architecture **DDD + CQRS** avec:
- **PostgreSQL** comme Write Model (transactions ACID)
- **MongoDB** comme Read Model (queries optimisées)
- **Neo4j** pour les analyses graphiques
- **RabbitMQ** pour les Domain Events

### Acteurs
- **Garagiste**: Recherche et commande des pièces
- **Fournisseur**: Gère son catalogue de pièces
- **Admin**: Modère la plateforme

### Architecture CQRS
- **Commands**: Opérations d'écriture (POST, PUT, DELETE)
- **Queries**: Opérations de lecture (GET)
    `,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Identity', 'Authentication & User Management')
    .addTag('Catalog', 'Parts & Stock Management')
    .addTag('Orders', 'Order Processing')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ===========================================================================
  // Start Server
  // ===========================================================================
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Application running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
  logger.log(`🏗️  Architecture: DDD + CQRS + Event-Driven`);
}

bootstrap();
