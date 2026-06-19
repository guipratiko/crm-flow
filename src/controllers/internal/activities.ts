import { Request, Response, NextFunction } from 'express';
import {
  fetchPendingReminders,
  fetchOverdueReminders,
  fetchDailyDigestTargets,
  markRemindersSent as persistRemindersSent,
  markOverdueRemindersSent as persistOverdueRemindersSent,
  markDailyDigestsSent as persistDailyDigestsSent,
  fetchPendingWhatsappReminders,
  fetchOverdueWhatsappReminders,
  fetchDailyDigestWhatsappTargets,
  fetchTenantDailyDigestWhatsapp,
  markWhatsappRemindersSent as persistWhatsappRemindersSent,
  markOverdueWhatsappRemindersSent as persistOverdueWhatsappRemindersSent,
  markDailyDigestsWhatsappSent as persistDailyDigestsWhatsappSent,
  fetchPendingPushReminders,
  fetchOverduePushReminders,
  fetchDailyDigestPushTargets,
  markPushRemindersSent as persistPushRemindersSent,
  markOverduePushRemindersSent as persistOverduePushRemindersSent,
  markDailyDigestsPushSent as persistDailyDigestsPushSent,
  type DailyDigestPayload,
  type ReminderQueryOptions,
} from '../../services/activityReminderService';

export type { DailyDigestPayload };

function parseTenantIds(req: Request): string[] | undefined {
  const raw = req.query.tenantIds;
  if (raw == null || raw === '') return undefined;
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts;
}

function parseOptionalInt(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseReminderQuery(req: Request): ReminderQueryOptions {
  return {
    tenantIds: parseTenantIds(req),
    leadMinutes: parseOptionalInt(req.query.leadMinutes),
    overdueDelayMinutes: parseOptionalInt(req.query.overdueDelayMinutes),
  };
}

export async function listPendingReminders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchPendingReminders(parseReminderQuery(req)) });
  } catch (e) {
    next(e);
  }
}

export async function listOverdueReminders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchOverdueReminders(parseReminderQuery(req)) });
  } catch (e) {
    next(e);
  }
}

export async function listDailyDigestTargets(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchDailyDigestTargets(parseTenantIds(req)) });
  } catch (e) {
    next(e);
  }
}

export async function listPendingWhatsappReminders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchPendingWhatsappReminders(parseReminderQuery(req)) });
  } catch (e) {
    next(e);
  }
}

export async function listOverdueWhatsappReminders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchOverdueWhatsappReminders(parseReminderQuery(req)) });
  } catch (e) {
    next(e);
  }
}

export async function listDailyDigestWhatsappTargets(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchDailyDigestWhatsappTargets(parseTenantIds(req)) });
  } catch (e) {
    next(e);
  }
}

export async function listTenantDailyDigestWhatsapp(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = String(req.params.tenantId || '').trim();
    if (!tenantId) {
      res.status(400).json({ status: 'error', message: 'tenantId é obrigatório' });
      return;
    }
    res.json({ status: 'success', data: await fetchTenantDailyDigestWhatsapp(tenantId) });
  } catch (e) {
    next(e);
  }
}

export async function markRemindersSent(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]).filter(Boolean) : [];
    const updated = await persistRemindersSent(ids);
    res.json({ status: 'success', data: { updated } });
  } catch (e) {
    next(e);
  }
}

export async function markOverdueRemindersSent(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]).filter(Boolean) : [];
    const updated = await persistOverdueRemindersSent(ids);
    res.json({ status: 'success', data: { updated } });
  } catch (e) {
    next(e);
  }
}

export async function markDailyDigestsSent(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const created = await persistDailyDigestsSent(entries);
    res.json({ status: 'success', data: { created } });
  } catch (e) {
    next(e);
  }
}

export async function markWhatsappRemindersSent(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]).filter(Boolean) : [];
    const updated = await persistWhatsappRemindersSent(ids);
    res.json({ status: 'success', data: { updated } });
  } catch (e) {
    next(e);
  }
}

export async function markOverdueWhatsappRemindersSent(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]).filter(Boolean) : [];
    const updated = await persistOverdueWhatsappRemindersSent(ids);
    res.json({ status: 'success', data: { updated } });
  } catch (e) {
    next(e);
  }
}

export async function markDailyDigestsWhatsappSent(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const created = await persistDailyDigestsWhatsappSent(entries);
    res.json({ status: 'success', data: { created } });
  } catch (e) {
    next(e);
  }
}

export async function listPendingPushReminders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchPendingPushReminders(parseReminderQuery(req)) });
  } catch (e) {
    next(e);
  }
}

export async function listOverduePushReminders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchOverduePushReminders(parseReminderQuery(req)) });
  } catch (e) {
    next(e);
  }
}

export async function listDailyDigestPushTargets(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchDailyDigestPushTargets(parseTenantIds(req)) });
  } catch (e) {
    next(e);
  }
}

export async function markPushRemindersSent(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]).filter(Boolean) : [];
    const updated = await persistPushRemindersSent(ids);
    res.json({ status: 'success', data: { updated } });
  } catch (e) {
    next(e);
  }
}

export async function markOverduePushRemindersSent(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]).filter(Boolean) : [];
    const updated = await persistOverduePushRemindersSent(ids);
    res.json({ status: 'success', data: { updated } });
  } catch (e) {
    next(e);
  }
}

export async function markDailyDigestsPushSent(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const created = await persistDailyDigestsPushSent(entries);
    res.json({ status: 'success', data: { created } });
  } catch (e) {
    next(e);
  }
}
