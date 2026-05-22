import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { companyBody } from '../schemas';
import { createError } from '../middleware/errorHandler';
import { recordTimeline } from '../services/timelineService';

export async function listCompanies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const q = String(req.query.q || '').trim();
    const where: Record<string, unknown> = { tenantId };
    if (q) where.name = { contains: q, mode: 'insensitive' };
    const companies = await prisma.clientCompany.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { contacts: true, deals: true } } },
    });
    res.json({ status: 'success', data: companies });
  } catch (e) {
    next(e);
  }
}

export async function getCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const company = await prisma.clientCompany.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        contacts: true,
        deals: { include: { stage: true } },
        activities: { orderBy: { dueDate: 'asc' }, take: 20 },
      },
    });
    if (!company) return next(createError('Empresa não encontrada', 404));
    res.json({ status: 'success', data: company });
  } catch (e) {
    next(e);
  }
}

export async function createCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = companyBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const data = parsed.data;
    const company = await prisma.clientCompany.create({
      data: {
        tenantId,
        ...data,
        email: data.email ?? null,
        responsibleUserId: data.responsibleUserId ?? req.user?.id ?? null,
      },
    });
    await recordTimeline({
      tenantId,
      entityType: 'company',
      entityId: company.id,
      action: 'company_created',
      description: `Empresa "${company.name}" criada`,
      userId: req.user?.id,
    });
    res.status(201).json({ status: 'success', data: company });
  } catch (e) {
    next(e);
  }
}

export async function updateCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = companyBody.partial().safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const existing = await prisma.clientCompany.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Empresa não encontrada', 404));
    const company = await prisma.clientCompany.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    await recordTimeline({
      tenantId,
      entityType: 'company',
      entityId: company.id,
      action: 'company_updated',
      description: `Empresa "${company.name}" atualizada`,
      userId: req.user?.id,
    });
    res.json({ status: 'success', data: company });
  } catch (e) {
    next(e);
  }
}

export async function deleteCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const existing = await prisma.clientCompany.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Empresa não encontrada', 404));
    await prisma.clientCompany.delete({ where: { id: req.params.id } });
    res.json({ status: 'success', message: 'Empresa removida' });
  } catch (e) {
    next(e);
  }
}
