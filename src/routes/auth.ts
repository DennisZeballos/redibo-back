import express, { Response, NextFunction } from 'express';
/*import { PrismaClient } from '@prisma/client';*/
// import { PrismaClient, Prisma } from '../generated/client';
import {PrismaClient, Prisma} from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const db = new PrismaClient();

interface RegisterRequestBody {
  email: string;
  password: string;
  role: string;
  name: string;
  location?: string;
  
}

interface LoginRequestBody {
  email: string;
  password: string;
}

const secret = process.env.JWT_SECRET || 'your_jwt_secret';

router.post('/register', async (req: express.Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, role, name, location } = req.body as RegisterRequestBody;

    if (!email || !password || !role || !name) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    if (role !== 'host' && role !== 'guest') {
      res.status(400).json({ error: 'Rol inválido. Debe ser "host" o "guest"' });
      return;
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'El email ya está registrado' });
      return;
    }

    const hashedPassword = await hash(password, 10);
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        location: role === 'host' ? location || '' : undefined,
        role,
        name,
      },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: '1h' });

    res.status(201).json({ success: true, token, role: user.role });
  } catch (err) {
    next(err);
  }
});

// POST /login
router.post('/login', async (req: express.Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequestBody;

    if (!email || !password) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: '1h' });

    res.status(200).json({ success: true, token, role: user.role });
  } catch (err) {
    next(err);
  }
});

export default router;
