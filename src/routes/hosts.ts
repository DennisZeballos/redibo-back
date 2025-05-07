import express from 'express';
import { PrismaClient } from '../generated/client';

const router = express.Router();
const db = new PrismaClient();

// GET /api/hosts - Buscar hosts por nombre y devolver localidad y nombre
router.get('/', async (req, res) => {
  const search = (req.query.search as string)?.toLowerCase().replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, '') || "";

  console.log("Valor de búsqueda recibido:", search);
  
  try {
    const hosts = await db.user.findMany({
      where: {
        role: 'host',
    
       // cars: {
       //   some: {}, 
       // },
      },
      select: {
        id: true,
        name: true,
        cars: {
          take: 1,
          select: {
            location: true,
          },
        },
      },
      take: 4,
    });

    const resultados = hosts.map((host) => ({
      id: host.id,
      name: host.name,
      location: host.cars[0]?.location || '',
    }));

    res.status(200).json(resultados);
  } catch (error) {
    console.error("Error al buscar hosts:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
