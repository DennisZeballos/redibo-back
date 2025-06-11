import { PrismaClient, Transmision, Combustible, RegistradoCon } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash('password123', 10);

  // Crear ubicaciones para autos
  const ubicacion1 = await prisma.ubicacion.upsert({
    where: { nombre: 'Ubicacion Central' },
    update: {},
    create: {
      nombre: 'Ubicacion Central',
      departamento: 'Cochabamba',
      descripcion: 'Ubicacion principal de autos',
      latitud: -12.0464,
      longitud: -77.0428,
      esActiva: true,
    },
  });

  const ubicacion2 = await prisma.ubicacion.upsert({
    where: { nombre: 'Ubicacion Norte' },
    update: {},
    create: {
      nombre: 'Ubicacion Norte',
      departamento: 'Santa Cruz',
      descripcion: 'Ubicacion secundaria de autos',
      latitud: -11.995,
      longitud: -77.062,
      esActiva: true,
    },
  });

  const ubicacion3 = await prisma.ubicacion.upsert({
    where: { nombre: 'Ubicacion Sur' },
    update: {},
    create: {
      nombre: 'Ubicacion Sur',
      departamento: 'La Paz',
      descripcion: 'Ubicacion adicional en La Paz',
      latitud: -16.5000,
      longitud: -68.1500,
      esActiva: true,
    },
  });

  // Crear hosts
  const host1 = await prisma.usuario.upsert({
    where: { email: 'host1@gmail.com' },
    update: {},
    create: {
      nombreCompleto: 'Eduardo Paredes Rosales',
      email: 'host1@gmail.com',
      contraseña: hashedPassword,
      registradoCon: RegistradoCon.email,
      verificado: true,
      host: true,
      fechaRegistro: new Date(),
    },
  });

  const host2 = await prisma.usuario.upsert({
    where: { email: 'host2@gmail.com' },
    update: {},
    create: {
      nombreCompleto: 'Juan Garcia Palacios',
      email: 'host2@gmail.com',
      contraseña: hashedPassword,
      registradoCon: RegistradoCon.email,
      verificado: true,
      host: true,
      fechaRegistro: new Date(),
    },
  });

  // Crear usuarios normales
  const guest1 = await prisma.usuario.upsert({
    where: { email: 'guest1@gmail.com' },
    update: {},
    create: {
      nombreCompleto: 'Lorena Barrientos',
      email: 'guest1@gmail.com',
      contraseña: hashedPassword,
      registradoCon: RegistradoCon.email,
      verificado: true,
      host: false,
      fechaRegistro: new Date(),
    },
  });

  const guest2 = await prisma.usuario.upsert({
    where: { email: 'guest2@gmail.com' },
    update: {},
    create: {
      nombreCompleto: 'Carla Copa Hernandez',
      email: 'guest2@gmail.com',
      contraseña: hashedPassword,
      registradoCon: RegistradoCon.email,
      verificado: true,
      host: false,
      fechaRegistro: new Date(),
    },
  });

  // Autos para host1
  await prisma.auto.createMany({
    data: [
      {
        idPropietario: host1.idUsuario,
        idUbicacion: ubicacion1.idUbicacion,
        marca: 'Toyota',
        modelo: 'Corolla',
        descripcion: 'Auto cómodo y económico',
        precioRentaDiario: 50.0,
        montoGarantia: 200.0,
        kilometraje: 15000,
        tipo: 'Sedan',
        año: 2018,
        placa: 'ABC-123',
        soat: 'SOAT-123',
        color: 'Blanco',
        estado: 'ACTIVO',
        asientos: 5,
        capacidadMaletero: 400,
        transmision: Transmision.AUTOMATICO,
        combustible: Combustible.GASOLINA,
      },
      {
        idPropietario: host1.idUsuario,
        idUbicacion: ubicacion2.idUbicacion,
        marca: 'Honda',
        modelo: 'Civic',
        descripcion: 'Auto deportivo y elegante',
        precioRentaDiario: 70.0,
        montoGarantia: 250.0,
        kilometraje: 12000,
        tipo: 'Sedan',
        año: 2020,
        placa: 'DEF-456',
        soat: 'SOAT-456',
        color: 'Negro',
        estado: 'ACTIVO',
        asientos: 5,
        capacidadMaletero: 420,
        transmision: Transmision.MANUAL,
        combustible: Combustible.GASOLINA,
      },
      {
        idPropietario: host1.idUsuario,
        idUbicacion: ubicacion3.idUbicacion,
        marca: 'Chevrolet',
        modelo: 'Spark',
        descripcion: 'Compacto ideal para la ciudad',
        precioRentaDiario: 40.0,
        montoGarantia: 150.0,
        kilometraje: 10000,
        tipo: 'Hatchback',
        año: 2017,
        placa: 'LPZ-321',
        soat: 'SOAT-321',
        color: 'Gris',
        estado: 'ACTIVO',
        asientos: 4,
        capacidadMaletero: 300,
        transmision: Transmision.MANUAL,
        combustible: Combustible.GASOLINA,
      },
    ],
  });

  // Autos para host2
  await prisma.auto.createMany({
    data: [
      {
        idPropietario: host2.idUsuario,
        idUbicacion: ubicacion1.idUbicacion,
        marca: 'Tesla',
        modelo: 'Model 3',
        descripcion: 'Auto eléctrico moderno',
        precioRentaDiario: 120.0,
        montoGarantia: 500.0,
        kilometraje: 8000,
        tipo: 'Sedan',
        año: 2022,
        placa: 'GHI-789',
        soat: 'SOAT-789',
        color: 'Rojo',
        estado: 'ACTIVO',
        asientos: 5,
        capacidadMaletero: 350,
        transmision: Transmision.AUTOMATICO,
        combustible: Combustible.ELECTRICO,
      },
      {
        idPropietario: host2.idUsuario,
        idUbicacion: ubicacion2.idUbicacion,
        marca: 'Ford',
        modelo: 'F-150',
        descripcion: 'Camioneta robusta y espaciosa',
        precioRentaDiario: 90.0,
        montoGarantia: 300.0,
        kilometraje: 20000,
        tipo: 'Pickup',
        año: 2019,
        placa: 'JKL-012',
        soat: 'SOAT-012',
        color: 'Azul',
        estado: 'ACTIVO',
        asientos: 5,
        capacidadMaletero: 800,
        transmision: Transmision.MANUAL,
        combustible: Combustible.DIESEL,
      },
      {
        idPropietario: host2.idUsuario,
        idUbicacion: ubicacion3.idUbicacion,
        marca: 'Nissan',
        modelo: 'X-Trail',
        descripcion: 'SUV versátil para todo terreno',
        precioRentaDiario: 85.0,
        montoGarantia: 350.0,
        kilometraje: 18000,
        tipo: 'SUV',
        año: 2021,
        placa: 'LPZ-654',
        soat: 'SOAT-654',
        color: 'Verde',
        estado: 'ACTIVO',
        asientos: 5,
        capacidadMaletero: 500,
        transmision: Transmision.AUTOMATICO,
        combustible: Combustible.GASOLINA,
      },
    ],
  });

  console.log('Seed completado!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
