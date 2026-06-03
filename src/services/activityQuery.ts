import { Prisma } from '@prisma/client';
import { startOfLocalDay, endOfLocalDay } from '../utils/dateHelpers';

export type ActivityListQuery = {
  status?: string;
  filter?: string;
  dealId?: string;
  contactId?: string;
};

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

  if (query.filter === 'pending') where.status = 'pending';
  if (query.filter === 'completed') where.status = 'completed';
  if (query.filter === 'overdue') {
    where.status = 'pending';
    where.dueDate = { lt: now };
  }
  if (query.filter === 'today') {
    where.status = 'pending';
    where.dueDate = { gte: startOfLocalDay(now), lte: endOfLocalDay(now) };
  }

  return where;
}
