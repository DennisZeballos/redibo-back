import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import carsRouter from './routes/cars';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Montar las rutas
app.use('/api/auth', authRouter);
app.use('/api/cars', carsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});