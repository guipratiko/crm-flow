import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { activityBody } from '../schemas';
import { createError } from '../middleware/errorHandler';
import { recordActivityLinkedTimelines } from '../services/activityTimeline';
import { buildActivityListWhere } from '../services/activityQuery';
import { parseDueDate } from '../utils/dateHelpers';
import { requireTenantId, parseBody, asyncHandler } from '../utils/requestContext';
import { resolveAgendaViewFilter } from './agendaViewsController';
import { assertActivityTypeSlugExists } from '../services/activityTypeDefsService';

export const listActivities = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const viewId = req.query.viewId as string | undefined;
  let filterConfig = null;
  if (viewId) {
    filterConfig = await resolveAgendaViewFilter(tenantId, viewId);
    if (!filterConfig) throw createError('View de agenda não encontrada', 404);
  }

  const where = buildActivityListWhere(tenantId, {
    status: req.query.status as string | undefined,
    filter: req.query.filter as string | undefined,
    filterConfig,
    dealId: req.query.dealId as string | undefined,
    contactId: req.query.contactId as string | undefined,
  });

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
});

export const dealActivitySummaries = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
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
});

export const createActivity = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const data = parseBody(activityBody, req.body);

  await assertActivityTypeSlugExists(tenantId, data.type);

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

  await recordActivityLinkedTimelines(
    tenantId,
    activity,
    'activity_created',
    `Atividade "${activity.title}" (${activity.type}) criada`,
    req.user?.id
  );

  res.status(201).json({ status: 'success', data: activity });
});

export const updateActivity = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const parsed = parseBody(activityBody.partial(), req.body);

  const existing = await prisma.activity.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw createError('Atividade não encontrada', 404);

  if (parsed.type) {
    await assertActivityTypeSlugExists(tenantId, parsed.type);
  }

  const nextDue =
    parsed.dueDate !== undefined ? parseDueDate(parsed.dueDate ?? undefined) : undefined;
  const resetReminders =
    parsed.dueDate !== undefined && nextDue != null && nextDue.getTime() > Date.now();

  const activity = await prisma.activity.update({
    where: { id: req.params.id },
    data: {
      ...parsed,
      dueDate: parsed.dueDate !== undefined ? nextDue : undefined,
      ...(resetReminders
        ? {
            reminderSentAt: null,
            overdueReminderSentAt: null,
            reminderPushSentAt: null,
            overdueReminderPushSentAt: null,
          }
        : {}),
    },
  });

  res.json({ status: 'success', data: activity });
});

export const deleteActivity = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  await prisma.activity.deleteMany({ where: { id: req.params.id, tenantId } });
  res.json({ status: 'success', message: 'Atividade removida' });
});

export const completeActivity = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const existing = await prisma.activity.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw createError('Atividade não encontrada', 404);

  const activity = await prisma.activity.update({
    where: { id: req.params.id },
    data: { status: 'completed' },
  });

  await recordActivityLinkedTimelines(
    tenantId,
    activity,
    'activity_completed',
    `Atividade "${activity.title}" concluída`,
    req.user?.id
  );

  res.json({ status: 'success', data: activity });
});
