import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload'; 
import carRoutes from './routes/cars';
import authRoutes from './routes/auth';
import path from 'path';
import cors from 'cors';
import hostRoutes from './routes/hosts';


dotenv.config();

const app = express();

app.use(cors())

// Rutas de API
app.use('/api/hosts', hostRoutes); 

// Middleware
app.use(express.json());
app.use(fileUpload());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../Uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);

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

app.get('/', (req, res) => {
  res.json({message: 'server running'});
})