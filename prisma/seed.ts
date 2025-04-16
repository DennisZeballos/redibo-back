import { PrismaClient } from '../src/generated/client'; // Actualiza la importación
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await hash('password123', 10);

  // Crear usuarios
  const host1 = await prisma.user.upsert({
    where: { email: 'host1@example.com' },
    update: {},
    create: {
      email: 'host1@example.com',
      password,
      role: 'host',
    },
  });

  const host2 = await prisma.user.upsert({
    where: { email: 'host2@example.com' },
    update: {},
    create: {
      email: 'host2@example.com',
      password,
      role: 'host',
    },
  });

  const guest1 = await prisma.user.upsert({
    where: { email: 'guest1@example.com' },
    update: {},
    create: {
      email: 'guest1@example.com',
      password,
      role: 'guest',
    },
  });

  const guest2 = await prisma.user.upsert({
    where: { email: 'guest2@example.com' },
    update: {},
    create: {
      email: 'guest2@example.com',
      password,
      role: 'guest',
    },
  });

  // Crear autos
  await prisma.car.createMany({
    data: [
      {
        userId: host1.id,
        location: 'Santa Cruz',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        carType: 'Mediano',
        color: 'Blanco',
        pricePerDay: 90,
        kilometers: '35000',
        licensePlate: 'ABC-123',
        transmission: 'Automático',
        fuelType: 'Gasolina',
        seats: 5,
        description: 'Un auto confiable para la ciudad.',
        photos: [
          'https://example.com/toyota-corolla-1.jpg',
          'https://example.com/toyota-corolla-2.jpg',
          'https://example.com/toyota-corolla-3.jpg',
        ],
        rentalCount: 10,
        rating: 4.9,
        discount: 10,
      },
      {
        userId: host1.id,
        location: 'Santa Cruz',
        brand: 'Citroën',
        model: 'C3',
        year: 2020,
        carType: 'Grande',
        color: 'Negro',
        pricePerDay: 85,
        kilometers: '45000',
        licensePlate: 'DEF-456',
        transmission: 'Manual',
        fuelType: 'Gas',
        seats: 5,
        description: 'Ideal para viajes largos.',
        photos: [
          'https://example.com/citroen-c3-1.jpg',
          'https://example.com/citroen-c3-2.jpg',
          'https://example.com/citroen-c3-3.jpg',
        ],
        rentalCount: 6,
        rating: 4.7,
        discount: 8,
      },
      {
        userId: host1.id,
        location: 'Santa Cruz',
        brand: 'Toyota',
        model: 'Yaris',
        year: 2023,
        carType: 'Mediano',
        color: 'Rojo',
        pricePerDay: 88,
        kilometers: '20000',
        licensePlate: 'GHI-789',
        transmission: 'Automático',
        fuelType: 'Gasolina',
        seats: 4,
        description: 'Compacto y eficiente.',
        photos: [
          'https://example.com/toyota-yaris-1.jpg',
          'https://example.com/toyota-yaris-2.jpg',
          'https://example.com/toyota-yaris-3.jpg',
        ],
        rentalCount: 4,
        rating: 4.6,
        discount: 6,
      },
      {
        userId: host1.id,
        location: 'Santa Cruz',
        brand: 'Kia',
        model: 'Rio',
        year: 2021,
        carType: 'Mediano',
        color: 'Blanco',
        pricePerDay: 80,
        kilometers: '30000',
        licensePlate: 'JKL-012',
        transmission: 'Manual',
        fuelType: 'Gasolina',
        seats: 5,
        description: 'Perfecto para la ciudad.',
        photos: [
          'https://example.com/kia-rio-1.jpg',
          'https://example.com/kia-rio-2.jpg',
          'https://example.com/kia-rio-3.jpg',
        ],
        rentalCount: 7,
        rating: 4.5,
        discount: 5,
      },
      {
        userId: host2.id,
        location: 'Santa Cruz',
        brand: 'Kia',
        model: 'Cerato',
        year: 2019,
        carType: 'Grande',
        color: 'Gris',
        pricePerDay: 95,
        kilometers: '50000',
        licensePlate: 'MNO-345',
        transmission: 'Automático',
        fuelType: 'Gas',
        seats: 5,
        description: 'Espacioso y cómodo.',
        photos: [
          'https://example.com/kia-cerato-1.jpg',
          'https://example.com/kia-cerato-2.jpg',
          'https://example.com/kia-cerato-3.jpg',
        ],
        rentalCount: 5,
        rating: 4.8,
        discount: 7,
      },
      {
        userId: host2.id,
        location: 'Santa Cruz',
        brand: 'Hyundai',
        model: 'Tucson',
        year: 2022,
        carType: 'SUV',
        color: 'Negro',
        pricePerDay: 99,
        kilometers: '25000',
        licensePlate: 'PQR-678',
        transmission: 'Automático',
        fuelType: 'Gasolina',
        seats: 5,
        description: 'Ideal para aventuras.',
        photos: [
          'https://example.com/hyundai-tucson-1.jpg',
          'https://example.com/hyundai-tucson-2.jpg',
          'https://example.com/hyundai-tucson-3.jpg',
        ],
        rentalCount: 3,
        rating: 4.1,
        discount: 9,
      },
    ],
  });

  // Crear algunas rentas para probar la disponibilidad
  await prisma.rental.createMany({
    data: [
      {
        carId: 1, // Toyota Corolla
        userId: guest1.id,
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-04-05'),
      },
      {
        carId: 2, // Citroën C3
        userId: guest2.id,
        startDate: new Date('2025-04-10'),
        endDate: new Date('2025-04-15'),
      },
    ],
  });

  console.log('Base de datos poblada con datos de prueba.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });