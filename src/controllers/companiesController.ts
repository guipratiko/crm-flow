import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { companyBody } from '../schemas';
import { createError } from '../middleware/errorHandler';
import { recordTimeline } from '../services/timelineService';
import { lookupCnpjFromBrasilApi } from '../services/cnpjLookupService';
import { normalizeCompanyDocument } from '../utils/companyDocument';

async function assertUniqueDocument(tenantId: string, document: string | null, excludeId?: string) {
  if (!document) return;
  const existing = await prisma.clientCompany.findFirst({
    where: {
      tenantId,
      document,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw createError('Já existe uma empresa cadastrada com este CNPJ.', 409);
  }
}

export async function lookupCompanyCnpj(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const document = normalizeCompanyDocument(req.params.cnpj);
    if (!document || document.length !== 14) {
      return next(createError('CNPJ inválido.', 400));
    }
    const data = await lookupCnpjFromBrasilApi(document);
    res.json({ status: 'success', data });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) {
      return next(e);
    }
    const message = e instanceof Error ? e.message : 'Erro ao consultar CNPJ';
    const status = /não encontrado|inválido|14 dígitos/i.test(message) ? 404 : 503;
    return next(createError(message, status));
  }
}

export async function listCompanies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const q = String(req.query.q || '').trim();
    const digits = q.replace(/\D/g, '');
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { tradeName: { contains: q, mode: 'insensitive' } },
        ...(digits.length >= 3 ? [{ document: { contains: digits } }] : []),
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.clientCompany.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: { _count: { select: { contacts: true, deals: true } } },
      }),
      prisma.clientCompany.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: companies,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
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
    const document = normalizeCompanyDocument(data.document);
    await assertUniqueDocument(tenantId, document);
    const company = await prisma.clientCompany.create({
      data: {
        tenantId,
        name: data.name.trim(),
        tradeName: data.tradeName?.trim() || null,
        document,
        segment: data.segment ?? null,
        website: data.website ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        partners: (data.partners ?? []).map((p) => p.trim()).filter(Boolean),
        logoUrl: data.logoUrl?.trim() || null,
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
    const document =
      parsed.data.document !== undefined
        ? normalizeCompanyDocument(parsed.data.document)
        : existing.document;
    await assertUniqueDocument(tenantId, document, req.params.id);
    const company = await prisma.clientCompany.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        ...(parsed.data.document !== undefined ? { document } : {}),
        ...(parsed.data.tradeName !== undefined
          ? { tradeName: parsed.data.tradeName?.trim() || null }
          : {}),
        ...(parsed.data.partners !== undefined
          ? { partners: parsed.data.partners.map((p) => p.trim()).filter(Boolean) }
          : {}),
        ...(parsed.data.logoUrl !== undefined ? { logoUrl: parsed.data.logoUrl?.trim() || null } : {}),
      },
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
