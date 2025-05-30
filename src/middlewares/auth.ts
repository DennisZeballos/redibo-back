import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { FileArray } from 'express-fileupload';

export interface AuthRequest extends Request {
  user?: { id: number; host: boolean };
  files?: FileArray | null;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; host: boolean };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido' });
    return;
  }
};

export const isHost = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.host) {
    res.status(403).json({ error: 'Acceso denegado: se requiere ser host' });
    return;
  }
  next();
};
