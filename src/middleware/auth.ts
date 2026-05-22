import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/constants';
import { createError, AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: { id: string };
  tenantId?: string;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(createError('Token não fornecido', 401));
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET) as { id: string };
    req.user = { id: decoded.id };

    const tenantHeader = req.headers['x-onlyflow-tenant-id'];
    req.tenantId = typeof tenantHeader === 'string' && tenantHeader.trim()
      ? tenantHeader.trim()
      : decoded.id;

    next();
  } catch (e) {
    if (e instanceof Error && e.name === 'TokenExpiredError') {
      return next(createError('Token expirado', 401));
    }
    return next(createError('Token inválido', 401));
  }
};

export const requireTenant = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.tenantId) {
    return next(createError('Tenant não identificado', 400));
  }
  next();
};
