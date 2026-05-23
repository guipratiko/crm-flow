import { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../config/constants';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

function publicErrorMessage(err: AppError): string {
  if (err.statusCode && err.statusCode < 500) {
    return err.message;
  }

  const raw = err.message || '';
  if (
    raw.includes("Can't reach database") ||
    raw.includes('P1001') ||
    raw.includes('Connection refused') ||
    raw.includes('ECONNREFUSED')
  ) {
    return 'Banco de dados CRM indisponível. Verifique DATABASE_URL no CRM-Flow e conectividade com o Postgres.';
  }
  if (
    raw.includes('does not exist') ||
    raw.includes('P2021') ||
    raw.includes('schema "crm_flow"') ||
    raw.includes('crm_flow.')
  ) {
    return 'Schema CRM não inicializado. No CRM-Flow execute: npm run setup:db';
  }

  if (SERVER_CONFIG.NODE_ENV === 'production') {
    return 'Erro interno do serviço CRM';
  }
  return raw || 'Erro interno do servidor';
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error('[CRM-Flow]', err);
  }
  res.status(statusCode).json({
    status: 'error',
    message: publicErrorMessage(err),
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
