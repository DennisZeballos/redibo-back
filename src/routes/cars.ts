import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, isHost } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

// Ruta para obtener los autos del host autenticado (con paginación)
router.get('/my-cars', authenticateToken, isHost, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = 4; // Máximo 4 autos por página, según los criterios
  const skip = (page - 1) * pageSize;

  try {
    const hostId = req.user!.id;

    // Obtener el total de autos del host
    const totalCars = await prisma.car.count({
      where: { hostId },
    });

    // Obtener los autos de la página actual
    const cars = await prisma.car.findMany({
      where: { hostId },
      skip,
      take: pageSize,
      select: {
        id: true,
        brand: true,
        model: true,
        year: true,
        seats: true,
        transmission: true,
        category: true,
        color: true,
        pricePerDay: true,
        imageUrl: true,
        isAvailable: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      cars,
      totalCars,
      currentPage: page,
      totalPages: Math.ceil(totalCars / pageSize),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los autos' });
  }
});

// Ruta para eliminar un auto
router.delete('/:id', authenticateToken, isHost, async (req, res) => {
  const carId = parseInt(req.params.id);

  try {
    const hostId = req.user!.id;

    const car = await prisma.car.findUnique({
      where: { id: carId },
    });

    if (!car || car.hostId !== hostId) {
      return res.status(404).json({ error: 'Auto no encontrado o no autorizado' });
    }

    await prisma.car.delete({
      where: { id: carId },
    });

    res.status(200).json({ message: 'Auto eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el auto' });
  }
});

export default router;