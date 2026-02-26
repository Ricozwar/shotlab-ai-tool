import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export interface AuthPayload {
  sub: string;
  email?: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!JWT_SECRET) {
    res.status(500).json({ error: 'Server auth not configured' });
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as Request & { userId: string; userEmail?: string }).userId = decoded.sub;
    (req as Request & { userId: string; userEmail?: string }).userEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
