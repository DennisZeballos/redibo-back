import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  await prisma.user.create({
    data: {
      email: 'host@example.com',
      password: hashedPassword,
      name: 'Host User',
      role: 'host',
      cars: {
        create: [
          {
            brand: 'Toyota',
            model: 'Corolla',
            year: 2020,
            seats: 5,
            transmission: 'automática',
            category: 'sedán',
            color: 'azul',
            pricePerDay: 50.0,
            imageUrl: 'https://example.com/toyota-corolla.jpg',
            isAvailable: true,
          },
          {
            brand: 'Honda',
            model: 'Civic',
            year: 2019,
            seats: 5,
            transmission: 'manual',
            category: 'sedán',
            color: 'rojo',
            pricePerDay: 45.0,
            imageUrl: 'https://example.com/honda-civic.jpg',
            isAvailable: false,
          },
          {
            brand: 'Ford',
            model: 'Explorer',
            year: 2021,
            seats: 7,
            transmission: 'automática',
            category: 'SUV',
            color: 'negro',
            pricePerDay: 70.0,
            imageUrl: 'https://example.com/ford-explorer.jpg',
            isAvailable: true,
          },
          {
            brand: 'Chevrolet',
            model: 'Spark',
            year: 2018,
            seats: 4,
            transmission: 'manual',
            category: 'compacto',
            color: 'blanco',
            pricePerDay: 30.0,
            imageUrl: 'https://example.com/chevrolet-spark.jpg',
            isAvailable: true,
          },
          {
            brand: 'Hyundai',
            model: 'Tucson',
            year: 2022,
            seats: 5,
            transmission: 'automática',
            category: 'SUV',
            color: 'gris',
            pricePerDay: 65.0,
            imageUrl: 'https://example.com/hyundai-tucson.jpg',
            isAvailable: false,
          },
        ],
      },
    },
  });

  console.log('Datos de prueba insertados');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });