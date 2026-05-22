import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Erro interno do servidor',
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
