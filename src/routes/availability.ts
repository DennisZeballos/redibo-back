import { Router } from 'express';

const router = Router();

router.post('/', (req, res) => {
  const { startDate, endDate, status } = req.body;

  console.log("Datos de disponibilidad recibidos:");
  console.log("Fecha Inicio:", startDate);
  console.log("Fecha Fin:", endDate);
  console.log("Estado:", status);

  // Aquí en el futuro podrías insertar a la base de datos usando Prisma
  res.status(200).json({ message: 'Disponibilidad actualizada exitosamente' });
});

export default router;
