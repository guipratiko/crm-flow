/**
 * Lembretes e digest diário — consumidos pela API interna (backend / cron).
 */

import { prisma } from '../lib/prisma';
import { ACTIVITY_REMINDER_CONFIG } from '../config/constants';
import { activityReminderInclude } from '../prisma/includes';
import { endOfLocalDay, localDigestDay, startOfLocalDay } from '../utils/dateHelpers';

export type ReminderRow = {
  id: string;
  tenantId: string;
  title: string;
  type: string;
  dueDate: string | null;
  responsibleUserId: string | null;
  dealTitle: string | null;
  contactName: string | null;
  companyName: string | null;
};

export type DailyDigestPayload = {
  tenantId: string;
  userId: string;
  overdueCount: number;
  todayCount: number;
  items: ReminderRow[];
};

type ActivityWithRelations = Awaited<ReturnType<typeof prisma.activity.findMany>>[number] & {
  deal?: { title: string } | null;
  contact?: { name: string } | null;
  company?: { name: string } | null;
};

function mapReminderRow(a: ActivityWithRelations): ReminderRow {
  return {
    id: a.id,
    tenantId: a.tenantId,
    title: a.title,
    type: a.type,
    dueDate: a.dueDate?.toISOString() ?? null,
    responsibleUserId: a.responsibleUserId,
    dealTitle: a.deal?.title ?? null,
    contactName: a.contact?.name ?? null,
    companyName: a.company?.name ?? null,
  };
}

export async function fetchPendingReminders(): Promise<ReminderRow[]> {
  const now = new Date();
  const dueBefore = new Date(now.getTime() + ACTIVITY_REMINDER_CONFIG.LEAD_MINUTES * 60_000);
  const startToday = startOfLocalDay(now);

  const rows = await prisma.activity.findMany({
    where: {
      status: 'pending',
      dueDate: { not: null, gte: startToday, lte: dueBefore },
      reminderSentAt: null,
    },
    include: activityReminderInclude,
    orderBy: { dueDate: 'asc' },
    take: ACTIVITY_REMINDER_CONFIG.QUERY_LIMIT,
  });

  return rows.map(mapReminderRow);
}

export async function fetchOverdueReminders(): Promise<ReminderRow[]> {
  const now = new Date();
  const rows = await prisma.activity.findMany({
    where: {
      status: 'pending',
      dueDate: { not: null, lt: now },
      overdueReminderSentAt: null,
    },
    include: activityReminderInclude,
    orderBy: { dueDate: 'asc' },
    take: ACTIVITY_REMINDER_CONFIG.QUERY_LIMIT,
  });

  return rows.map(mapReminderRow);
}

export async function fetchDailyDigestTargets(): Promise<DailyDigestPayload[]> {
  const now = new Date();
  const startToday = startOfLocalDay(now);
  const endToday = endOfLocalDay(now);
  const digestDay = localDigestDay(now);

  const sentToday = await prisma.activityDigestLog.findMany({
    where: { digestDay },
    select: { tenantId: true, userId: true },
  });
  const sentKey = new Set(sentToday.map((r) => `${r.tenantId}:${r.userId}`));

  const activities = await prisma.activity.findMany({
    where: {
      status: 'pending',
      responsibleUserId: { not: null },
      dueDate: { not: null },
      OR: [{ dueDate: { lt: now } }, { dueDate: { gte: startToday, lte: endToday } }],
    },
    include: activityReminderInclude,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: ACTIVITY_REMINDER_CONFIG.DIGEST_ACTIVITY_LIMIT,
  });

  const byUser = new Map<string, DailyDigestPayload>();
  const maxItems = ACTIVITY_REMINDER_CONFIG.DIGEST_ITEMS_PER_USER;

  for (const a of activities) {
    const userId = a.responsibleUserId!;
    const key = `${a.tenantId}:${userId}`;
    if (sentKey.has(key)) continue;

    let bucket = byUser.get(key);
    if (!bucket) {
      bucket = { tenantId: a.tenantId, userId, overdueCount: 0, todayCount: 0, items: [] };
      byUser.set(key, bucket);
    }

    const due = a.dueDate!.getTime();
    if (due < now.getTime()) bucket.overdueCount += 1;
    else if (due >= startToday.getTime() && due <= endToday.getTime()) bucket.todayCount += 1;
    if (bucket.items.length < maxItems) bucket.items.push(mapReminderRow(a));
  }

  return Array.from(byUser.values()).filter((b) => b.overdueCount + b.todayCount > 0);
}

export async function markRemindersSent(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const now = new Date();
  const result = await prisma.activity.updateMany({
    where: { id: { in: ids }, reminderSentAt: null },
    data: { reminderSentAt: now },
  });
  return result.count;
}

export async function markOverdueRemindersSent(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const now = new Date();
  const result = await prisma.activity.updateMany({
    where: { id: { in: ids }, overdueReminderSentAt: null },
    data: { overdueReminderSentAt: now },
  });
  return result.count;
}

export async function markDailyDigestsSent(
  entries: Array<{ tenantId?: string; userId?: string }>
): Promise<number> {
  const digestDay = localDigestDay();
  const rows = entries
    .filter((e) => e && typeof e === 'object')
    .map((e) => ({
      tenantId: String(e.tenantId || '').trim(),
      userId: String(e.userId || '').trim(),
    }))
    .filter((r) => r.tenantId && r.userId);

  if (!rows.length) return 0;

  const result = await prisma.activityDigestLog.createMany({
    data: rows.map((r) => ({ tenantId: r.tenantId, userId: r.userId, digestDay })),
    skipDuplicates: true,
  });
  return result.count;
}
