import { Request, Response, NextFunction } from 'express';
import {
  fetchPendingReminders,
  fetchOverdueReminders,
  fetchDailyDigestTargets,
  markRemindersSent as persistRemindersSent,
  markOverdueRemindersSent as persistOverdueRemindersSent,
  markDailyDigestsSent as persistDailyDigestsSent,
  type DailyDigestPayload,
} from '../../services/activityReminderService';

export type { DailyDigestPayload };

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
