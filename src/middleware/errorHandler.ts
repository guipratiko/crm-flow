import { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../config/constants';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

function sanitizeErrorMessage(err: AppError, statusCode: number): string {
  const msg = err.message || 'Erro interno do servidor';
  const isProd = SERVER_CONFIG.NODE_ENV === 'production';
  if (isProd && statusCode >= 500) {
    if (/prisma|Can't reach database|database server/i.test(msg)) {
      return 'Falha ao acessar o banco de dados CRM';
    }
    if (!err.statusCode) return 'Erro interno do servidor';
  }
  return msg;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error('[CRM-Flow]', err.message, err.stack);
  }
  res.status(statusCode).json({
    status: 'error',
    message: sanitizeErrorMessage(err, statusCode),
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ status: 'error', message: 'Rota não encontrada' });
};

export function createError(message: string, statusCode = 400): AppError {
  const e: AppError = new Error(message);
  e.statusCode = statusCode;
  e.status = statusCode >= 500 ? 'error' : 'fail';
  return e;
}
