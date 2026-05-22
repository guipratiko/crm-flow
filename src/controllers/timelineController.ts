import { Response, NextFunction } from 'express';
import { TimelineEntityType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { listTimeline } from '../services/timelineService';
import { createError } from '../middleware/errorHandler';

function parseEntityType(raw: string): TimelineEntityType | null {
  if (raw === 'contact' || raw === 'company' || raw === 'deal') return raw;
  return null;
}

export async function getContactTimeline(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const events = await listTimeline(req.tenantId!, 'contact', req.params.id);
    res.json({ status: 'success', data: events });
  } catch (e) {
    next(e);
  }
}

export async function getCompanyTimeline(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const events = await listTimeline(req.tenantId!, 'company', req.params.id);
    res.json({ status: 'success', data: events });
  } catch (e) {
    next(e);
  }
}

export async function getDealTimeline(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const events = await listTimeline(req.tenantId!, 'deal', req.params.id);
    res.json({ status: 'success', data: events });
  } catch (e) {
    next(e);
  }
}
