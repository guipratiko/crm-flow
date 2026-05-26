import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

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

function localDigestDay(d = new Date()): Date {
  const x = startOfLocalDay(d);
  return x;
}

type ReminderRow = {
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

function mapReminderRow(
  a: Awaited<ReturnType<typeof prisma.activity.findMany>>[number] & {
    deal?: { title: string } | null;
    contact?: { name: string } | null;
    company?: { name: string } | null;
  }
): ReminderRow {
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

const activityInclude = {
  deal: { select: { id: true, title: true } },
  contact: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
} as const;

/** Atividades pendentes com vencimento hoje, ainda sem lembrete enviado, dentro da janela (até 30 min à frente). */
export async function listPendingReminders(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const leadMinutes = 30;
    const dueBefore = new Date(now.getTime() + leadMinutes * 60_000);
    const startToday = startOfLocalDay(now);

    const rows = await prisma.activity.findMany({
      where: {
        status: 'pending',
        dueDate: { not: null, gte: startToday, lte: dueBefore },
        reminderSentAt: null,
      },
      include: activityInclude,
      orderBy: { dueDate: 'asc' },
      take: 200,
    });

    res.json({
      status: 'success',
      data: rows.map(mapReminderRow),
    });
  } catch (e) {
    next(e);
  }
}

/** Atividades pendentes com vencimento no passado, sem lembrete de atraso enviado. */
export async function listOverdueReminders(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const rows = await prisma.activity.findMany({
      where: {
        status: 'pending',
        dueDate: { not: null, lt: now },
        overdueReminderSentAt: null,
      },
      include: activityInclude,
      orderBy: { dueDate: 'asc' },
      take: 200,
    });

    res.json({
      status: 'success',
      data: rows.map(mapReminderRow),
    });
  } catch (e) {
    next(e);
  }
}

export type DailyDigestPayload = {
  tenantId: string;
  userId: string;
  overdueCount: number;
  todayCount: number;
  items: ReminderRow[];
};

/** Resumo diário por responsável (pendentes atrasadas + vencendo hoje), uma vez por dia. */
export async function listDailyDigestTargets(_req: Request, res: Response, next: NextFunction) {
  try {
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
      include: activityInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 2000,
    });

    const byUser = new Map<string, DailyDigestPayload>();
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
      if (bucket.items.length < 15) bucket.items.push(mapReminderRow(a));
    }

    res.json({
      status: 'success',
      data: Array.from(byUser.values()).filter((b) => b.overdueCount + b.todayCount > 0),
    });
  } catch (e) {
    next(e);
  }
}

export async function markRemindersSent(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]).filter(Boolean) : [];
    if (!ids.length) {
      res.json({ status: 'success', data: { updated: 0 } });
      return;
    }
    const now = new Date();
    const result = await prisma.activity.updateMany({
      where: { id: { in: ids }, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    res.json({ status: 'success', data: { updated: result.count } });
  } catch (e) {
    next(e);
  }
}

export async function markOverdueRemindersSent(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]).filter(Boolean) : [];
    if (!ids.length) {
      res.json({ status: 'success', data: { updated: 0 } });
      return;
    }
    const now = new Date();
    const result = await prisma.activity.updateMany({
      where: { id: { in: ids }, overdueReminderSentAt: null },
      data: { overdueReminderSentAt: now },
    });
    res.json({ status: 'success', data: { updated: result.count } });
  } catch (e) {
    next(e);
  }
}

export async function markDailyDigestsSent(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const digestDay = localDigestDay();
    type DigestEntry = { tenantId?: string; userId?: string };
    const rows = (entries as DigestEntry[])
      .filter((e) => e && typeof e === 'object')
      .map((e) => ({
        tenantId: String(e.tenantId || '').trim(),
        userId: String(e.userId || '').trim(),
      }))
      .filter((r) => r.tenantId && r.userId);

    if (!rows.length) {
      res.json({ status: 'success', data: { created: 0 } });
      return;
    }

    const result = await prisma.activityDigestLog.createMany({
      data: rows.map((r) => ({ tenantId: r.tenantId, userId: r.userId, digestDay })),
      skipDuplicates: true,
    });
    res.json({ status: 'success', data: { created: result.count } });
  } catch (e) {
    next(e);
  }
}
