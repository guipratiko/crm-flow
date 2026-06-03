import { Request, Response, NextFunction } from 'express';
import { ONLYFLOW_INTERNAL_CONFIG } from '../config/constants';
import { createError } from './errorHandler';

export function requireInternalApiKey(req: Request, _res: Response, next: NextFunction): void {
  const expected = ONLYFLOW_INTERNAL_CONFIG.API_KEY;
  if (!expected) {
    return next(createError('ONLYFLOW_INTERNAL_KEY não configurada no CRM-Flow', 503));
  }
  const provided = String(req.headers['x-onlyflow-internal-key'] || '').trim();
  if (!provided || provided !== expected) {
    return next(createError('Chave interna inválida', 401));
  }
  next();
}
