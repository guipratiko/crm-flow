import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

export function requireInternalApiKey(req: Request, _res: Response, next: NextFunction): void {
  const expected = (process.env.ONLYFLOW_INTERNAL_KEY || process.env.JWT_SECRET || '').trim();
  if (!expected) {
    return next(createError('ONLYFLOW_INTERNAL_KEY não configurada no CRM-Flow', 503));
  }
  const provided = String(req.headers['x-onlyflow-internal-key'] || '').trim();
  if (!provided || provided !== expected) {
    return next(createError('Chave interna inválida', 401));
  }
  next();
}
