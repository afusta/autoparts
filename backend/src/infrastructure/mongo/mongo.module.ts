// =============================================================================
// MongoDB Module
// =============================================================================
// Configuration de Mongoose pour MongoDB (Read Database)
//
// MongoDB est utilisé comme Read Model dans notre architecture CQRS:
// - Documents dénormalisés optimisés pour les requêtes
// - Lectures rapides sans JOINs
// - Mis à jour via les Domain Events (projections)
//
// Avantages des documents dénormalisés:
// - Une seule requête pour afficher une page
// - Pas de N+1 queries
// - Structure adaptée à l'UI
//
// Exemple de projection:
// {
//   partId: "P123",
//   name: "Filtre à huile",
//   suppliers: [
//     { id: "S1", name: "AutoParts Pro", price: 9.99, stock: 20 }
//   ],
//   compatibleVehicles: ["Clio 3", "Megane 2"]
// }
// =============================================================================

import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongo.uri'),
        // Options de connexion
        retryWrites: true,
        w: 'majority',
        // Options de pool
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        // Timeout
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
