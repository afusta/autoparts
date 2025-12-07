// =============================================================================
// Neo4j Service
// =============================================================================
// Service pour interagir avec Neo4j (Graph Database)
//
// Neo4j est utilisé pour modéliser et interroger les RELATIONS:
//
// Graphe de notre domaine:
// (Garage)-[:ORDERED]->(Order)-[:CONTAINS]->(Part)<-[:SUPPLIES]-(Supplier)
// (Part)-[:COMPATIBLE_WITH]->(Vehicle)
//
// Cas d'usage:
// 1. "Quels fournisseurs livrent les pièces commandées par ce garage?"
// 2. "Quelles pièces sont compatibles avec ce véhicule?"
// 3. "Quels garages ont commandé des pièces de ce fournisseur?"
// 4. "Top 10 des pièces les plus commandées"
// 5. "Recommandations basées sur les achats similaires"
//
// Avantages de Neo4j:
// - Traversée de graphe en O(1) par relation
// - Requêtes de plusieurs niveaux de profondeur instantanées
// - Langage Cypher intuitif pour les patterns
// =============================================================================

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session, Result } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: Driver;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const uri = this.configService.get<string>('neo4j.uri');
    const username = this.configService.get<string>('neo4j.username');
    const password = this.configService.get<string>('neo4j.password');

    if (!uri || !username || !password) {
      throw new Error('Neo4j configuration is incomplete');
    }

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 60000,
      disableLosslessIntegers: true, // Retourne des numbers JS natifs
    });

    // Vérifier la connexion
    try {
      await this.driver.verifyConnectivity();
      this.logger.log('Successfully connected to Neo4j');
    } catch (error) {
      this.logger.error('Failed to connect to Neo4j', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.driver?.close();
    this.logger.log('Neo4j connection closed');
  }

  /**
   * Obtient une session Neo4j
   * @param database - Nom de la base (default par défaut)
   */
  getSession(database?: string): Session {
    return this.driver.session({
      database: database || 'neo4j',
      defaultAccessMode: neo4j.session.WRITE,
    });
  }

  /**
   * Exécute une requête Cypher en lecture
   */
  async read<T = unknown>(
    cypher: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    const session = this.getSession();
    try {
      const result: Result = await session.run(cypher, params);
      return result.records.map((record) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /**
   * Exécute une requête Cypher en écriture
   */
  async write<T = unknown>(
    cypher: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    const session = this.getSession();
    try {
      const result: Result = await session.run(cypher, params);
      return result.records.map((record) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /**
   * Exécute plusieurs requêtes dans une transaction
   */
  async runInTransaction<T>(
    work: (tx: neo4j.Transaction) => Promise<T>,
  ): Promise<T> {
    const session = this.getSession();
    try {
      return await session.executeWrite(work);
    } finally {
      await session.close();
    }
  }
}
