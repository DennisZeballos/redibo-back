import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

export const isHost = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'host') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol de host' });
  }
  next();
};