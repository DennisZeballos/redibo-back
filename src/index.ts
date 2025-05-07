import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload'; 
import path from 'path';
import cors from 'cors';

import carRoutes from './routes/cars';
import authRoutes from './routes/auth';
import hostRoutes from './routes/hosts';

dotenv.config();

const app = express();

// Middleware principal
app.use(express.json());
app.use(fileUpload());

// Configuración de CORS
app.use(cors({
  origin: 'http://localhost:3000', // Cambia según tu frontend en producción
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

// Soporte para preflight requests
app.options('*', cors());

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../Uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/hosts', hostRoutes);

// Ruta raíz para verificar que está corriendo
app.get('/', (req: Request, res: Response) => {
  res.json('server running');
});

// Manejo de errores
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
