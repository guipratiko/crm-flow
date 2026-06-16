import { Prisma } from '@prisma/client';
import { startOfLocalDay, endOfLocalDay } from '../utils/dateHelpers';
import type { AgendaFilterConfig } from './agendaViewsService';

export type ActivityListQuery = {
  status?: string;
  filter?: string;
  viewId?: string;
  filterConfig?: AgendaFilterConfig | null;
  dealId?: string;
  contactId?: string;
};

function applyPresetFilter(
  where: Prisma.ActivityWhereInput,
  preset: string,
  now: Date
): void {
  if (preset === 'pending') where.status = 'pending';
  if (preset === 'completed') where.status = 'completed';
  if (preset === 'overdue') {
    where.status = 'pending';
    where.dueDate = { lt: now };
  }
  if (preset === 'today') {
    where.status = 'pending';
    where.dueDate = { gte: startOfLocalDay(now), lte: endOfLocalDay(now) };
  }
}

function applyCustomFilter(where: Prisma.ActivityWhereInput, config: AgendaFilterConfig, now: Date): void {
  if (config.preset !== 'custom') return;
  if (config.statuses?.length) {
    where.status = { in: config.statuses };
  }
  if (config.activityTypeSlugs?.length) {
    where.type = { in: config.activityTypeSlugs };
  }
  const dueParts: Prisma.DateTimeNullableFilter = {};
  if (config.overdueOnly) {
    dueParts.lt = now;
    if (!config.statuses?.length) where.status = 'pending';
  }
  if (config.dueWithinDays != null && config.dueWithinDays > 0) {
    const end = new Date(now);
    end.setDate(end.getDate() + config.dueWithinDays);
    dueParts.gte = now;
    dueParts.lte = end;
  }
  if (Object.keys(dueParts).length > 0) {
    where.dueDate = dueParts;
  }
}

/** Monta filtro Prisma para listagem de atividades (API autenticada). */
export function buildActivityListWhere(
  tenantId: string,
  query: ActivityListQuery
): Prisma.ActivityWhereInput {
  const now = new Date();
  const where: Prisma.ActivityWhereInput = { tenantId };

  if (query.dealId) where.dealId = query.dealId;
  if (query.contactId) where.contactId = query.contactId;

  if (query.status) {
    where.status = query.status as 'pending' | 'completed' | 'cancelled';
  }

  if (query.filterConfig) {
    const cfg = query.filterConfig;
    if (cfg.preset === 'custom') {
      applyCustomFilter(where, cfg, now);
    } else {
      applyPresetFilter(where, cfg.preset, now);
    }
  } else if (query.filter) {
    applyPresetFilter(where, query.filter, now);
  }

  return where;
}
