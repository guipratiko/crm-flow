import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { contactBody } from '../schemas';
import { createError } from '../middleware/errorHandler';
import { recordTimeline } from '../services/timelineService';

export async function listContacts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const q = String(req.query.q || '').trim();
    const companyId = req.query.companyId as string | undefined;
    const where: Record<string, unknown> = { tenantId };
    if (companyId) where.companyId = companyId;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { company: { select: { id: true, name: true } } },
    });
    res.json({ status: 'success', data: contacts });
  } catch (e) {
    next(e);
  }
}

export async function getContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        company: true,
        dealLinks: { include: { deal: { include: { stage: true } } } },
        activities: { orderBy: { dueDate: 'asc' }, take: 20 },
      },
    });
    if (!contact) return next(createError('Contato não encontrado', 404));
    res.json({ status: 'success', data: contact });
  } catch (e) {
    next(e);
  }
}

export async function createContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = contactBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const data = parsed.data;
    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        whatsapp: data.whatsapp ?? null,
        position: data.position ?? null,
        companyId: data.companyId ?? null,
        responsibleUserId: data.responsibleUserId ?? req.user?.id ?? null,
        tags: data.tags ?? [],
        notes: data.notes ?? null,
        source: data.source ?? 'manual',
      },
    });
    await recordTimeline({
      tenantId,
      entityType: 'contact',
      entityId: contact.id,
      action: 'contact_created',
      description: `Contato "${contact.name}" criado`,
      userId: req.user?.id,
    });
    res.status(201).json({ status: 'success', data: contact });
  } catch (e) {
    next(e);
  }
}

export async function updateContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = contactBody.partial().safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const existing = await prisma.contact.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Contato não encontrado', 404));
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    await recordTimeline({
      tenantId,
      entityType: 'contact',
      entityId: contact.id,
      action: 'contact_updated',
      description: `Contato "${contact.name}" atualizado`,
      userId: req.user?.id,
    });
    res.json({ status: 'success', data: contact });
  } catch (e) {
    next(e);
  }
}

export async function deleteContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const existing = await prisma.contact.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Contato não encontrado', 404));
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ status: 'success', message: 'Contato removido' });
  } catch (e) {
    next(e);
  }
}
