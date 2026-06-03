import { Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export function requireTenantId(req: AuthRequest): string {
  const tenantId = req.tenantId?.trim();
  if (!tenantId) {
    throw createError('Tenant não identificado', 400);
  }
  return tenantId;
}

export function firstZodErrorMessage(error: ZodError): string {
  return error.errors[0]?.message || 'Dados inválidos';
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw createError(firstZodErrorMessage(parsed.error), 400);
  }
  return parsed.data;
}

/** Wrapper para handlers async — repassa AppError via next(). */
export function asyncHandler(
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
