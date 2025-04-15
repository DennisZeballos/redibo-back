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
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });
    console.log(`Creado usuario: ${user.email}`);
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