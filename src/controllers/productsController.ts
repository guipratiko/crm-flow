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
        sku: parsed.data.sku?.trim() || null,
        price: new Prisma.Decimal(parsed.data.price ?? 0),
        costPrice:
          parsed.data.costPrice != null ? new Prisma.Decimal(parsed.data.costPrice) : null,
        stock: parsed.data.stock ?? 0,
        size: parsed.data.size?.trim() || null,
        weight: parsed.data.weight != null ? new Prisma.Decimal(parsed.data.weight) : null,
        weightUnit: parsed.data.weightUnit ?? null,
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
        sku: parsed.data.sku !== undefined ? parsed.data.sku?.trim() || null : undefined,
        size: parsed.data.size !== undefined ? parsed.data.size?.trim() || null : undefined,
        price: parsed.data.price !== undefined ? new Prisma.Decimal(parsed.data.price) : undefined,
        costPrice:
          parsed.data.costPrice !== undefined
            ? parsed.data.costPrice != null
              ? new Prisma.Decimal(parsed.data.costPrice)
              : null
            : undefined,
        weight:
          parsed.data.weight !== undefined
            ? parsed.data.weight != null
              ? new Prisma.Decimal(parsed.data.weight)
              : null
            : undefined,
        weightUnit: parsed.data.weightUnit !== undefined ? parsed.data.weightUnit : undefined,
        stock: parsed.data.stock !== undefined ? parsed.data.stock : undefined,
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
