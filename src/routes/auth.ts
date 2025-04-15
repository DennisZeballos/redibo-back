import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

// Interfaz para el cuerpo de la solicitud
interface RegisterRequestBody {
  email: string;
  password: string;
  role: 'host' | 'guest';
}

interface LoginRequestBody {
  email: string;
  password: string;
}

// Ruta para registrar usuarios
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, role } = req.body as RegisterRequestBody;

    // Validar campos
    if (!email || !password || !role) {
      res.status(400).json({ error: 'Faltan campos obligatorios: email, password, role' });
      return;
    }

    if (!['host', 'guest'].includes(role)) {
      res.status(400).json({ error: 'El rol debe ser "host" o "guest"' });
      return;
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'El email ya está registrado' });
      return;
    }

    // Encriptar la contraseña
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Crear el usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    // Generar token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, {
      expiresIn: '1h',
    });

    res.status(201).json({ success: true, user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err) {
    next(err);
  }
});

// Ruta para iniciar sesión
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequestBody;

    // Validar campos
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son requeridos' });
      return;
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Verificar contraseña
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Contraseña incorrecta' });
      return;
    }

    // Generar token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, {
      expiresIn: '1h',
    });

    res.status(200).json({ success: true, user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err) {
    next(err);
  }
});

export default router;