import express, { Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import fileUpload, { UploadedFile } from 'express-fileupload';
import path from 'path';
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
}

interface UploadedPhoto extends UploadedFile {
  mv(path: string): Promise<void>;
}

router.use(fileUpload());

router.get('/my-cars', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalCars = await db.car.count({ where: { userId } });
    const cars = await db.car.findMany({
      where: { userId },
      skip,
      take: limit,
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
      },
    });

    const totalPages = Math.ceil(totalCars / limit);

    res.status(200).json({
      cars: cars.map(car => ({
        ...car,
        category: car.carType,
        imageUrl: car.photos[0] || '/placeholder-car.jpg',
        isAvailable: true,
      })),
      totalCars,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
      },
    });

    if (!car) {
      res.status(404).json({ error: 'Auto no encontrado' });
      return;
    }

    res.status(200).json({
      ...car,
      category: car.carType,
      imageUrl: car.photos[0] || '/placeholder-car.jpg',
      isAvailable: true,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticateToken, isHost, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

router.put('/:id', authenticateToken, isHost, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
      carType,
      color,
      pricePerDay,
      seats,
      transmission,
      imageUrl,
      isAvailable,
    } = req.body;

    const updatedCar = await db.car.update({
      where: { id: carId },
      data: {
        brand: brand || car.brand,
        model: model || car.model,
        year: year ? parseInt(year) : car.year,
        carType: carType || car.carType,
        color: color || car.color,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : car.pricePerDay,
        seats: seats ? parseInt(seats) : car.seats,
        transmission: transmission || car.transmission,
        photos: imageUrl ? [imageUrl] : car.photos,
      },
    });

    res.status(200).json({
      success: true,
      car: {
        ...updatedCar,
        category: updatedCar.carType,
        imageUrl: updatedCar.photos[0] || '/placeholder-car.jpg',
        isAvailable: isAvailable !== undefined ? isAvailable : true,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticateToken, isHost, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    } = req.body as CarRequestBody;

    if (!location || !brand || !year || !pricePerDay || !kilometers || !licensePlate || !transmission || !fuelType || !seats) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    if (!req.files || !req.files.photos) {
      res.status(400).json({ error: 'Debes subir al menos 3 fotos' });
      return;
    }

    const photoFiles = req.files.photos;
    const photos: UploadedPhoto[] = Array.isArray(photoFiles) ? photoFiles : [photoFiles as UploadedPhoto];

    if (photos.length < 3 || photos.length > 5) {
      res.status(400).json({ error: 'Debes subir entre 3 y 5 fotos' });
      return;
    }

    const photoPaths: string[] = [];
    for (const photo of photos) {
      const fileName = `${Date.now()}-${photo.name}`;
      const filePath = path.join(__dirname, '../../Uploads', fileName);
      await photo.mv(filePath);
      photoPaths.push(`/Uploads/${fileName}`);
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
      },
    });

    res.status(201).json({ success: true, car: newCar });
  } catch (err) {
    next(err);
  }
});

export default router;