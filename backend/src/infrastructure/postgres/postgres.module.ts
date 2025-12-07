// =============================================================================
// PostgreSQL Module
// =============================================================================
// Configuration de TypeORM pour PostgreSQL (Write Database)
//
// PostgreSQL est utilisé comme Write Model dans notre architecture CQRS:
// - Stockage transactionnel avec garanties ACID
// - Source de vérité pour toutes les données
// - Les entities TypeORM représentent la persistence des Aggregates
//
// Flux:
// 1. Command arrive → CommandHandler l'exécute
// 2. Aggregate est modifié → Repository persiste dans PostgreSQL
// 3. Domain Events sont publiés → Worker met à jour les Read Models
// =============================================================================

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('postgres.host'),
        port: configService.get<number>('postgres.port'),
        username: configService.get<string>('postgres.username'),
        password: configService.get<string>('postgres.password'),
        database: configService.get<string>('postgres.database'),
        // Auto-load des entities depuis les modules
        autoLoadEntities: true,
        // Synchronize UNIQUEMENT en développement
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        // Logging SQL en développement
        logging: configService.get<string>('NODE_ENV') === 'development',
        // Pool de connexions
        extra: {
          max: 20, // Max connexions
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class PostgresModule {}
