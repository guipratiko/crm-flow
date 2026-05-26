import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { activityBody } from '../schemas';
import { createError } from '../middleware/errorHandler';
import { recordTimeline } from '../services/timelineService';

function parseDueDate(value: string | null | undefined): Date | null {
  if (!value || !String(value).trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

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
    const filter = req.query.filter as string | undefined;
    const dealId = req.query.dealId as string | undefined;
    const contactId = req.query.contactId as string | undefined;
    const now = new Date();
    const where: Prisma.ActivityWhereInput = { tenantId };
    if (dealId) where.dealId = dealId;
    if (contactId) where.contactId = contactId;
    if (status) where.status = status as 'pending' | 'completed' | 'cancelled';
    if (filter === 'pending') where.status = 'pending';
    if (filter === 'completed') where.status = 'completed';
    if (filter === 'overdue') {
      where.status = 'pending';
      where.dueDate = { lt: now };
    }
    if (filter === 'today') {
      where.status = 'pending';
      where.dueDate = { gte: startOfLocalDay(now), lte: endOfLocalDay(now) };
    }
    const activities = await prisma.activity.findMany({
      where,
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 300,
    });
    res.json({ status: 'success', data: activities });
  } catch (e) {
    next(e);
  }
}

export async function dealActivitySummaries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const now = new Date();
    const [pendingRows, overdueRows] = await Promise.all([
      prisma.activity.groupBy({
        by: ['dealId'],
        where: { tenantId, status: 'pending', dealId: { not: null } },
        _count: { _all: true },
      }),
      prisma.activity.groupBy({
        by: ['dealId'],
        where: {
          tenantId,
          status: 'pending',
          dealId: { not: null },
          dueDate: { lt: now },
        },
        _count: { _all: true },
      }),
    ]);
    const map: Record<string, { pending: number; overdue: number }> = {};
    for (const row of pendingRows) {
      if (!row.dealId) continue;
      map[row.dealId] = { pending: row._count._all, overdue: 0 };
    }
    for (const row of overdueRows) {
      if (!row.dealId) continue;
      if (!map[row.dealId]) map[row.dealId] = { pending: 0, overdue: 0 };
      map[row.dealId].overdue = row._count._all;
    }
    res.json({ status: 'success', data: map });
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
        dueDate: parseDueDate(data.dueDate ?? undefined),
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
    const nextDue =
      parsed.data.dueDate !== undefined ? parseDueDate(parsed.data.dueDate ?? undefined) : undefined;
    const resetReminders =
      parsed.data.dueDate !== undefined &&
      nextDue != null &&
      nextDue.getTime() > Date.now();
    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate !== undefined ? nextDue : undefined,
        ...(resetReminders
          ? { reminderSentAt: null, overdueReminderSentAt: null }
          : {}),
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
