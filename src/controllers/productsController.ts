import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { productBody } from '../schemas';
import { createError } from '../middleware/errorHandler';

export async function listProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const products = await prisma.product.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    res.json({ status: 'success', data: products });
  } catch (e) {
    next(e);
  }
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = productBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const product = await prisma.product.create({
      data: {
        tenantId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        category: parsed.data.category ?? null,
        price: new Prisma.Decimal(parsed.data.price ?? 0),
        status: parsed.data.status ?? 'active',
      },
    });
    res.status(201).json({ status: 'success', data: product });
  } catch (e) {
    next(e);
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = productBody.partial().safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Produto não encontrado', 404));
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        price: parsed.data.price !== undefined ? new Prisma.Decimal(parsed.data.price) : undefined,
      },
    });
    res.json({ status: 'success', data: product });
  } catch (e) {
    next(e);
  }
}

export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Produto não encontrado', 404));
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ status: 'success', message: 'Produto removido' });
  } catch (e) {
    next(e);
  }
}
