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

export async function listPendingReminders(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchPendingReminders() });
  } catch (e) {
    next(e);
  }
}

export async function listOverdueReminders(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchOverdueReminders() });
  } catch (e) {
    next(e);
  }
}

export async function listDailyDigestTargets(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchDailyDigestTargets() });
  } catch (e) {
    next(e);
  }
}

export async function listPendingWhatsappReminders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchPendingWhatsappReminders(parseTenantIds(req)) });
  } catch (e) {
    next(e);
  }
}

export async function listOverdueWhatsappReminders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchOverdueWhatsappReminders(parseTenantIds(req)) });
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

export async function listPendingPushReminders(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchPendingPushReminders() });
  } catch (e) {
    next(e);
  }
}

export async function listOverduePushReminders(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchOverduePushReminders() });
  } catch (e) {
    next(e);
  }
}

export async function listDailyDigestPushTargets(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ status: 'success', data: await fetchDailyDigestPushTargets() });
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
