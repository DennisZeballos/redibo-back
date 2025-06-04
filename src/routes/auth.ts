import express, { Response, NextFunction } from 'express';
/*import { PrismaClient } from '@prisma/client';*/
import { PrismaClient, Prisma } from '../generated/client';
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

    const existingUser = await db.usuario.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'El email ya está registrado' });
      return;
    }

    const hashedPassword = await hash(password, 10);
    const usuario = await db.usuario.create({
      data: {
        email,
        contraseña: hashedPassword,
        nombreCompleto: name,
        direccion: role === 'host' ? location || '' : undefined,
        host: role === 'host',
        driverBool: false,
        registradoCon: 'email', // <-- Aquí va en minúsculas
      },
    });


    const token = jwt.sign(
      {
        id: usuario.idUsuario,
        role: usuario.host ? 'host' : 'guest'
      },
      secret,
      { expiresIn: '1h' }
    );


    res.status(201).json({ success: true, token, host: usuario.host });
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
    
    const usuario = await db.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.contraseña) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const isPasswordValid = await compare(password, usuario.contraseña);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = jwt.sign(
      {
        id: usuario.idUsuario,
        role: usuario.host ? 'host' : 'guest'
      },
      secret,
      { expiresIn: '1h' }
    );

    res.status(200).json({ success: true, token, host: usuario.host, role: usuario.host? 'host' : 'guest' });
  } catch (err) {
    next(err);
  }
});


export default router;
