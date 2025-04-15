import express, { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import fileUpload, { UploadedFile } from 'express-fileupload';
import path from 'path';
import { AuthRequest, authenticateToken, isHost } from '../middlewares/auth';

const router = express.Router();
const db = new PrismaClient();

// Interfaces para tipado
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

// Use UploadedFile from express-fileupload
interface UploadedPhoto extends UploadedFile {
  mv(path: string): Promise<void>;
}

// Middleware para manejar archivos
router.use(fileUpload());

// Ruta para agregar un nuevo auto
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

    // Validar campos obligatorios
    if (!location || !brand || !year || !pricePerDay || !kilometers || !licensePlate || !transmission || !fuelType || !seats) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    // Manejar las fotos
    if (!req.files || !req.files.photos) {
      res.status(400).json({ error: 'Debes subir al menos 3 fotos' });
      return;
    }

    // Asegurar que photos sea un array
    const photoFiles = req.files.photos;
    const photos: UploadedPhoto[] = Array.isArray(photoFiles) ? photoFiles : [photoFiles as UploadedPhoto];

    if (photos.length < 3 || photos.length > 5) {
      res.status(400).json({ error: 'Debes subir entre 3 y 5 fotos' });
      return;
    }

    // Guardar las fotos en el servidor
    const photoPaths: string[] = [];
    for (const photo of photos) {
      const fileName = `${Date.now()}-${photo.name}`;
      const filePath = path.join(__dirname, '../../Uploads', fileName);
      await photo.mv(filePath);
      photoPaths.push(`/uploads/${fileName}`);
    }

    // Guardar el auto en la base de datos
    const newCar = await db.car.create({
      data: {
        userId: req.user!.id, // Obtenido del token a través de req.user.id
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
    next(err); // Pass errors to Express error middleware
  }
});

export default router;