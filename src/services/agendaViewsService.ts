import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

export type AgendaFilterPreset = 'pending' | 'overdue' | 'today' | 'completed';

export type AgendaFilterConfig =
  | { preset: AgendaFilterPreset }
  | {
      preset: 'custom';
      statuses?: ('pending' | 'completed' | 'cancelled')[];
      activityTypeSlugs?: string[];
      dueWithinDays?: number;
      overdueOnly?: boolean;
    };

export const DEFAULT_AGENDA_VIEWS: { name: string; filterConfig: AgendaFilterConfig }[] = [
  { name: 'Pendentes', filterConfig: { preset: 'pending' } },
  { name: 'Atrasadas', filterConfig: { preset: 'overdue' } },
  { name: 'Hoje', filterConfig: { preset: 'today' } },
  { name: 'Concluídas', filterConfig: { preset: 'completed' } },
];

export async function ensureDefaultAgendaViews(tenantId: string): Promise<void> {
  const count = await prisma.agendaView.count({ where: { tenantId } });
  if (count > 0) return;
  await prisma.agendaView.createMany({
    data: DEFAULT_AGENDA_VIEWS.map((d, i) => ({
      tenantId,
      name: d.name,
      sortOrder: i,
      filterConfig: d.filterConfig as Prisma.InputJsonValue,
      isSystem: true,
    })),
  });
}

export async function listAgendaViewsForTenant(tenantId: string) {
  await ensureDefaultAgendaViews(tenantId);
  return prisma.agendaView.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export function parseAgendaFilterConfig(raw: unknown): AgendaFilterConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const preset = String(o.preset || '');
  if (['pending', 'overdue', 'today', 'completed'].includes(preset)) {
    return { preset: preset as AgendaFilterPreset };
  }
  if (preset === 'custom') {
    const statuses = Array.isArray(o.statuses)
      ? o.statuses.map((s) => String(s)).filter((s): s is 'pending' | 'completed' | 'cancelled' =>
          ['pending', 'completed', 'cancelled'].includes(s)
        )
      : undefined;
    const activityTypeSlugs = Array.isArray(o.activityTypeSlugs)
      ? o.activityTypeSlugs.map((s) => String(s).trim()).filter(Boolean)
      : undefined;
    const dueWithinDays =
      o.dueWithinDays != null && String(o.dueWithinDays).trim() !== ''
        ? Number(o.dueWithinDays)
        : undefined;
    return {
      preset: 'custom',
      statuses: statuses?.length ? statuses : undefined,
      activityTypeSlugs: activityTypeSlugs?.length ? activityTypeSlugs : undefined,
      dueWithinDays:
        dueWithinDays != null && Number.isFinite(dueWithinDays) && dueWithinDays > 0
          ? Math.floor(dueWithinDays)
          : undefined,
      overdueOnly: o.overdueOnly === true,
    };
  }
  return null;
}
