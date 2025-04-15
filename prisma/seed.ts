import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'host1@example.com', password: 'password123', role: 'host' },
    { email: 'host2@example.com', password: 'password123', role: 'host' },
    { email: 'guest1@example.com', password: 'password123', role: 'guest' },
    { email: 'guest2@example.com', password: 'password123', role: 'guest' },
  ];

  for (const user of users) {
    const hashedPassword = await bcryptjs.hash(user.password, 10);
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });
    console.log(`Creado usuario: ${user.email}`);

    if (user.email === 'host1@example.com') {
      await prisma.car.createMany({
        data: [
          {
            userId: createdUser.id,
            location: 'Ciudad de México',
            brand: 'Toyota',
            model: 'Corolla',
            year: 2020,
            carType: 'Sedan',
            color: 'Blanco',
            pricePerDay: 50.0,
            kilometers: '50000',
            licensePlate: 'ABC123',
            transmission: 'Automático',
            fuelType: 'Gasolina',
            seats: 5,
            description: 'Auto en excelentes condiciones',
            photos: ['/uploads/toyota1.jpg', '/uploads/toyota2.jpg', '/uploads/toyota3.jpg'],
          },
          {
            userId: createdUser.id,
            location: 'Guadalajara',
            brand: 'Honda',
            model: 'Civic',
            year: 2019,
            carType: 'Sedan',
            color: 'Negro',
            pricePerDay: 45.0,
            kilometers: '60000',
            licensePlate: 'XYZ789',
            transmission: 'Manual',
            fuelType: 'Gasolina',
            seats: 5,
            description: 'Auto confiable y económico',
            photos: ['/uploads/honda1.jpg', '/uploads/honda2.jpg', '/uploads/honda3.jpg'],
          },
        ],
        skipDuplicates: true,
      });
      console.log(`Creados autos para ${user.email}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });