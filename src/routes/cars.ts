import * as express from 'express';
import { PrismaClient, Prisma, Transmision, Combustible } from '../generated/client';
import fileUpload from 'express-fileupload';
import { UploadedFile } from 'express-fileupload';
import * as path from 'path';
import { AuthRequest, authenticateToken, isHost } from '../middlewares/auth';

const router = express.Router();
const db = new PrismaClient();

interface AutoRequestBody { // corregir en el otro luagar donde se usa esto
  idPropietario: number;        // idUsuario del propietario
  idUbicacion: number;          // idUbicacion de la ubicación (relación)

  marca: string;
  modelo: string;
  descripcion?: string;

  precioRentaDiario: string;    // usar string para recibir y luego parsear a Decimal
  montoGarantia: string;        // garantía

  kilometraje: number;

  tipo: string;                 // tipo de auto (SUV, sedan, etc)
  año: number;
  placa: string;

  soat: string;                 // número o referencia de SOAT
  color: string;

  estado?: 'ACTIVO' | 'INACTIVO' | 'OTRO'; // o el enum que uses en TS

  fechaAdquisicion?: string;    // fecha en formato ISO o Date (según tu manejo)

  asientos?: number;
  capacidadMaletero?: number;

  transmision: 'AUTOMATICO' | 'MANUAL' | string;  // o el enum correspondiente
  combustible: 'GASOLINA' | 'DIESEL' | 'ELECTRICO' | 'HIBRIDO' | string; // según enum

  diasTotalRenta?: number;
  vecesAlquilado?: number;

  // Otros campos relacionales que usualmente no se envían en request body:
  // comentarios?: Comentario[];
  // calificacionPromedio?: number;
  // totalComentarios?: number;
  // reservas?: Reserva[];
  // disponibilidad?: Disponibilidad[];
  // historialMantenimiento?: HistorialMantenimiento[];
  // imagenes?: Imagen[];
}


interface UploadedPhoto extends UploadedFile {
  mv(path: string): Promise<void>;
}

router.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    createParentPath: true,
    safeFileNames: true,
    useTempFiles: true,
    tempFileDir: './tmp',
  })
);


// GET /api/cars - Listar autos con filtros, búsqueda y ordenamiento
// GET /api/cars - Listar autos con filtros, búsqueda y ordenamiento
router.get('/', async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const {
      location,
      startDate,
      endDate,
      hostId,
      carType,
      transmission,
      fuelType,
      minPrice,
      maxPrice,
      sortBy = 'relevance',
      page = '1',
      search,
    } = req.query;

    const pageNumber = parseInt(page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (pageNumber - 1) * limit;

    const where: Prisma.AutoWhereInput = {};

    if (location) {
      where.ubicacion = {
        departamento: {
          contains: location as string,
          mode: 'insensitive',
        },
      };
    }


    if (hostId) {
      where.idPropietario = parseInt(hostId as string);
    }

    if (carType) {
      where.tipo = { equals: carType as string };
    }

    if (transmission) {
      where.transmision = {
        equals: transmission as Transmision
      };

    }

    if (fuelType) {
      where.combustible = { equals: fuelType as Combustible };
    }

    if (req.query.capacidad) {
      const capacidad = req.query.capacidad as string;
      if (capacidad === '1 a 2 personas') {
        where.asientos = { lte: 2 };
      } else if (capacidad === '3 a 5 personas') {
        where.asientos = { gte: 3, lte: 5 };
      } else if (capacidad === '6 o más') {
        where.asientos = { gte: 6 };
      }
    }

    if (req.query.color) {
      where.color = { equals: req.query.color as string, mode: 'insensitive' };
    }

    if (req.query.kilometrajes) {
      const km = req.query.kilometrajes as string;

      if (km === '0 – 10.000 km') {
        where.kilometraje = { lte: 10000 };
      } else if (km === '10.000 – 50.000 km') {
        where.kilometraje = { gte: 10000, lte: 50000 };
      } else if (km === 'más de 50.000 km') {
        where.kilometraje = { gte: 50000 };
      }

    }

    if (minPrice || maxPrice) {
      where.precioRentaDiario = {};
      if (minPrice) {
        where.precioRentaDiario.gte = parseFloat(minPrice as string);
      }
      if (maxPrice) {
        where.precioRentaDiario.lte = parseFloat(maxPrice as string);
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      where.NOT = {
        reservas: {
          some: {
            AND: [
              { fechaInicio: { lte: end } },
              { fechaFin: { gte: start } },
            ],
          },
        },
      };
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      const [firstWord, ...restWords] = searchTerm.split(" ");
      const secondPart = restWords.join(" ");

      where.OR = [
        { marca: { contains: searchTerm, mode: 'insensitive' } },
        { modelo: { contains: searchTerm, mode: 'insensitive' } },
        { descripcion: { contains: searchTerm, mode: 'insensitive' } },
        { tipo: { contains: searchTerm, mode: 'insensitive' } },
        { transmision: { equals: searchTerm as Transmision } },
        { combustible: { equals: searchTerm as Combustible } },

        {
          AND: [
            { marca: { contains: firstWord, mode: 'insensitive' } },
            { modelo: { contains: secondPart, mode: 'insensitive' } },
          ],
        },
      ];
    }

    let orderBy: Prisma.AutoOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'priceAsc':
        orderBy = { precioRentaDiario: 'asc' };
        break;
      case 'priceDesc':
        orderBy = { precioRentaDiario: 'desc' };
        break;
      case 'relevance':
      default:
        // Si no tienes creadoEn, usa id (o algún otro campo)
        orderBy = { idAuto: 'desc' };
        break;
    }


    const totalAutos = await db.auto.count({ where });

    const autos = await db.auto.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        idAuto: true,
        marca: true,
        modelo: true,
        año: true,
        tipo: true,
        precioRentaDiario: true,
        ubicacion: true,
        imagenes: true,
        propietario: {
          select: {
            idUsuario: true,
            email: true,
          },
        },
        disponibilidad: true,
        asientos: true,
        transmision: true,
        color: true,
      },
    });

    const totalPages = Math.ceil(totalAutos / limit);

    res.status(200).json({
      cars: autos.map((auto) => ({
        id: auto.idAuto,
        brand: auto.marca,
        model: auto.modelo,
        year: auto.año,
        category: auto.tipo,
        pricePerDay: auto.precioRentaDiario,
        location: auto.ubicacion,
        imageUrl: auto.imagenes.map((img) => img.direccionImagen),
        host: {
          id: auto.propietario.idUsuario,
          email: auto.propietario.email,
        },
        seats: auto.asientos,
        transmission: auto.transmision,
        color: auto.color,
      })),
      totalCars: totalAutos,
      currentPage: pageNumber,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});








router.get('/my-cars', authenticateToken, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const { brand, model, carType, transmission, sortBy } = req.query;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AutoWhereInput = { idPropietario: userId };

    if (brand) {
      where.marca = { contains: brand as string, mode: 'insensitive' };
    }
    if (model) {
      where.modelo = { contains: model as string, mode: 'insensitive' };
    }
    if (carType) {
      where.tipo = { equals: carType as string };
    }
    if (transmission) {
      where.transmision = { equals: transmission as Transmision };
    }

    let orderBy: Prisma.AutoOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'priceAsc':
        orderBy = { precioRentaDiario: 'asc' };
        break;
      case 'priceDesc':
        orderBy = { precioRentaDiario: 'desc' };
        break;
      case 'rentalCount':
        orderBy = { vecesAlquilado: 'desc' };
        break;
      case 'yearAsc':
        orderBy = { año: 'asc' };
        break;
      case 'yearDesc':
        orderBy = { año: 'desc' };
        break;
      default:
        orderBy = { idAuto: 'desc' };
        break;
    }

    const totalCars = await db.auto.count({ where });
    const cars = await db.auto.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        idAuto: true,
        marca: true,
        modelo: true,
        año: true,
        tipo: true,
        color: true,
        precioRentaDiario: true,
        asientos: true,
        transmision: true,
        imagenes: true,
        vecesAlquilado: true,
        estaDisponible: true
      },
    });

    const totalPages = Math.ceil(totalCars / limit);

    res.status(200).json({
      cars: cars.map((car) => ({
        id: car.idAuto,
        brand: car.marca,
        model: car.modelo,
        year: car.año,
        category: car.tipo,
        pricePerDay: car.precioRentaDiario,
        seats: car.asientos,
        transmission: car.transmision,
        color: car.color,
        imageUrl: car.imagenes.map((img) => img.direccionImagen),
        rentalCount: car.vecesAlquilado,
        isAvailable: car.estaDisponible
      })),
      totalCars,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});






// GET /api/autos/:id - Obtener detalles de un auto (solo propietario)
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const autoId = parseInt(req.params.id);

    const auto = await db.auto.findUnique({
      where: { idAuto: autoId },
      select: {
        idAuto: true,
        idPropietario: true, // 👈 importante para verificar propiedad
        marca: true,
        modelo: true,
        año: true,
        tipo: true,
        color: true,
        precioRentaDiario: true,
        asientos: true,
        transmision: true,
        imagenes: { select: { direccionImagen: true } },
        vecesAlquilado: true,
        ubicacion: true,
        kilometraje: true,
        placa: true,
        combustible: true,
        descripcion: true,
        estaDisponible: true
      },
    });

    if (!auto) {
      res.status(404).json({ error: 'Auto no encontrado' });
      return;
    }

    // ✅ Verificar si el usuario actual es el propietario del auto
    if (auto.idPropietario !== req.user!.id) {
      res.status(403).json({ error: 'No autorizado para ver este auto' });
      return;
    }

    res.status(200).json({
      id: auto.idAuto,
      brand: auto.marca,
      model: auto.modelo,
      year: auto.año,
      category: auto.tipo,
      pricePerDay: auto.precioRentaDiario,
      seats: auto.asientos,
      transmission: auto.transmision,
      color: auto.color,
      imageUrl: auto.imagenes.map((img) => img.direccionImagen),
      rentalCount: auto.vecesAlquilado,
      location: auto.ubicacion,
      kilometers: auto.kilometraje,
      licensePlate: auto.placa,
      fuelType: auto.combustible,
      description: auto.descripcion || '',
      isAvailable: auto.estaDisponible
    });
  } catch (err) {
    next(err);
  }
});










// DELETE /api/autos/:id - Eliminar un auto
router.delete(
  '/:id',
  authenticateToken,
  isHost,
  async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
    try {
      const autoId = parseInt(req.params.id);
      const auto = await db.auto.findUnique({ where: { idAuto: autoId } });

      if (!auto) {
        res.status(404).json({ error: 'Auto no encontrado' });
        return;
      }

      if (auto.idPropietario !== req.user!.id) {
        res.status(403).json({ error: 'No autorizado para eliminar este auto' });
        return;
      }

      // Verificar si el auto tiene reservas activas
      const activeRentals = await db.reserva.findMany({
        where: {
          idAuto: autoId,
          fechaInicio: { lte: new Date() },
          fechaFin: { gte: new Date() },
        },
      });

      if (activeRentals.length > 0) {
        res.status(400).json({
          error: 'No se puede eliminar un auto con reservas activas.',
        });
        return;
      }

      // ✅ Eliminar imágenes antes de eliminar el auto
      await db.imagen.deleteMany({
        where: { idAuto: autoId },
      });

      // ✅ Ahora eliminar el auto
      await db.auto.delete({
        where: { idAuto: autoId },
      });

      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);








// PUT /api/autos/:id - Actualizar un auto
router.put('/:id', authenticateToken, isHost, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const autoId = parseInt(req.params.id);
    const auto = await db.auto.findUnique({
      where: { idAuto: autoId },
      include: {
        imagenes: true
      }
    });

    if (!auto) {
      res.status(404).json({ error: 'Auto no encontrado' });
      return;
    }

    if (auto.idPropietario !== req.user!.id) {
      res.status(403).json({ error: 'No autorizado para actualizar este auto' });
      return;
    }

    const {
      brand,
      model,
      year,
      category,
      color,
      pricePerDay,
      seats,
      transmission,
      imageUrls,
      isAvailable,
      extraEquipment,
      description,
      fuelType,
      kilometers,
    } = req.body;

    const data: any = {
      marca: brand || auto.marca,
      modelo: model || auto.modelo,
      año: year ? parseInt(year) : auto.año,
      tipo: category || auto.tipo,
      color: color || auto.color,
      precioRentaDiario: pricePerDay ? parseFloat(pricePerDay) : auto.precioRentaDiario,
      asientos: seats ? parseInt(seats) : auto.asientos,
      transmision: transmission
        ? (transmission.toUpperCase() as Transmision)
        : auto.transmision,
      combustible: fuelType || auto.combustible,
      kilometraje: kilometers !== undefined ? kilometers : auto.kilometraje,
      descripcion: description || auto.descripcion,
      estaDisponible: typeof isAvailable === 'boolean' ? isAvailable : auto.estaDisponible
    };

    // Solo actualiza imágenes si imageUrls es un array no vacío
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      data.imagenes = {
        deleteMany: {}, // Borra todas las imágenes actuales
        create: imageUrls.map((url: string) => ({
          direccionImagen: url,
        })),
      };
    }


    const updatedAuto = await db.auto.update({
      where: { idAuto: autoId },
      data,
      include: {
        imagenes: true,
      },
    });


    res.status(200).json({
      success: true,
      auto: {
        id: updatedAuto.idAuto,
        brand: updatedAuto.marca,
        model: updatedAuto.modelo,
        year: updatedAuto.año,
        category: updatedAuto.tipo,
        pricePerDay: updatedAuto.precioRentaDiario,
        seats: updatedAuto.asientos,
        transmission: updatedAuto.transmision,
        color: updatedAuto.color,
        imageUrl: updatedAuto.imagenes.map(img => img.direccionImagen),
        description: updatedAuto.descripcion,
        isAvailable: updatedAuto.estaDisponible
      },
    });
  } catch (err) {
    next(err);
  }
});









// POST /api/autos - Crear un auto
router.post('/', authenticateToken, isHost, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const {
      location,         // nombre de la ubicación, ej "Cochabamba"
      brand,            // marca
      model,            // modelo
      year,             // año
      carType,          // tipo
      color,
      pricePerDay,      // precioRentaDiario
      kilometers,       // kilometraje
      licensePlate,     // placa
      transmission,     // transmision
      fuelType,         // combustible
      seats,            // asientos
      description,
      montoGarantia,
      soat,
      photoUrls,
      capacidadMaletero,
    } = req.body;

    // Validar campos obligatorios mínimos
    if (
      !location ||
      !brand ||
      !year ||
      !pricePerDay ||
      !kilometers ||
      !licensePlate ||
      !transmission ||
      !fuelType ||
      !seats
    ) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    // Buscar idUbicacion según el nombre recibido (location)
    const ubicacionEncontrada = await db.ubicacion.findFirst({
      where: { departamento: location, esActiva: true },
    });

    if (!ubicacionEncontrada) {
      res.status(400).json({ error: `La ubicación '${location}' no existe o no está activa.` });
      return;
    }

    // Validar placa única
    const placaRepetida = await db.auto.findFirst({
      where: { placa: licensePlate },
    });

    if (placaRepetida) {
      res.status(409).json({ message: 'La placa de este auto ya está registrada' });
      return;
    }

    // Validar fotos URLs o subir fotos
    let imagenesData: { direccionImagen: string }[] = [];

    if (photoUrls && Array.isArray(photoUrls)) {
      if (photoUrls.length < 3 || photoUrls.length > 5) {
        res.status(400).json({ error: 'Debes proporcionar entre 3 y 5 URLs de fotos' });
        return;
      }
      imagenesData = photoUrls.map((url: string) => ({ direccionImagen: url }));
    } else if (req.files && req.files.photos) {
      const photoFiles = req.files.photos;
      const photos: UploadedPhoto[] = Array.isArray(photoFiles) ? photoFiles : [photoFiles as UploadedPhoto];

      if (photos.length < 3 || photos.length > 5) {
        res.status(400).json({ error: 'Debes subir entre 3 y 5 fotos' });
        return;
      }

      for (const photo of photos) {
        const fileName = `${Date.now()}-${photo.name}`;
        const filePath = path.join(__dirname, '../../Uploads', fileName);
        await photo.mv(filePath);
        imagenesData.push({ direccionImagen: `/uploads/${fileName}` });
      }
    } else {
      res.status(400).json({ error: 'Debes subir al menos 3 fotos o proporcionar URLs' });
      return;
    }

    // para la transmision

    let transmisionEnum: Transmision;

    if (typeof transmission === 'string') {
      const transUpper = transmission.toUpperCase();
      if (transUpper === Transmision.AUTOMATICO || transUpper === Transmision.MANUAL) {
        transmisionEnum = transUpper as Transmision;
      } else {
        res.status(400).json({ error: 'Transmisión inválida. Debe ser AUTOMATICO o MANUAL.' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Transmisión inválida.' });
      return;
    }

    // para combustible
    let combustibleEnum: Combustible;
    if (typeof fuelType === 'string') {
      const fuelUpper = fuelType.toUpperCase();
      if (
        fuelUpper === Combustible.GASOLINA ||
        fuelUpper === Combustible.DIESEL ||
        fuelUpper === Combustible.ELECTRICO ||
        fuelUpper === Combustible.HIBRIDO ||
        fuelUpper === Combustible.GAS
      ) {
        combustibleEnum = fuelUpper as Combustible;
      } else {
        res.status(400).json({ error: 'Combustible inválido. Debe ser GASOLINA, DIESEL, ELECTRICO o HIBRIDO.' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Combustible inválido.' });
      return;
    }

    // Crear el auto con los campos mapeados y parseados
    const newAuto = await db.auto.create({
      data: {
        idPropietario: req.user!.id,
        idUbicacion: ubicacionEncontrada.idUbicacion,
        marca: brand,
        modelo: model || undefined,
        año: parseInt(year),
        tipo: carType || null,
        color: color || undefined,
        precioRentaDiario: parseFloat(pricePerDay),
        kilometraje: parseInt(kilometers),
        placa: licensePlate,
        transmision: transmisionEnum,
        combustible: combustibleEnum,
        asientos: parseInt(seats),
        descripcion: description || null,
        montoGarantia: montoGarantia ? parseFloat(montoGarantia) : 0,
        soat: soat || '',
        capacidadMaletero: capacidadMaletero ? parseInt(capacidadMaletero) : 0,
        imagenes: {
          create: imagenesData,
        },
      },
      include: { imagenes: true },
    });

    res.status(201).json({ success: true, auto: newAuto });
  } catch (err: any) {
    console.error('Error en POST /api/autos:', err.message, err.stack);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    next(err);
  }
});



export default router;