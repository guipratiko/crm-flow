import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { activityBody } from '../schemas';
import { createError } from '../middleware/errorHandler';
import { recordTimeline } from '../services/timelineService';

async function timelineForActivity(
  tenantId: string,
  activity: {
    contactId: string | null;
    companyId: string | null;
    dealId: string | null;
    title: string;
    type: string;
  },
  action: string,
  description: string,
  userId?: string
) {
  const tasks: Promise<void>[] = [];
  if (activity.contactId) {
    tasks.push(
      recordTimeline({
        tenantId,
        entityType: 'contact',
        entityId: activity.contactId,
        action,
        description,
        userId,
      })
    );
  }
  if (activity.companyId) {
    tasks.push(
      recordTimeline({
        tenantId,
        entityType: 'company',
        entityId: activity.companyId,
        action,
        description,
        userId,
      })
    );
  }
  if (activity.dealId) {
    tasks.push(
      recordTimeline({
        tenantId,
        entityType: 'deal',
        entityId: activity.dealId,
        action,
        description,
        userId,
      })
    );
  }
  await Promise.all(tasks);
}

export async function listActivities(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const status = req.query.status as string | undefined;
    const activities = await prisma.activity.findMany({
      where: { tenantId, ...(status ? { status: status as 'pending' | 'completed' | 'cancelled' } : {}) },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
    res.json({ status: 'success', data: activities });
  } catch (e) {
    next(e);
  }
}

export async function createActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = activityBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const data = parsed.data;
    const activity = await prisma.activity.create({
      data: {
        tenantId,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status ?? 'pending',
        contactId: data.contactId ?? null,
        companyId: data.companyId ?? null,
        dealId: data.dealId ?? null,
        responsibleUserId: data.responsibleUserId ?? req.user?.id ?? null,
      },
    });
    await timelineForActivity(
      tenantId,
      activity,
      'activity_created',
      `Atividade "${activity.title}" (${activity.type}) criada`,
      req.user?.id
    );
    res.status(201).json({ status: 'success', data: activity });
  } catch (e) {
    next(e);
  }
}

export async function updateActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = activityBody.partial().safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const existing = await prisma.activity.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Atividade não encontrada', 404));
    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        dueDate:
          parsed.data.dueDate !== undefined
            ? parsed.data.dueDate
              ? new Date(parsed.data.dueDate)
              : null
            : undefined,
      },
    });
    res.json({ status: 'success', data: activity });
  } catch (e) {
    next(e);
  }
}

export async function deleteActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    await prisma.activity.deleteMany({ where: { id: req.params.id, tenantId } });
    res.json({ status: 'success', message: 'Atividade removida' });
  } catch (e) {
    next(e);
  }
}

export async function completeActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const existing = await prisma.activity.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Atividade não encontrada', 404));
    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: { status: 'completed' },
    });
    await timelineForActivity(
      tenantId,
      activity,
      'activity_completed',
      `Atividade "${activity.title}" concluída`,
      req.user?.id
    );
    res.json({ status: 'success', data: activity });
  } catch (e) {
    next(e);
  }
}
