import express from 'express';
// import { PrismaClient } from '../generated/client';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const db = new PrismaClient();

// GET /api/hosts - Buscar hosts por nombre y devolver localidad y nombre
router.get('/', async (req, res) => {
  const search = (req.query.search as string)?.toLowerCase().replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, '') || "";

  console.log("Valor de búsqueda recibido:", search);

  try {
    const hosts = await db.usuario.findMany({
      where: {
        host: true,
        nombreCompleto: {
          contains: search,
          mode: 'insensitive',
        },
        autos: {
          some: {}, // asegura que tenga al menos un auto
        },
      },
      select: {
        idUsuario: true,
        nombreCompleto: true,
        autos: {
          take: 1,
          select: {
            ubicacion: {
              select: {
                departamento: true
              },
            },
          },
        },
      },
      take: 4,
    });

    const resultados = hosts.map((host) => ({
      id: host.idUsuario,
      name: host.nombreCompleto,
      location: host.autos[0]?.ubicacion.departamento || null,
    }));

    res.status(200).json(resultados);
  } catch (error) {
    console.error("Error al buscar hosts:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
