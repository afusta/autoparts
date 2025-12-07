// =============================================================================
// Database Configuration
// =============================================================================
// Configuration centralisée pour toutes les connexions aux bases de données
// - PostgreSQL : Write Model (Source of Truth)
// - MongoDB    : Read Model (Query Optimized)
// - Neo4j      : Graph Model (Relations & Analytics)
// =============================================================================

import { registerAs } from '@nestjs/config';

/**
 * Configuration PostgreSQL (Write Database)
 * Utilisé pour les opérations transactionnelles ACID
 */
export const postgresConfig = registerAs('postgres', () => ({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'autoparts',
  password: process.env.POSTGRES_PASSWORD || 'autoparts_secret',
  database: process.env.POSTGRES_DB || 'autoparts_db',
  synchronize: process.env.NODE_ENV !== 'production', // Auto-sync en dev uniquement
  logging: process.env.NODE_ENV === 'development',
}));

/**
 * Configuration MongoDB (Read Database)
 * Documents dénormalisés pour lectures rapides
 */
export const mongoConfig = registerAs('mongo', () => ({
  uri:
    process.env.MONGO_URI ||
    'mongodb://autoparts:autoparts_secret@localhost:27017/autoparts_read?authSource=admin',
}));

/**
 * Configuration Neo4j (Graph Database)
 * Modélisation des relations pour analytics
 */
export const neo4jConfig = registerAs('neo4j', () => ({
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password123',
}));

/**
 * Configuration RabbitMQ (Event Bus)
 * Transport des Domain Events
 */
export const rabbitmqConfig = registerAs('rabbitmq', () => ({
  uri:
    process.env.RABBITMQ_URI ||
    'amqp://autoparts:autoparts_secret@localhost:5672',
  queue: 'autoparts_events',
  exchange: 'autoparts_exchange',
}));
