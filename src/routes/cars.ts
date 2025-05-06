import * as express from 'express';
import { PrismaClient, Prisma } from '../generated/client';
import fileUpload from 'express-fileupload';
import { UploadedFile } from 'express-fileupload';
import * as path from 'path';
import { AuthRequest, authenticateToken, isHost } from '../middlewares/auth';

const router = express.Router();
const db = new PrismaClient();

interface CarRequestBody {
  location: string;
  brand: string;
  model?: string;
  year: string;
  carType?: string;
  color?: string;
  pricePerDay: string;
  kilometers: string;
  licensePlate: string;
  transmission: string;
  fuelType: string;
  seats: string;
  description?: string;
  photoUrls?: string[];
  extraEquipment?: string[];
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

    const where: Prisma.CarWhereInput = {};

    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' };
    }

    if (hostId) {
      where.userId = parseInt(hostId as string);
    }

    if (carType) {
      where.carType = { equals: carType as string };
    }

    if (transmission) {
      where.transmission = {
        equals: transmission as string,
        mode: 'insensitive',
      };
    }

    if (fuelType) {
      where.fuelType = { equals: fuelType as string };
    }

    if (minPrice || maxPrice) {
      where.pricePerDay = {};
      if (minPrice) {
        where.pricePerDay.gte = parseFloat(minPrice as string);
      }
      if (maxPrice) {
        where.pricePerDay.lte = parseFloat(maxPrice as string);
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      where.NOT = {
        rentals: {
          some: {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } },
            ],
          },
        },
      };
    }

    if (search) {
      const searchTerm = search as string;
      where.OR = [
        { brand: { contains: searchTerm, mode: 'insensitive' } },
        { model: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { carType: { contains: searchTerm, mode: 'insensitive' } },
        { transmission: { contains: searchTerm, mode: 'insensitive' } },
        { fuelType: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.CarOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'priceAsc':
        orderBy = { pricePerDay: 'asc' };
        break;
      case 'priceDesc':
        orderBy = { pricePerDay: 'desc' };
        break;
      case 'relevance':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const totalCars = await db.car.count({ where });
    const cars = await db.car.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        brand: true,
        model: true,
        year: true,
        carType: true,
        pricePerDay: true,
        rentalCount: true,
        location: true,
        photos: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        unavailableDates: true,
        extraEquipment: true,
        seats: true,
        transmission: true,
        color: true,
        isAvailable: true, // Nuevo campo
      },
    });

    const totalPages = Math.ceil(totalCars / limit);

    res.status(200).json({
      cars: cars.map((car) => ({
        id: car.id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        category: car.carType,
        pricePerDay: car.pricePerDay,
        rentalCount: car.rentalCount,
        location: car.location,
        imageUrl: car.photos[0] || '/placeholder-car.jpg',
        host: {
          id: car.user.id,
          email: car.user.email,
        },
        unavailableDates: car.unavailableDates,
        extraEquipment: car.extraEquipment,
        seats: car.seats,
        transmission: car.transmission,
        color: car.color,
        isAvailable: car.isAvailable, // Usar el valor real de la base de datos
        
      })),
      totalCars,
      currentPage: pageNumber,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cars/my-cars - Listar autos del host con filtros y ordenamiento (HU 3)
router.get('/my-cars', authenticateToken, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const { brand, model, carType, transmission, sortBy } = req.query;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CarWhereInput = { userId };

    if (brand) {
      where.brand = { contains: brand as string, mode: 'insensitive' };
    }
    if (model) {
      where.model = { contains: model as string, mode: 'insensitive' };
    }
    if (carType) {
      where.carType = { equals: carType as string };
    }
    if (transmission) {
      where.transmission = { equals: transmission as string };
    }

    let orderBy: Prisma.CarOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'priceAsc':
        orderBy = { pricePerDay: 'asc' };
        break;
      case 'priceDesc':
        orderBy = { pricePerDay: 'desc' };
        break;
      case 'rentalCount':
        orderBy = { rentalCount: 'desc' };
        break;
      case 'yearAsc':
        orderBy = { year: 'asc' };
        break;
      case 'yearDesc':
        orderBy = { year: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const totalCars = await db.car.count({ where });
    const cars = await db.car.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        brand: true,
        model: true,
        year: true,
        carType: true,
        color: true,
        pricePerDay: true,
        seats: true,
        transmission: true,
        photos: true,
        createdAt: true,
        unavailableDates: true,
        extraEquipment: true,
        rentalCount: true,
        isAvailable: true, // Nuevo campo
      },
    });

    const totalPages = Math.ceil(totalCars / limit);

    res.status(200).json({
      cars: cars.map((car) => ({
        id: car.id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        category: car.carType,
        pricePerDay: car.pricePerDay,
        seats: car.seats,
        transmission: car.transmission,
        color: car.color,
        imageUrl: car.photos[0] || '/placeholder-car.jpg',
        isAvailable: car.isAvailable, // Usar el valor real de la base de datos
        unavailableDates: car.unavailableDates,
        extraEquipment: car.extraEquipment,
        rentalCount: car.rentalCount,
      })),
      totalCars,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cars/:id - Obtener detalles de un auto
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const carId = parseInt(req.params.id);
    const car = await db.car.findUnique({
      where: { id: carId },
      select: {
        id: true,
        brand: true,
        model: true,
        year: true,
        carType: true,
        color: true,
        pricePerDay: true,
        seats: true,
        transmission: true,
        photos: true,
        createdAt: true,
        unavailableDates: true,
        extraEquipment: true,
        rentalCount: true,
        location: true,
        kilometers: true,
        licensePlate: true,
        fuelType: true,
        description: true,
        isAvailable: true, // Nuevo campo
      },
    });

    if (!car) {
      res.status(404).json({ error: 'Auto no encontrado' });
      return;
    }

    res.status(200).json({
      id: car.id,
      brand: car.brand,
      model: car.model,
      year: car.year,
      category: car.carType,
      pricePerDay: car.pricePerDay,
      seats: car.seats,
      transmission: car.transmission,
      color: car.color,
      imageUrl: car.photos[0] || '/placeholder-car.jpg',
      isAvailable: car.isAvailable, // Usar el valor real de la base de datos
      unavailableDates: car.unavailableDates,
      extraEquipment: car.extraEquipment,
      rentalCount: car.rentalCount,
      location: car.location,
      kilometers: car.kilometers,
      licensePlate: car.licensePlate,
      fuelType: car.fuelType,
      description: car.description || '',
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cars/:id - Eliminar un auto
router.delete('/:id', authenticateToken, isHost, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const carId = parseInt(req.params.id);
    const car = await db.car.findUnique({ where: { id: carId } });

    if (!car) {
      res.status(404).json({ error: 'Auto no encontrado' });
      return;
    }

    if (car.userId !== req.user!.id) {
      res.status(403).json({ error: 'No autorizado para eliminar este auto' });
      return;
    }

    await db.car.delete({ where: { id: carId } });
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cars/:id - Actualizar un auto
router.put('/:id', authenticateToken, isHost, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const carId = parseInt(req.params.id);
    const car = await db.car.findUnique({ where: { id: carId } });

    if (!car) {
      res.status(404).json({ error: 'Auto no encontrado' });
      return;
    }

    if (car.userId !== req.user!.id) {
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
      imageUrl,
      isAvailable,
      extraEquipment,
      description,
    } = req.body;

    const updatedCar = await db.car.update({
      where: { id: carId },
      data: {
        brand: brand || car.brand,
        model: model || car.model,
        year: year ? parseInt(year) : car.year,
        carType: category || car.carType,
        color: color || car.color,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : car.pricePerDay,
        seats: seats ? parseInt(seats) : car.seats,
        transmission: transmission || car.transmission,
        photos: imageUrl ? [imageUrl] : car.photos,
        extraEquipment: extraEquipment !== undefined ? extraEquipment : car.extraEquipment,
        isAvailable: isAvailable !== undefined ? isAvailable : car.isAvailable, // Nuevo campo
        description: description || car.description,

      },
    });

    res.status(200).json({
      success: true,
      car: {
        id: updatedCar.id,
        brand: updatedCar.brand,
        model: updatedCar.model,
        year: updatedCar.year,
        category: updatedCar.carType,
        pricePerDay: updatedCar.pricePerDay,
        seats: updatedCar.seats,
        transmission: updatedCar.transmission,
        color: updatedCar.color,
        imageUrl: updatedCar.photos[0] || '/placeholder-car.jpg',
        isAvailable: updatedCar.isAvailable, // Usar el valor real de la base de datos
        unavailableDates: updatedCar.unavailableDates,
        extraEquipment: updatedCar.extraEquipment,
        description: updatedCar.description,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cars - Crear un auto
router.post('/', authenticateToken, isHost, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const {
      location,
      brand,
      model,
      year,
      carType,
      color,
      pricePerDay,
      kilometers,
      licensePlate,
      transmission,
      fuelType,
      seats,
      description,
      photoUrls,
      extraEquipment,
    } = req.body as CarRequestBody;

    if (!location || !brand || !year || !pricePerDay || !kilometers || !licensePlate || !transmission || !fuelType || !seats) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const placaRepetida = await db.car.findFirst({
      where: {
        licensePlate
      },
    });
    
    if (placaRepetida) {
      res.status(409).json({ message: 'La placa de este auto ya está registrada' });
      return;
    }

    let photoPaths: string[] = [];
    if (photoUrls && Array.isArray(photoUrls)) {
      if (photoUrls.length < 3 || photoUrls.length > 5) {
        res.status(400).json({ error: 'Debes proporcionar entre 3 y 5 URLs de fotos' });
        return;
      }
      photoPaths = photoUrls;
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
        photoPaths.push(`/uploads/${fileName}`);
      }
    } else {
      res.status(400).json({ error: 'Debes subir al menos 3 fotos o proporcionar URLs' });
      return;
    }

    const newCar = await db.car.create({
      data: {
        userId: req.user!.id,
        location,
        brand,
        model: model || undefined,
        year: parseInt(year),
        carType: carType || null,
        color: color || undefined,
        pricePerDay: parseFloat(pricePerDay),
        kilometers,
        licensePlate,
        transmission,
        fuelType,
        seats: parseInt(seats),
        description: description || null,
        photos: photoPaths,
        extraEquipment: extraEquipment || [],
        isAvailable: true, // Valor por defecto
      },
    });

    res.status(201).json({ success: true, car: newCar });
  } catch (err: any) {
    console.error('Error en POST /api/cars:', err.message, err.stack);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    next(err);
  }
});

// PATCH /api/cars/:id/availability - Actualizar fechas de no disponibilidad
router.patch('/:id/availability', authenticateToken, isHost, async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const carId = parseInt(req.params.id);
    const { unavailableDates } = req.body;

    const car = await db.car.findUnique({ where: { id: carId } });

    if (!car) {
      res.status(404).json({ error: 'Auto no encontrado' });
      return;
    }

    if (car.userId !== req.user!.id) {
      res.status(403).json({ error: 'No autorizado para actualizar este auto' });
      return;
    }

    if (!Array.isArray(unavailableDates)) {
      res.status(400).json({ error: 'unavailableDates debe ser un arreglo de fechas' });
      return;
    }

    const updatedCar = await db.car.update({
      where: { id: carId },
      data: {
        unavailableDates,
      },
    });

    res.status(200).json({
      success: true,
      car: {
        id: updatedCar.id,
        brand: updatedCar.brand,
        model: updatedCar.model,
        year: updatedCar.year,
        category: updatedCar.carType,
        pricePerDay: updatedCar.pricePerDay,
        seats: updatedCar.seats,
        transmission: updatedCar.transmission,
        color: updatedCar.color,
        imageUrl: updatedCar.photos[0] || '/placeholder-car.jpg',
        isAvailable: updatedCar.isAvailable, // Usar el valor real de la base de datos
        unavailableDates: updatedCar.unavailableDates,
        extraEquipment: updatedCar.extraEquipment,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;