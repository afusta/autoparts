// =============================================================================
// Cars Movie Inspired Test Data Seed Script
// =============================================================================
// This script creates a comprehensive test dataset inspired by the Disney/Pixar
// "Cars" movie to demonstrate all features of the B2B AutoParts platform.
//
// Run with: npm run seed
// =============================================================================

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';
import { PartRead } from '../projections/mongo/schemas/part-read.schema';
import { OrderRead } from '../projections/mongo/schemas/order-read.schema';
import { UserRead } from '../projections/mongo/schemas/user-read.schema';

// =============================================================================
// CARS-INSPIRED DATA
// =============================================================================

// Vehicle types based on Cars characters
const CARS_VEHICLES = [
  {
    brand: 'Stock Car',
    model: 'Lightning McQueen',
    yearFrom: 2006,
    yearTo: 2017,
    engine: 'V8 Racing',
  },
  {
    brand: 'Tow Truck',
    model: 'Mater',
    yearFrom: 1951,
    yearTo: 1957,
    engine: 'Inline-6',
  },
  {
    brand: 'Porsche',
    model: 'Sally Carrera 911',
    yearFrom: 2002,
    yearTo: 2006,
    engine: 'Flat-6',
  },
  {
    brand: 'Hudson',
    model: 'Doc Hornet',
    yearFrom: 1951,
    yearTo: 1954,
    engine: 'Twin-H V8',
  },
  {
    brand: 'Chevrolet',
    model: 'Ramone Impala',
    yearFrom: 1959,
    yearTo: 1959,
    engine: 'V8',
  },
  {
    brand: 'Motorama',
    model: 'Flo Show Car',
    yearFrom: 1957,
    yearTo: 1957,
    engine: 'V8',
  },
  {
    brand: 'Mercury',
    model: 'Sheriff Cruiser',
    yearFrom: 1949,
    yearTo: 1951,
    engine: 'Flathead V8',
  },
  {
    brand: 'Volkswagen',
    model: 'Fillmore Bus',
    yearFrom: 1960,
    yearTo: 1967,
    engine: 'Flat-4',
  },
  {
    brand: 'Willys',
    model: 'Sarge Jeep',
    yearFrom: 1942,
    yearTo: 1945,
    engine: 'Go Devil',
  },
  {
    brand: 'Fire Truck',
    model: 'Red',
    yearFrom: 1960,
    yearTo: 1970,
    engine: 'Diesel V8',
  },
  {
    brand: 'Mack',
    model: 'Semi Truck',
    yearFrom: 1985,
    yearTo: 2020,
    engine: 'Diesel',
  },
  {
    brand: 'Stock Car',
    model: 'Chick Hicks',
    yearFrom: 2006,
    yearTo: 2017,
    engine: 'V8 Racing',
  },
  {
    brand: 'Plymouth',
    model: 'The King Superbird',
    yearFrom: 1970,
    yearTo: 1970,
    engine: 'Hemi V8',
  },
  {
    brand: 'Aston Martin',
    model: 'Finn McMissile',
    yearFrom: 2011,
    yearTo: 2011,
    engine: 'V12',
  },
  {
    brand: 'Formula',
    model: 'Francesco Bernoulli',
    yearFrom: 2011,
    yearTo: 2011,
    engine: 'V8 F1',
  },
];

// Users - Garages (Radiator Springs businesses)
const GARAGES = [
  {
    email: 'luigi@casadellatires.com',
    password: 'LuigiTires123',
    companyName: "Luigi's Casa Della Tires",
    description:
      'Finest tires in Carburetor County! Home of the Fettuccini Alfredo whitewalls.',
  },
  {
    email: 'ramone@houseofbodyart.com',
    password: 'Ramone2023!',
    companyName: "Ramone's House of Body Art",
    description:
      'Custom paint jobs and body work. Low and slow is the way to go!',
  },
  {
    email: 'doc@hudsonracing.com',
    password: 'DocHudson51',
    companyName: "Doc Hudson's Racing Clinic",
    description:
      'Racing repairs and performance tuning by a 3-time Piston Cup champion.',
  },
  {
    email: 'flo@v8cafe.com',
    password: 'FloV8Cafe123',
    companyName: "Flo's V8 Cafe & Service",
    description: 'The finest fuel in 50 states! Full service and repairs.',
  },
  {
    email: 'mater@towmater.com',
    password: 'TowMater123!',
    companyName: "Mater's Towing & Salvage",
    description: 'Towing, salvage, and the best backwards driving in town!',
  },
];

// Users - Suppliers (Parts companies from Cars universe)
const SUPPLIERS = [
  {
    email: 'sales@rusteze.com',
    password: 'Rusteze2023!',
    companyName: 'Rust-eze Medicated Bumper Ointment',
    description:
      'The official sponsor of Lightning McQueen! Rust-eze: With your help, even rusty old cars can be winners!',
  },
  {
    email: 'parts@dinoco.com',
    password: 'Dinoco2023!',
    companyName: 'Dinoco Oil Company',
    description:
      'The most prestigious sponsor in racing. Premium oils and lubricants.',
  },
  {
    email: 'wholesale@lightyeartires.com',
    password: 'Lightyear123',
    companyName: 'Lightyear Tires',
    description:
      'To infinity and beyond! High-performance tires for all vehicles.',
  },
  {
    email: 'racing@pistoncup.com',
    password: 'PistonCup123',
    companyName: 'Piston Cup Racing Parts',
    description:
      'Official racing parts supplier for the Piston Cup racing series.',
  },
  {
    email: 'fillmore@organicfuel.com',
    password: 'Organic2023!',
    companyName: "Fillmore's Organic Fuel",
    description: 'All natural, organic fuel blends. Save the planet, man!',
  },
];

// Admin user
const ADMIN = {
  email: 'admin@radiatorsprings.com',
  password: 'Admin2023!',
  companyName: 'Radiator Springs Administration',
};

// Parts by supplier
const PARTS_BY_SUPPLIER: Record<
  string,
  Array<{
    reference: string;
    name: string;
    description: string;
    category: string;
    brand: string;
    price: number;
    initialStock: number;
    compatibleVehicles: typeof CARS_VEHICLES;
  }>
> = {
  'sales@rusteze.com': [
    {
      reference: 'RUST-001',
      name: 'Rust Prevention Spray',
      description:
        'Advanced rust prevention formula. Keeps your body panels looking new!',
      category: 'Body Care',
      brand: 'Rust-eze',
      price: 24.99,
      initialStock: 200,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'RUST-002',
      name: 'Medicated Bumper Ointment',
      description:
        'The original formula! Soothes and protects bumpers from rust and corrosion.',
      category: 'Body Care',
      brand: 'Rust-eze',
      price: 19.99,
      initialStock: 150,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'RUST-003',
      name: 'Chrome Polish Deluxe',
      description: 'Makes your chrome shine like Lightning! Pro-grade polish.',
      category: 'Body Care',
      brand: 'Rust-eze',
      price: 14.99,
      initialStock: 300,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'RUST-004',
      name: 'Undercarriage Protector',
      description:
        'Heavy-duty undercarriage protection. Perfect for desert driving.',
      category: 'Body Care',
      brand: 'Rust-eze',
      price: 39.99,
      initialStock: 100,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'RUST-005',
      name: 'Ka-Chow Lightning Red Paint',
      description: 'Official Lightning McQueen red. Become a winner!',
      category: 'Paint',
      brand: 'Rust-eze',
      price: 89.99,
      initialStock: 50,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) => v.model.includes('Lightning') || v.model.includes('Chick'),
      ),
    },
  ],
  'parts@dinoco.com': [
    {
      reference: 'DINO-001',
      name: 'Dinoco Premium Motor Oil 5W-30',
      description: 'The oil of champions. Used by The King himself!',
      category: 'Oils',
      brand: 'Dinoco',
      price: 49.99,
      initialStock: 500,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'DINO-002',
      name: 'Dinoco Synthetic Racing Oil',
      description: 'High-performance synthetic oil for racing engines.',
      category: 'Oils',
      brand: 'Dinoco',
      price: 79.99,
      initialStock: 200,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) =>
          v.model.includes('Lightning') ||
          v.model.includes('King') ||
          v.model.includes('Chick') ||
          v.model.includes('Francesco'),
      ),
    },
    {
      reference: 'DINO-003',
      name: 'Dinoco Premium Oil Filter',
      description: 'Keep your oil clean with Dinoco filtration technology.',
      category: 'Filtration',
      brand: 'Dinoco',
      price: 29.99,
      initialStock: 400,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'DINO-004',
      name: 'Dinoco Fuel System Cleaner',
      description: 'Cleans fuel injectors and improves performance.',
      category: 'Fuel System',
      brand: 'Dinoco',
      price: 34.99,
      initialStock: 250,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'DINO-005',
      name: 'Dinoco Blue Coolant',
      description: 'Premium coolant in signature Dinoco blue.',
      category: 'Cooling',
      brand: 'Dinoco',
      price: 24.99,
      initialStock: 300,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'DINO-006',
      name: 'Dinoco Championship Grease',
      description: 'High-temperature grease for bearings and joints.',
      category: 'Lubricants',
      brand: 'Dinoco',
      price: 19.99,
      initialStock: 350,
      compatibleVehicles: CARS_VEHICLES,
    },
  ],
  'wholesale@lightyeartires.com': [
    {
      reference: 'LIGHT-001',
      name: 'Racing Slicks - Piston Cup Edition',
      description:
        'Smooth tires for maximum grip on race tracks. No treads, no limits!',
      category: 'Tires',
      brand: 'Lightyear',
      price: 299.99,
      initialStock: 80,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) =>
          v.model.includes('Lightning') ||
          v.model.includes('King') ||
          v.model.includes('Chick') ||
          v.model.includes('Francesco'),
      ),
    },
    {
      reference: 'LIGHT-002',
      name: 'All-Season Touring Tires',
      description:
        'Perfect for Route 66 and beyond. Handles all weather conditions.',
      category: 'Tires',
      brand: 'Lightyear',
      price: 149.99,
      initialStock: 200,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'LIGHT-003',
      name: 'Off-Road Adventure Tires',
      description: 'For when the road ends. Perfect for desert exploration.',
      category: 'Tires',
      brand: 'Lightyear',
      price: 179.99,
      initialStock: 120,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) =>
          v.model.includes('Mater') ||
          v.model.includes('Sarge') ||
          v.model.includes('Sheriff'),
      ),
    },
    {
      reference: 'LIGHT-004',
      name: 'Fettuccini Alfredo Whitewalls',
      description:
        "Luigi's favorite! Classic whitewall tires for that vintage look.",
      category: 'Tires',
      brand: 'Lightyear',
      price: 199.99,
      initialStock: 60,
      compatibleVehicles: CARS_VEHICLES.filter((v) => v.yearTo < 1970),
    },
    {
      reference: 'LIGHT-005',
      name: 'Performance Sport Tires',
      description: 'High-performance tires for spirited driving.',
      category: 'Tires',
      brand: 'Lightyear',
      price: 229.99,
      initialStock: 150,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) => v.model.includes('Sally') || v.model.includes('Finn'),
      ),
    },
    {
      reference: 'LIGHT-006',
      name: 'Heavy Duty Truck Tires',
      description: 'Built for hauling. Perfect for Mack and friends.',
      category: 'Tires',
      brand: 'Lightyear',
      price: 349.99,
      initialStock: 40,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) => v.model.includes('Mack') || v.model.includes('Red'),
      ),
    },
  ],
  'racing@pistoncup.com': [
    {
      reference: 'PIST-001',
      name: 'Racing Brake Pads - Carbon Ceramic',
      description: 'Stop on a dime at 200mph. Official Piston Cup spec.',
      category: 'Brakes',
      brand: 'Piston Cup',
      price: 449.99,
      initialStock: 50,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) => v.engine?.includes('Racing') || v.engine?.includes('F1'),
      ),
    },
    {
      reference: 'PIST-002',
      name: 'High-Performance Spark Plugs',
      description: 'Iridium-tipped for maximum ignition. Ka-chow!',
      category: 'Ignition',
      brand: 'Piston Cup',
      price: 89.99,
      initialStock: 200,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'PIST-003',
      name: 'Racing Exhaust System',
      description: 'Freeflow exhaust for that championship sound.',
      category: 'Exhaust',
      brand: 'Piston Cup',
      price: 899.99,
      initialStock: 30,
      compatibleVehicles: CARS_VEHICLES.filter((v) => v.engine?.includes('V8')),
    },
    {
      reference: 'PIST-004',
      name: 'Aerodynamic Rear Spoiler',
      description: 'Downforce for days. Inspired by The King.',
      category: 'Body',
      brand: 'Piston Cup',
      price: 599.99,
      initialStock: 25,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) =>
          v.model.includes('Lightning') ||
          v.model.includes('King') ||
          v.model.includes('Chick'),
      ),
    },
    {
      reference: 'PIST-005',
      name: 'Racing Suspension Kit',
      description: 'Adjustable coilovers for the perfect setup.',
      category: 'Suspension',
      brand: 'Piston Cup',
      price: 1299.99,
      initialStock: 20,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) => v.engine?.includes('Racing') || v.engine?.includes('V8'),
      ),
    },
    {
      reference: 'PIST-006',
      name: 'Quick-Release Steering Wheel',
      description: 'Professional-grade racing steering wheel.',
      category: 'Interior',
      brand: 'Piston Cup',
      price: 349.99,
      initialStock: 40,
      compatibleVehicles: CARS_VEHICLES.filter(
        (v) => v.engine?.includes('Racing') || v.engine?.includes('F1'),
      ),
    },
    {
      reference: 'PIST-007',
      name: 'Racing Fuel Cell',
      description: 'Safety fuel cell for racing applications.',
      category: 'Fuel System',
      brand: 'Piston Cup',
      price: 799.99,
      initialStock: 15,
      compatibleVehicles: CARS_VEHICLES.filter((v) =>
        v.engine?.includes('Racing'),
      ),
    },
  ],
  'fillmore@organicfuel.com': [
    {
      reference: 'FILL-001',
      name: 'Organic Fuel Blend',
      description:
        'All natural, organic fuel. Good for you, good for the planet, man!',
      category: 'Fuel',
      brand: 'Fillmore Organic',
      price: 59.99,
      initialStock: 100,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'FILL-002',
      name: 'Bio-Diesel Premium',
      description:
        'Made from recycled vegetable oil. Peace and clean emissions.',
      category: 'Fuel',
      brand: 'Fillmore Organic',
      price: 69.99,
      initialStock: 80,
      compatibleVehicles: CARS_VEHICLES.filter((v) =>
        v.engine?.includes('Diesel'),
      ),
    },
    {
      reference: 'FILL-003',
      name: 'Eco-Friendly Coolant',
      description: 'Biodegradable coolant. No harmful chemicals.',
      category: 'Cooling',
      brand: 'Fillmore Organic',
      price: 34.99,
      initialStock: 150,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'FILL-004',
      name: 'Natural Lubricant',
      description: 'Plant-based lubricant. Works in harmony with nature.',
      category: 'Lubricants',
      brand: 'Fillmore Organic',
      price: 29.99,
      initialStock: 200,
      compatibleVehicles: CARS_VEHICLES,
    },
    {
      reference: 'FILL-005',
      name: 'Hemp Oil Additive',
      description: 'Natural engine treatment. Groovy performance boost.',
      category: 'Additives',
      brand: 'Fillmore Organic',
      price: 19.99,
      initialStock: 250,
      compatibleVehicles: CARS_VEHICLES,
    },
  ],
};

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedUsers(dataSource: DataSource): Promise<Map<string, string>> {
  const userRepository = dataSource.getRepository('users');
  const userIdMap = new Map<string, string>();

  console.log('\n📦 Seeding Users...');

  // Seed Garages
  for (const garage of GARAGES) {
    const existing = await userRepository.findOne({
      where: { email: garage.email },
    });
    if (existing) {
      console.log(`  ✓ Garage already exists: ${garage.companyName}`);
      userIdMap.set(garage.email, existing.id);
      continue;
    }

    const hashedPassword = await bcrypt.hash(garage.password, 10);
    const user = userRepository.create({
      id: uuidv4(),
      email: garage.email,
      passwordHash: hashedPassword,
      companyName: garage.companyName,
      role: 'GARAGE',
      isActive: true,
    });
    await userRepository.save(user);
    userIdMap.set(garage.email, user.id);
    console.log(`  ✓ Created garage: ${garage.companyName}`);
  }

  // Seed Suppliers
  for (const supplier of SUPPLIERS) {
    const existing = await userRepository.findOne({
      where: { email: supplier.email },
    });
    if (existing) {
      console.log(`  ✓ Supplier already exists: ${supplier.companyName}`);
      userIdMap.set(supplier.email, existing.id);
      continue;
    }

    const hashedPassword = await bcrypt.hash(supplier.password, 10);
    const user = userRepository.create({
      id: uuidv4(),
      email: supplier.email,
      passwordHash: hashedPassword,
      companyName: supplier.companyName,
      role: 'SUPPLIER',
      isActive: true,
    });
    await userRepository.save(user);
    userIdMap.set(supplier.email, user.id);
    console.log(`  ✓ Created supplier: ${supplier.companyName}`);
  }

  // Seed Admin
  const existingAdmin = await userRepository.findOne({
    where: { email: ADMIN.email },
  });
  if (existingAdmin) {
    console.log(`  ✓ Admin already exists: ${ADMIN.companyName}`);
    userIdMap.set(ADMIN.email, existingAdmin.id);
  } else {
    const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
    const admin = userRepository.create({
      id: uuidv4(),
      email: ADMIN.email,
      passwordHash: hashedPassword,
      companyName: ADMIN.companyName,
      role: 'ADMIN',
      isActive: true,
    });
    await userRepository.save(admin);
    userIdMap.set(ADMIN.email, admin.id);
    console.log(`  ✓ Created admin: ${ADMIN.companyName}`);
  }

  return userIdMap;
}

async function seedParts(
  dataSource: DataSource,
  userIdMap: Map<string, string>,
): Promise<
  Map<
    string,
    {
      id: string;
      supplierId: string;
      price: number;
      name: string;
      reference: string;
    }
  >
> {
  const partRepository = dataSource.getRepository('parts');
  const partMap = new Map<
    string,
    {
      id: string;
      supplierId: string;
      price: number;
      name: string;
      reference: string;
    }
  >();

  console.log('\n🔧 Seeding Parts...');

  for (const [supplierEmail, parts] of Object.entries(PARTS_BY_SUPPLIER)) {
    const supplierId = userIdMap.get(supplierEmail);
    if (!supplierId) {
      console.log(`  ⚠ Supplier not found: ${supplierEmail}`);
      continue;
    }

    for (const partData of parts) {
      const existing = await partRepository.findOne({
        where: { supplierId: supplierId, reference: partData.reference },
      });

      if (existing) {
        console.log(
          `  ✓ Part already exists: ${partData.reference} - ${partData.name}`,
        );
        partMap.set(partData.reference, {
          id: existing.id,
          supplierId,
          price: existing.priceInCents,
          name: existing.name,
          reference: existing.reference,
        });
        continue;
      }

      const part = partRepository.create({
        id: uuidv4(),
        supplierId: supplierId,
        reference: partData.reference,
        name: partData.name,
        description: partData.description,
        category: partData.category,
        brand: partData.brand,
        priceInCents: Math.round(partData.price * 100),
        currency: 'EUR',
        stockQuantity: partData.initialStock,
        stockReserved: 0,
        compatibleVehicles: partData.compatibleVehicles,
        isActive: true,
      });

      await partRepository.save(part);
      partMap.set(partData.reference, {
        id: part.id,
        supplierId,
        price: part.priceInCents,
        name: part.name,
        reference: part.reference,
      });
      console.log(`  ✓ Created part: ${partData.reference} - ${partData.name}`);
    }
  }

  return partMap;
}

async function seedOrders(
  dataSource: DataSource,
  userIdMap: Map<string, string>,
  partMap: Map<
    string,
    {
      id: string;
      supplierId: string;
      price: number;
      name: string;
      reference: string;
    }
  >,
): Promise<void> {
  const orderRepository = dataSource.getRepository('orders');
  const partRepository = dataSource.getRepository('parts');

  console.log('\n📋 Seeding Orders...');

  // Get user IDs
  const luigiId = userIdMap.get('luigi@casadellatires.com');
  const ramoneId = userIdMap.get('ramone@houseofbodyart.com');
  const docId = userIdMap.get('doc@hudsonracing.com');
  const floId = userIdMap.get('flo@v8cafe.com');
  const materId = userIdMap.get('mater@towmater.com');

  // Define orders with different statuses
  const ordersToCreate = [
    {
      garageId: luigiId!,
      garageName: "Luigi's Casa Della Tires",
      status: 'PENDING',
      notes: 'Need these tires ASAP for the racing season! - Luigi',
      parts: ['LIGHT-001', 'LIGHT-004', 'LIGHT-002'],
      quantities: [4, 4, 2],
    },
    {
      garageId: ramoneId!,
      garageName: "Ramone's House of Body Art",
      status: 'CONFIRMED',
      notes: 'Custom paint job supplies for Lightning McQueen makeover',
      parts: ['RUST-005', 'RUST-003', 'RUST-001'],
      quantities: [2, 5, 3],
    },
    {
      garageId: docId!,
      garageName: "Doc Hudson's Racing Clinic",
      status: 'SHIPPED',
      notes: 'Racing supplies for Piston Cup training',
      parts: ['PIST-001', 'PIST-002', 'PIST-005', 'DINO-002'],
      quantities: [2, 8, 1, 4],
    },
    {
      garageId: floId!,
      garageName: "Flo's V8 Cafe & Service",
      status: 'DELIVERED',
      notes: 'Monthly fuel and service supplies',
      parts: ['FILL-001', 'FILL-003', 'DINO-001', 'DINO-005'],
      quantities: [10, 5, 8, 4],
    },
    {
      garageId: materId!,
      garageName: "Mater's Towing & Salvage",
      status: 'CANCELLED',
      notes: 'Order cancelled - found parts in the junkyard!',
      cancelReason: 'Dad-gum! Found all these parts in my salvage yard. Sorry!',
      parts: ['LIGHT-003', 'RUST-004'],
      quantities: [2, 1],
    },
    // Additional orders to show more data
    {
      garageId: luigiId!,
      garageName: "Luigi's Casa Della Tires",
      status: 'DELIVERED',
      notes: 'Previous tire order - very satisfied!',
      parts: ['LIGHT-002', 'LIGHT-005'],
      quantities: [8, 4],
    },
    {
      garageId: docId!,
      garageName: "Doc Hudson's Racing Clinic",
      status: 'PENDING',
      notes: 'Urgent: Need exhaust system for vintage Hudson',
      parts: ['PIST-003', 'PIST-006'],
      quantities: [1, 1],
    },
  ];

  for (const orderData of ordersToCreate) {
    // Check if similar order exists (same garage, same status, similar total)
    const existingOrders = await orderRepository.find({
      where: { garageId: orderData.garageId, status: orderData.status },
    });

    if (existingOrders.length > 0) {
      console.log(
        `  ✓ Order already exists for ${orderData.garageName} (${orderData.status})`,
      );
      continue;
    }

    // Build order lines
    const lines = [];
    let totalInCents = 0;

    for (let i = 0; i < orderData.parts.length; i++) {
      const partRef = orderData.parts[i];
      const quantity = orderData.quantities[i];
      const partInfo = partMap.get(partRef);

      if (!partInfo) {
        console.log(`  ⚠ Part not found: ${partRef}`);
        continue;
      }

      const lineTotal = partInfo.price * quantity;
      totalInCents += lineTotal;

      lines.push({
        partId: partInfo.id,
        partName: partInfo.name,
        partReference: partInfo.reference,
        supplierId: partInfo.supplierId,
        quantity,
        unitPriceInCents: partInfo.price,
        currency: 'EUR',
      });

      // Reserve stock for non-cancelled orders
      if (orderData.status !== 'CANCELLED') {
        const part = await partRepository.findOne({
          where: { id: partInfo.id },
        });
        if (part) {
          // For DELIVERED orders, reduce actual stock; for others, increase reserved
          if (orderData.status === 'DELIVERED') {
            part.stockQuantity = Math.max(0, part.stockQuantity - quantity);
          } else {
            part.stockReserved = (part.stockReserved || 0) + quantity;
          }
          await partRepository.save(part);
        }
      }
    }

    if (lines.length === 0) {
      console.log(`  ⚠ No valid lines for order, skipping`);
      continue;
    }

    const order = orderRepository.create({
      id: uuidv4(),
      garageId: orderData.garageId,
      garageName: orderData.garageName,
      lines,
      status: orderData.status,
      totalInCents: totalInCents,
      currency: 'EUR',
      notes: orderData.notes,
      cancelReason: orderData.cancelReason || null,
    });

    await orderRepository.save(order);
    console.log(
      `  ✓ Created order: ${orderData.garageName} - ${orderData.status} (${(totalInCents / 100).toFixed(2)}€)`,
    );
  }
}

async function seedMongoReadModels(
  app: any,
  userIdMap: Map<string, string>,
  dataSource: DataSource,
): Promise<void> {
  console.log('\n📚 Seeding MongoDB Read Models...');

  // Get MongoDB models using the class names
  const UserReadModel: Model<UserRead> = app.get(getModelToken(UserRead.name));
  const PartReadModel: Model<PartRead> = app.get(getModelToken(PartRead.name));
  const OrderReadModel: Model<OrderRead> = app.get(
    getModelToken(OrderRead.name),
  );

  // Get data from PostgreSQL
  const userRepository = dataSource.getRepository('users');
  const partRepository = dataSource.getRepository('parts');
  const orderRepository = dataSource.getRepository('orders');

  // Seed User Read Models
  const users = await userRepository.find();
  for (const user of users) {
    const existing = await UserReadModel.findOne({ userId: user.id });
    if (existing) {
      console.log(`  ✓ User read model exists: ${user.email}`);
      continue;
    }

    // Count orders for garages, parts for suppliers
    const orderCount =
      user.role === 'GARAGE'
        ? await orderRepository.count({ where: { garageId: user.id } })
        : 0;
    const partCount =
      user.role === 'SUPPLIER'
        ? await partRepository.count({ where: { supplierId: user.id } })
        : 0;

    await UserReadModel.create({
      userId: user.id,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
      isActive: user.isActive,
      totalOrders: orderCount,
      totalParts: partCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    console.log(`  ✓ Created user read model: ${user.email}`);
  }

  // Seed Part Read Models
  const parts = await partRepository.find();
  for (const part of parts) {
    const existing = await PartReadModel.findOne({ partId: part.id });
    if (existing) {
      console.log(`  ✓ Part read model exists: ${part.reference}`);
      continue;
    }

    const supplier = await userRepository.findOne({
      where: { id: part.supplierId },
    });
    const priceInEuros = part.priceInCents / 100;
    const available = part.stockQuantity - (part.stockReserved || 0);

    await PartReadModel.create({
      partId: part.id,
      supplier: {
        id: part.supplierId,
        name: supplier?.companyName || 'Unknown',
      },
      reference: part.reference,
      name: part.name,
      description: part.description,
      category: part.category,
      brand: part.brand,
      priceInCents: part.priceInCents,
      price: priceInEuros,
      priceFormatted: `${priceInEuros.toFixed(2)} €`,
      currency: part.currency,
      stock: {
        quantity: part.stockQuantity,
        reserved: part.stockReserved || 0,
        available,
        isLow: available <= 5,
        isOutOfStock: available <= 0,
      },
      compatibleVehicles: (part.compatibleVehicles || []).map((v: any) => ({
        ...v,
        searchText:
          `${v.brand} ${v.model} ${v.yearFrom}-${v.yearTo} ${v.engine || ''}`.trim(),
      })),
      vehiclesSearchText: (part.compatibleVehicles || [])
        .map((v: any) => `${v.brand} ${v.model} ${v.engine || ''}`)
        .join(' '),
      isActive: part.isActive,
      orderCount: 0,
      createdAt: part.createdAt,
      updatedAt: part.updatedAt,
    });
    console.log(`  ✓ Created part read model: ${part.reference}`);
  }

  // Seed Order Read Models
  const orders = await orderRepository.find();
  for (const order of orders) {
    const existing = await OrderReadModel.findOne({ orderId: order.id });
    if (existing) {
      console.log(
        `  ✓ Order read model exists: ${order.id.substring(0, 8)}...`,
      );
      continue;
    }

    const supplierIds = [
      ...new Set((order.lines || []).map((l: any) => l.supplierId)),
    ];
    const totalInEuros = order.totalInCents / 100;

    // Enrich lines with supplier names
    const enrichedLines = await Promise.all(
      (order.lines || []).map(async (line: any) => {
        const supplier = await userRepository.findOne({
          where: { id: line.supplierId },
        });
        const unitPrice = line.unitPriceInCents / 100;
        const total = unitPrice * line.quantity;
        return {
          ...line,
          supplierName: supplier?.companyName || 'Unknown',
          unitPrice,
          total,
          totalInCents: line.unitPriceInCents * line.quantity,
          totalFormatted: `${total.toFixed(2)} €`,
        };
      }),
    );

    await OrderReadModel.create({
      orderId: order.id,
      garage: {
        id: order.garageId,
        name: order.garageName,
      },
      lines: enrichedLines,
      supplierIds,
      status: order.status,
      totalInCents: order.totalInCents,
      total: totalInEuros,
      totalFormatted: `${totalInEuros.toFixed(2)} €`,
      currency: order.currency,
      notes: order.notes,
      cancelReason: order.cancelReason,
      statusHistory: [
        {
          status: order.status,
          changedAt: order.createdAt,
          changedBy: order.garageId,
        },
      ],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
    console.log(
      `  ✓ Created order read model: ${order.garageName} - ${order.status}`,
    );
  }
}

async function seedNeo4jGraph(app: any, dataSource: DataSource): Promise<void> {
  console.log('\n🔗 Seeding Neo4j Graph...');

  try {
    // Get Neo4j service
    const neo4jService = app.get(Neo4jService);
    if (!neo4jService) {
      console.log('  ⚠ Neo4j service not available, skipping graph seeding');
      return;
    }

    // Get data from PostgreSQL
    const userRepository = dataSource.getRepository('users');
    const partRepository = dataSource.getRepository('parts');
    const orderRepository = dataSource.getRepository('orders');

    const users = await userRepository.find();
    const parts = await partRepository.find();
    const orders = await orderRepository.find();

    // Create constraints (idempotent) - Neo4j 4.x syntax
    try {
      await neo4jService.write(
        `CREATE CONSTRAINT garage_id IF NOT EXISTS FOR (g:Garage) REQUIRE g.id IS UNIQUE`,
      );
      await neo4jService.write(
        `CREATE CONSTRAINT supplier_id IF NOT EXISTS FOR (s:Supplier) REQUIRE s.id IS UNIQUE`,
      );
      await neo4jService.write(
        `CREATE CONSTRAINT part_id IF NOT EXISTS FOR (p:Part) REQUIRE p.id IS UNIQUE`,
      );
      await neo4jService.write(
        `CREATE CONSTRAINT vehicle_id IF NOT EXISTS FOR (v:Vehicle) REQUIRE v.id IS UNIQUE`,
      );
      console.log('  ✓ Created Neo4j constraints');
    } catch (e) {
      // Constraints might already exist or syntax differs by Neo4j version
      console.log('  ⚠ Constraints may already exist, continuing...');
    }

    // Create Garage and Supplier nodes
    for (const user of users) {
      if (user.role === 'GARAGE') {
        await neo4jService.write(
          `MERGE (g:Garage {id: $id})
           SET g.name = $name, g.email = $email`,
          { id: user.id, name: user.companyName, email: user.email },
        );
      } else if (user.role === 'SUPPLIER') {
        await neo4jService.write(
          `MERGE (s:Supplier {id: $id})
           SET s.name = $name, s.email = $email`,
          { id: user.id, name: user.companyName, email: user.email },
        );
      }
    }
    console.log('  ✓ Created Garage and Supplier nodes');

    // Create Part nodes and SUPPLIES relationships
    for (const part of parts) {
      await neo4jService.write(
        `MERGE (p:Part {id: $id})
         SET p.reference = $reference, p.name = $name, p.category = $category, p.brand = $brand, p.price = $price`,
        {
          id: part.id,
          reference: part.reference,
          name: part.name,
          category: part.category,
          brand: part.brand,
          price: part.priceInCents / 100,
        },
      );

      // Create SUPPLIES relationship
      await neo4jService.write(
        `MATCH (s:Supplier {id: $supplierId}), (p:Part {id: $partId})
         MERGE (s)-[:SUPPLIES]->(p)`,
        { supplierId: part.supplierId, partId: part.id },
      );

      // Create Vehicle nodes and COMPATIBLE_WITH relationships
      for (const vehicle of part.compatibleVehicles || []) {
        const vehicleId = `${vehicle.brand}-${vehicle.model}`
          .toLowerCase()
          .replace(/\s+/g, '-');
        await neo4jService.write(
          `MERGE (v:Vehicle {id: $id})
           SET v.brand = $brand, v.model = $model, v.yearFrom = $yearFrom, v.yearTo = $yearTo`,
          {
            id: vehicleId,
            brand: vehicle.brand,
            model: vehicle.model,
            yearFrom: vehicle.yearFrom,
            yearTo: vehicle.yearTo,
          },
        );

        await neo4jService.write(
          `MATCH (p:Part {id: $partId}), (v:Vehicle {id: $vehicleId})
           MERGE (p)-[:COMPATIBLE_WITH]->(v)`,
          { partId: part.id, vehicleId },
        );
      }
    }
    console.log('  ✓ Created Part and Vehicle nodes with relationships');

    // Create ORDERED relationships
    for (const order of orders) {
      if (order.status === 'CANCELLED') continue;

      for (const line of order.lines || []) {
        await neo4jService.write(
          `MATCH (g:Garage {id: $garageId}), (p:Part {id: $partId})
           MERGE (g)-[r:ORDERED]->(p)
           SET r.quantity = COALESCE(r.quantity, 0) + $quantity,
               r.lastOrderedAt = datetime()`,
          {
            garageId: order.garageId,
            partId: line.partId,
            quantity: line.quantity,
          },
        );
      }
    }
    console.log('  ✓ Created ORDERED relationships');
  } catch (error) {
    console.log(`  ⚠ Neo4j seeding failed: ${(error as Error).message}`);
    console.log('  Continuing without Neo4j data...');
  }
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

async function main() {
  console.log('🚗 Cars-Inspired Test Data Seed Script');
  console.log('=====================================');
  console.log('Creating test data for B2B AutoParts Platform\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get TypeORM DataSource
    const dataSource = app.get(DataSource);

    // Seed PostgreSQL
    const userIdMap = await seedUsers(dataSource);
    const partMap = await seedParts(dataSource, userIdMap);
    await seedOrders(dataSource, userIdMap, partMap);

    // Seed MongoDB Read Models
    await seedMongoReadModels(app, userIdMap, dataSource);

    // Seed Neo4j Graph
    await seedNeo4jGraph(app, dataSource);

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Garages: ${GARAGES.length}`);
    console.log(`  - Suppliers: ${SUPPLIERS.length}`);
    console.log(`  - Admin: 1`);
    console.log(`  - Parts: ${Object.values(PARTS_BY_SUPPLIER).flat().length}`);
    console.log(`  - Orders: 7 (various statuses)`);

    console.log('\n🔐 Test Credentials:');
    console.log('  Garages:');
    GARAGES.forEach((g) => console.log(`    - ${g.email} / ${g.password}`));
    console.log('  Suppliers:');
    SUPPLIERS.forEach((s) => console.log(`    - ${s.email} / ${s.password}`));
    console.log('  Admin:');
    console.log(`    - ${ADMIN.email} / ${ADMIN.password}`);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
