# AutoParts B2B Platform

Plateforme B2B de commande de pièces automobiles entre garages et fournisseurs.

**Projet de démonstration** mettant en œuvre les bonnes pratiques d'architecture logicielle moderne : **Clean Architecture**, **DDD**, **CQRS** et **Event-Driven Architecture**.

---

## Table des matières

- [Architecture](#architecture)
- [Stack Technique](#stack-technique)
- [Patterns Implémentés](#patterns-implémentés)
- [Structure du Projet](#structure-du-projet)
- [Démarrage Rapide](#démarrage-rapide)
- [API Endpoints](#api-endpoints)
- [Modèle de Données](#modèle-de-données)
- [Workflow des Commandes](#workflow-des-commandes)
- [Tests Manuels](#tests-manuels)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 14)                          │
│                         React + TypeScript + Tailwind                       │
│                              http://localhost:4000                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API (NestJS)                               │
│                          http://localhost:3000                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                       │
│  │  Identity   │   │   Catalog   │   │   Orders    │   ← Bounded Contexts  │
│  │   Module    │   │   Module    │   │   Module    │                       │
│  └─────────────┘   └─────────────┘   └─────────────┘                       │
│         │                 │                 │                               │
│         └─────────────────┼─────────────────┘                               │
│                           ▼                                                 │
│                    Projections Module                                       │
│              (Event Handlers + Read Models)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   PostgreSQL    │      │    RabbitMQ     │      │     MongoDB     │
│  (Write Model)  │      │  (Event Bus)    │      │  (Read Model)   │
│   :5433         │      │   :5672/:15672  │      │    :27017       │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                          │
                                                          │
                                                  ┌───────┴───────┐
                                                  │     Neo4j     │
                                                  │    (Graph)    │
                                                  │  :7474/:7687  │
                                                  └───────────────┘
```

### Flux CQRS

```
WRITE SIDE (Commands)                    READ SIDE (Queries)
─────────────────────                    ───────────────────
POST /api/v1/parts                       GET /api/v1/queries/parts
     │                                        │
     ▼                                        ▼
CreatePartCommand                        MongoDB Query
     │                                        │
     ▼                                        ▼
Part Aggregate                           Denormalized Document
     │
     ▼
PostgreSQL
     │
     ▼
PartCreatedEvent ──────────────────────►  EventHandler
                      RabbitMQ                │
                                              ▼
                                    MongoDB + Neo4j Projections
```

---

## Stack Technique

| Composant | Technologie | Usage |
|-----------|-------------|-------|
| **Backend** | NestJS 10 + TypeScript 5 | API REST, CQRS, DDD |
| **Frontend** | Next.js 14 + React 18 | Interface utilisateur (App Router) |
| **Write DB** | PostgreSQL 15 | Source de vérité (Aggregates) |
| **Read DB** | MongoDB 6 | Projections dénormalisées |
| **Graph DB** | Neo4j 5 | Relations & Analytics |
| **Message Broker** | RabbitMQ 3 | Event Bus asynchrone |
| **Auth** | JWT + Passport + bcrypt | Authentification stateless |
| **Validation** | class-validator | DTOs validation |
| **ORM** | TypeORM | PostgreSQL mapping |
| **ODM** | Mongoose | MongoDB schemas |

---

## Patterns Implémentés

### 1. Domain-Driven Design (DDD)

```
src/modules/{module}/domain/
├── entities/           # Aggregates & Entities
├── value-objects/      # Value Objects (immuables)
├── events/             # Domain Events
└── repositories/       # Repository Interfaces
```

**Exemple - Value Object:**
```typescript
// Money est immuable et sans identité
export class Money extends ValueObject<MoneyProps> {
  get amount(): number { return this.props.amountInCents; }
  get currency(): string { return this.props.currency; }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return Money.create(this.amount + other.amount, this.currency);
  }
}
```

**Exemple - Aggregate Root:**
```typescript
// Order gère son cycle de vie et émet des Domain Events
export class Order extends AggregateRoot<OrderProps> {
  confirm(confirmedBy: string): void {
    if (!this.status.canConfirm()) {
      throw new Error('Cannot confirm order');
    }
    this.props.status = OrderStatus.confirmed();
    this.addDomainEvent(new OrderStatusChangedEvent({...}));
  }
}
```

### 2. CQRS (Command Query Responsibility Segregation)

| Write Side | Read Side |
|------------|-----------|
| `POST /api/v1/parts` | `GET /api/v1/queries/parts` |
| CommandHandler | Direct MongoDB Query |
| Aggregate + PostgreSQL | Denormalized Document |
| Domain Events → RabbitMQ | Optimized for reads |

### 3. Clean Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                            │
│              Controllers, DTOs, Guards                      │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                        │
│           Commands, Handlers, Queries                       │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                           │
│     Entities, Value Objects, Events, Repository Interfaces  │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│        ORM Entities, Repository Impl, External Services     │
└─────────────────────────────────────────────────────────────┘
```

### 4. Event-Driven Architecture

```typescript
// 1. Aggregate émet un Domain Event
order.confirm(userId);
// → this.addDomainEvent(new OrderStatusChangedEvent({...}));

// 2. EventPublisher publie vers RabbitMQ
await eventPublisher.publishAggregateEvents(order);

// 3. EventHandler consomme et met à jour les projections
@EventsHandler(OrderStatusChangedEvent)
export class OrderStatusChangedProjectionHandler {
  async handle(event: OrderStatusChangedEvent) {
    await this.mongoProjection.updateOrderStatus(event);
    await this.neo4jProjection.updateOrderStatus(event);
  }
}
```

---

## Structure du Projet

```
autoparts/
├── docker-compose.yml              # Orchestration des services
├── .env.example                    # Variables d'environnement
├── README.md                       # Documentation
│
├── backend/                        # API NestJS
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── src/
│       ├── main.ts                 # Point d'entrée API
│       ├── worker.ts               # Point d'entrée Worker (events)
│       ├── app.module.ts           # Module racine
│       │
│       ├── shared/                 # Code partagé
│       │   ├── ddd/               # Classes de base DDD
│       │   │   ├── entity.base.ts
│       │   │   ├── value-object.base.ts
│       │   │   ├── aggregate-root.base.ts
│       │   │   ├── domain-event.base.ts
│       │   │   └── repository.interface.ts
│       │   └── config/            # Configuration centralisée
│       │       ├── database.config.ts
│       │       └── jwt.config.ts
│       │
│       ├── infrastructure/         # Modules d'infrastructure
│       │   ├── postgres/          # TypeORM PostgreSQL
│       │   ├── mongo/             # Mongoose MongoDB
│       │   ├── neo4j/             # Neo4j Driver
│       │   └── rabbitmq/          # RabbitMQ Client
│       │
│       ├── modules/               # Bounded Contexts
│       │   ├── identity/          # Auth, Users, RBAC
│       │   │   ├── domain/
│       │   │   │   ├── entities/user.entity.ts
│       │   │   │   ├── value-objects/{email,password,user-role}.vo.ts
│       │   │   │   ├── events/user-registered.event.ts
│       │   │   │   └── repositories/user.repository.interface.ts
│       │   │   ├── application/
│       │   │   │   ├── commands/register-user.command.ts
│       │   │   │   └── handlers/register-user.handler.ts
│       │   │   ├── infrastructure/
│       │   │   │   ├── persistence/{user.orm-entity,user.repository}.ts
│       │   │   │   └── services/{auth.service,jwt.strategy}.ts
│       │   │   ├── api/
│       │   │   │   ├── controllers/auth.controller.ts
│       │   │   │   ├── dtos/{login,register,auth-response}.dto.ts
│       │   │   │   ├── guards/{jwt-auth,roles}.guard.ts
│       │   │   │   └── decorators/{public,roles,current-user}.decorator.ts
│       │   │   └── identity.module.ts
│       │   │
│       │   ├── catalog/           # Parts, Stock
│       │   │   ├── domain/
│       │   │   │   ├── entities/part.entity.ts
│       │   │   │   ├── value-objects/{money,stock,part-reference,vehicle-compatibility}.vo.ts
│       │   │   │   ├── events/{part-created,part-updated,stock-updated}.event.ts
│       │   │   │   └── repositories/part.repository.interface.ts
│       │   │   ├── application/
│       │   │   │   ├── commands/{create-part,update-part}.command.ts
│       │   │   │   └── handlers/{create-part,update-part}.handler.ts
│       │   │   ├── infrastructure/
│       │   │   │   └── persistence/{part.orm-entity,part.repository}.ts
│       │   │   ├── api/
│       │   │   │   ├── controllers/parts.controller.ts
│       │   │   │   └── dtos/{create-part,update-part,part-response,search-parts}.dto.ts
│       │   │   └── catalog.module.ts
│       │   │
│       │   └── orders/            # Orders, Workflow
│       │       ├── domain/
│       │       │   ├── entities/order.entity.ts
│       │       │   ├── value-objects/{order-status,order-line}.vo.ts
│       │       │   ├── events/{order-created,order-status-changed}.event.ts
│       │       │   └── repositories/order.repository.interface.ts
│       │       ├── application/
│       │       │   ├── commands/{create-order,update-order-status}.command.ts
│       │       │   └── handlers/{create-order,update-order-status}.handler.ts
│       │       ├── infrastructure/
│       │       │   └── persistence/{order.orm-entity,order.repository}.ts
│       │       ├── api/
│       │       │   ├── controllers/orders.controller.ts
│       │       │   └── dtos/{create-order,update-order-status,order-response}.dto.ts
│       │       └── orders.module.ts
│       │
│       └── projections/           # CQRS Read Side
│           ├── mongo/
│           │   ├── schemas/{part-read,order-read,user-read}.schema.ts
│           │   └── services/mongo-projection.service.ts
│           ├── neo4j/
│           │   └── services/neo4j-projection.service.ts
│           ├── handlers/
│           │   ├── user-projection.handler.ts
│           │   ├── part-projection.handler.ts
│           │   └── order-projection.handler.ts
│           ├── api/
│           │   └── queries.controller.ts
│           └── projections.module.ts
│
└── frontend/                       # Next.js 14
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    ├── tailwind.config.js
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.tsx
        │   ├── page.tsx              # Redirect to /login
        │   ├── login/
        │   │   └── page.tsx          # Login/Register
        │   └── (authenticated)/
        │       ├── layout.tsx        # Protected layout with Navbar
        │       ├── dashboard/
        │       │   └── page.tsx      # Dashboard
        │       ├── parts/
        │       │   └── page.tsx      # Parts catalog
        │       └── orders/
        │           └── page.tsx      # Orders management
        ├── components/
        │   ├── Navbar.tsx
        │   └── AuthGuard.tsx
        └── lib/
            ├── api.ts                # Axios client + API functions
            └── store.ts              # Zustand auth store
```

---

## Démarrage Rapide

### Prérequis

- Docker & Docker Compose v2+
- Node.js 20+ (pour développement local sans Docker)

### Installation

```bash
# Cloner le projet
git clone <repository-url>
cd autoparts

# Démarrer tous les services
docker-compose up -d --build

# Vérifier que tous les services sont healthy
docker-compose ps

# Charger les données de test (thème Cars de Disney!)
cd backend
npm install
npm run seed
cd ..

# Voir les logs de l'API
docker-compose logs -f api
```

### URLs des services

| Service | URL | Identifiants |
|---------|-----|--------------|
| **Frontend** | http://localhost:4000 | - |
| **API** | http://localhost:3000 | - |
| **Swagger** | http://localhost:3000/api | - |
| **RabbitMQ** | http://localhost:15672 | guest / guest |
| **Neo4j Browser** | http://localhost:7474 | neo4j / password123 |

### Comptes de test (après `npm run seed`)

Le script de seed crée des utilisateurs inspirés du film Cars de Disney:

**Garages** (peuvent commander des pièces):

| Email | Mot de passe | Entreprise |
|-------|--------------|------------|
| luigi@casadellatires.com | LuigiTires123 | Luigi's Casa Della Tires |
| ramone@houseofbodyart.com | Ramone2023! | Ramone's House of Body Art |
| doc@hudsonracing.com | DocHudson51 | Doc Hudson's Racing Clinic |
| flo@v8cafe.com | FloV8Cafe123 | Flo's V8 Cafe & Service |
| mater@towmater.com | TowMater123! | Mater's Towing & Salvage |

**Fournisseurs** (peuvent gérer le catalogue):

| Email | Mot de passe | Entreprise |
|-------|--------------|------------|
| sales@rusteze.com | Rusteze2023! | Rust-eze Medicated Bumper Ointment |
| parts@dinoco.com | Dinoco2023! | Dinoco Oil Company |
| wholesale@lightyeartires.com | Lightyear123 | Lightyear Tires |
| racing@pistoncup.com | PistonCup123 | Piston Cup Racing Parts |
| fillmore@organicfuel.com | Organic2023! | Fillmore's Organic Fuel |

**Admin**:

| Email | Mot de passe |
|-------|--------------|
| admin@radiatorsprings.com | Admin2023! |

### Développement local (sans Docker)

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (autre terminal)
cd frontend
npm install
npm run dev
```

---

## API Endpoints

### Authentification (`/api/v1/auth`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Inscription | Non |
| POST | `/api/v1/auth/login` | Connexion | Non |
| GET | `/api/v1/auth/me` | Profil utilisateur | Oui |

**Inscription:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "garage@example.com",
    "password": "password123",
    "companyName": "Mon Garage SARL",
    "role": "GARAGE"
  }'
```

**Réponse:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "garage@example.com",
    "companyName": "Mon Garage SARL",
    "role": "GARAGE"
  }
}
```

### Catalogue (`/api/v1/parts`) - Fournisseurs

| Méthode | Endpoint | Description | Rôle |
|---------|----------|-------------|------|
| POST | `/api/v1/parts` | Créer une pièce | SUPPLIER |
| PATCH | `/api/v1/parts/:id` | Modifier une pièce | SUPPLIER |
| POST | `/api/v1/parts/:id/stock` | Ajouter du stock | SUPPLIER |
| GET | `/api/v1/parts/my` | Mes pièces | SUPPLIER |

**Créer une pièce:**
```bash
curl -X POST http://localhost:3000/api/v1/parts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reference": "BRK-001",
    "name": "Plaquettes de frein avant",
    "description": "Plaquettes haute performance",
    "category": "Freinage",
    "brand": "Brembo",
    "priceInCents": 4500,
    "currency": "EUR",
    "stockQuantity": 100,
    "compatibleVehicles": [
      {
        "brand": "Peugeot",
        "model": "308",
        "yearFrom": 2015,
        "yearTo": 2023,
        "engine": "1.6 HDi"
      }
    ]
  }'
```

### Commandes (`/api/v1/orders`)

| Méthode | Endpoint | Description | Rôle |
|---------|----------|-------------|------|
| POST | `/api/v1/orders` | Créer une commande | GARAGE |
| GET | `/api/v1/orders/my` | Mes commandes | GARAGE |
| GET | `/api/v1/orders/supplier` | Commandes reçues | SUPPLIER |
| GET | `/api/v1/orders/:id` | Détail commande | All |
| POST | `/api/v1/orders/:id/confirm` | Confirmer | SUPPLIER |
| POST | `/api/v1/orders/:id/ship` | Expédier | SUPPLIER |
| POST | `/api/v1/orders/:id/cancel` | Annuler | All |

**Créer une commande:**
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <garage-token>" \
  -d '{
    "lines": [
      { "partId": "uuid-part-1", "quantity": 2 },
      { "partId": "uuid-part-2", "quantity": 1 }
    ],
    "notes": "Livraison urgente SVP"
  }'
```

### Requêtes Read Models (`/api/v1/queries`)

| Méthode | Endpoint | Description | Rôle |
|---------|----------|-------------|------|
| GET | `/api/v1/queries/parts` | Recherche pièces (MongoDB) | All |
| GET | `/api/v1/queries/parts/:id` | Détail pièce + recommandations | All |
| GET | `/api/v1/queries/my-orders` | Mes commandes (MongoDB) | GARAGE |
| GET | `/api/v1/queries/supplier-orders` | Commandes reçues (MongoDB) | SUPPLIER |
| GET | `/api/v1/queries/analytics/my-top-suppliers` | Top fournisseurs (Neo4j) | GARAGE |
| GET | `/api/v1/queries/analytics/parts-for-vehicle` | Pièces compatibles (Neo4j) | All |
| GET | `/api/v1/queries/analytics/graph-stats` | Stats du graphe (Neo4j) | ADMIN |

**Recherche de pièces:**
```bash
curl "http://localhost:3000/api/v1/queries/parts?search=frein&category=Freinage&inStock=true&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Réponse:**
```json
{
  "items": [
    {
      "partId": "uuid",
      "reference": "BRK-001",
      "name": "Plaquettes de frein avant",
      "supplier": { "id": "uuid", "name": "Fournisseur X" },
      "price": 45.00,
      "priceFormatted": "45,00 €",
      "stock": {
        "quantity": 100,
        "available": 95,
        "isLow": false,
        "isOutOfStock": false
      },
      "compatibleVehicles": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## Modèle de Données

### PostgreSQL (Write Model)

```sql
-- Users (Garages, Suppliers, Admins)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,  -- GARAGE, SUPPLIER, ADMIN
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Parts (Pièces automobiles)
CREATE TABLE parts (
    id UUID PRIMARY KEY,
    supplier_id UUID REFERENCES users(id),
    reference VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    price_in_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    stock_quantity INTEGER DEFAULT 0,
    stock_reserved INTEGER DEFAULT 0,
    compatible_vehicles JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders (Commandes)
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    garage_id UUID REFERENCES users(id),
    garage_name VARCHAR(255),
    status VARCHAR(20) NOT NULL,  -- PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
    lines JSONB NOT NULL,
    total_in_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    notes TEXT,
    cancel_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### MongoDB (Read Model)

```javascript
// Collection: parts_read
{
  partId: "uuid",
  reference: "BRK-001",
  name: "Plaquettes de frein avant",
  description: "...",
  category: "Freinage",
  brand: "Brembo",
  supplier: {
    id: "uuid",
    name: "Fournisseur X"
  },
  priceInCents: 4500,
  price: 45.00,
  priceFormatted: "45,00 €",
  currency: "EUR",
  stock: {
    quantity: 100,
    reserved: 5,
    available: 95,
    isLow: false,
    isOutOfStock: false
  },
  compatibleVehicles: [
    {
      brand: "Peugeot",
      model: "308",
      yearFrom: 2015,
      yearTo: 2023,
      engine: "1.6 HDi",
      searchText: "Peugeot 308 2015-2023 1.6 HDi"
    }
  ],
  vehiclesSearchText: "Peugeot 308 1.6 HDi",
  isActive: true,
  orderCount: 15,
  lastOrderedAt: ISODate("2024-01-15")
}

// Collection: orders_read
{
  orderId: "uuid",
  garage: { id: "uuid", name: "Mon Garage SARL" },
  lines: [
    {
      partId: "uuid",
      partName: "Plaquettes de frein",
      partReference: "BRK-001",
      supplierId: "uuid",
      supplierName: "Fournisseur X",
      quantity: 2,
      unitPriceInCents: 4500,
      unitPrice: 45.00,
      totalInCents: 9000,
      total: 90.00,
      totalFormatted: "90,00 €"
    }
  ],
  supplierIds: ["uuid"],
  status: "CONFIRMED",
  totalInCents: 9000,
  total: 90.00,
  totalFormatted: "90,00 €",
  currency: "EUR",
  statusHistory: [
    { status: "PENDING", changedAt: ISODate("...") },
    { status: "CONFIRMED", changedAt: ISODate("..."), changedBy: "uuid" }
  ],
  createdAt: ISODate("...")
}
```

### Neo4j (Graph Model)

```cypher
// Nodes
(:User {id, email, companyName, role})
(:Part {id, reference, name, category, brand, priceInCents})
(:Vehicle {id, brand, model})
(:Order {id, totalInCents, status})

// Relationships
(User:Supplier)-[:SUPPLIES {createdAt}]->(Part)
(Part)-[:COMPATIBLE_WITH {yearFrom, yearTo, engine}]->(Vehicle)
(User:Garage)-[:PLACED {createdAt}]->(Order)
(Order)-[:CONTAINS {quantity, totalInCents}]->(Part)
(User:Garage)-[:ORDERED_FROM {orderCount, totalSpentInCents, lastOrderAt}]->(User:Supplier)
```

**Requêtes analytiques:**
```cypher
-- Pièces souvent commandées ensemble
MATCH (p1:Part)<-[:CONTAINS]-(o:Order)-[:CONTAINS]->(p2:Part)
WHERE p1.id = $partId AND p1 <> p2
RETURN p2.id, p2.name, count(o) as frequency
ORDER BY frequency DESC LIMIT 5

-- Top fournisseurs d'un garage
MATCH (g:User {id: $garageId})-[r:ORDERED_FROM]->(s:User)
RETURN s.companyName, r.orderCount, r.totalSpentInCents
ORDER BY r.totalSpentInCents DESC
```

---

## Workflow des Commandes

```
                                    Garage crée
                                    la commande
                                        │
                                        ▼
                               ┌────────────────┐
                               │    PENDING     │ ← Stock réservé
                               └────────────────┘
                                   │         │
            Fournisseur confirme   │         │  Annulation
                                   ▼         ▼
                          ┌────────────────┐ ┌────────────────┐
                          │   CONFIRMED    │ │   CANCELLED    │ ← Stock libéré
                          └────────────────┘ └────────────────┘
                                   │                 ▲
            Fournisseur expédie    │                 │
                                   ▼                 │
                          ┌────────────────┐         │
                          │    SHIPPED     │─────────┘
                          └────────────────┘   Annulation
                                   │
            Livraison confirmée    │
                                   ▼
                          ┌────────────────┐
                          │   DELIVERED    │ ← Stock consommé
                          └────────────────┘
```

**Règles métier:**
- `PENDING → CONFIRMED` : Seul le fournisseur peut confirmer
- `CONFIRMED → SHIPPED` : Seul le fournisseur peut expédier
- `SHIPPED → DELIVERED` : Confirmation de livraison
- `* → CANCELLED` : Garage ou Fournisseur peut annuler (libère le stock)

---

## Tests Manuels

### Scénario complet

```bash
# 1. Créer un fournisseur
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"supplier@test.com","password":"password123","companyName":"Auto Parts Pro","role":"SUPPLIER"}'

# Sauvegarder le token fournisseur
SUPPLIER_TOKEN="<token>"

# 2. Créer un garage
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"garage@test.com","password":"password123","companyName":"Garage Central","role":"GARAGE"}'

# Sauvegarder le token garage
GARAGE_TOKEN="<token>"

# 3. Fournisseur crée une pièce
curl -X POST http://localhost:3000/api/v1/parts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPPLIER_TOKEN" \
  -d '{
    "reference": "BRK-001",
    "name": "Plaquettes de frein avant",
    "description": "Plaquettes haute performance",
    "category": "Freinage",
    "brand": "Brembo",
    "priceInCents": 4500,
    "currency": "EUR",
    "stockQuantity": 100,
    "compatibleVehicles": [{"brand":"Peugeot","model":"308","yearFrom":2015,"yearTo":2023}]
  }'

# Sauvegarder l'ID de la pièce
PART_ID="<partId>"

# 4. Garage recherche des pièces
curl "http://localhost:3000/api/v1/queries/parts?search=frein" \
  -H "Authorization: Bearer $GARAGE_TOKEN"

# 5. Garage crée une commande
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GARAGE_TOKEN" \
  -d '{"lines": [{"partId": "'$PART_ID'", "quantity": 2}]}'

# Sauvegarder l'ID de la commande
ORDER_ID="<orderId>"

# 6. Fournisseur confirme la commande
curl -X POST "http://localhost:3000/api/v1/orders/$ORDER_ID/confirm" \
  -H "Authorization: Bearer $SUPPLIER_TOKEN"

# 7. Fournisseur expédie
curl -X POST "http://localhost:3000/api/v1/orders/$ORDER_ID/ship" \
  -H "Authorization: Bearer $SUPPLIER_TOKEN"

# 8. Vérifier l'historique dans Neo4j
# Ouvrir http://localhost:7474 et exécuter:
# MATCH (g:Garage)-[r:ORDERED_FROM]->(s:Supplier) RETURN g, r, s
```

---

## Variables d'Environnement

Voir `.env.example` pour la liste complète.

```bash
# Backend
NODE_ENV=development
PORT=3000

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=autoparts
POSTGRES_PASSWORD=autoparts_secret
POSTGRES_DB=autoparts_db

# MongoDB
MONGO_URI=mongodb://autoparts:autoparts_secret@localhost:27017/autoparts_read?authSource=admin

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# RabbitMQ
RABBITMQ_URI=amqp://autoparts:autoparts_secret@localhost:5672

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1d
```

---

## Troubleshooting

### Conflit de port PostgreSQL

Le projet utilise le port **5433** (au lieu du 5432 standard) pour éviter les conflits avec une installation PostgreSQL locale. Si vous avez modifié ce port, assurez-vous qu'il est cohérent dans:
- `docker-compose.yml`
- `backend/.env`
- `.env.example`

### Réinitialiser toutes les données

```bash
# Supprimer tous les volumes et redémarrer
docker-compose down -v
docker-compose up -d --build

# Attendre que les services soient prêts, puis recharger les données
cd backend && npm run seed
```

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f api
docker-compose logs -f worker
```

---

## Évolutions Possibles

- [ ] Tests unitaires et d'intégration (Jest)
- [ ] Event Sourcing complet (reconstruction d'état depuis les events)
- [ ] Elasticsearch pour la recherche full-text
- [ ] WebSocket pour notifications temps réel
- [ ] Gestion des factures et paiements
- [ ] Dashboard analytics avec graphiques
- [ ] Rate limiting et throttling
- [ ] Kubernetes deployment

---

## Licence

MIT
