import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import {
  listAgendaViewsForTenant,
  parseAgendaFilterConfig,
  type AgendaFilterConfig,
} from '../services/agendaViewsService';
import { requireTenantId, asyncHandler } from '../utils/requestContext';
import { z } from 'zod';

const filterConfigSchema = z.union([
  z.object({
    preset: z.enum(['pending', 'overdue', 'today', 'completed']),
  }),
  z.object({
    preset: z.literal('custom'),
    statuses: z.array(z.enum(['pending', 'completed', 'cancelled'])).optional(),
    activityTypeSlugs: z.array(z.string().min(1)).optional(),
    dueWithinDays: z.number().int().positive().optional(),
    overdueOnly: z.boolean().optional(),
  }),
]);

const createBody = z.object({
  name: z.string().min(1).max(120),
  filterConfig: filterConfigSchema,
});

const updateBody = z.object({
  name: z.string().min(1).max(120).optional(),
  filterConfig: filterConfigSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const reorderBody = z.object({
  viewIds: z.array(z.string().uuid()).min(1),
});

export const listAgendaViews = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const data = await listAgendaViewsForTenant(tenantId);
  res.json({ status: 'success', data });
});

export const createAgendaView = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) throw createError(parsed.error.errors[0]?.message || 'Dados inválidos');

  const maxOrder = await prisma.agendaView.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });

  const row = await prisma.agendaView.create({
    data: {
      tenantId,
      name: parsed.data.name.trim(),
      filterConfig: parsed.data.filterConfig as Prisma.InputJsonValue,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      isSystem: false,
    },
  });

  res.status(201).json({ status: 'success', data: row });
});

export const updateAgendaView = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const parsed = updateBody.safeParse(req.body);
  if (!parsed.success) throw createError(parsed.error.errors[0]?.message || 'Dados inválidos');

  const existing = await prisma.agendaView.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw createError('View não encontrada', 404);

  const row = await prisma.agendaView.update({
    where: { id: req.params.id },
    data: {
      name: parsed.data.name?.trim(),
      sortOrder: parsed.data.sortOrder,
      filterConfig:
        parsed.data.filterConfig != null
          ? (parsed.data.filterConfig as Prisma.InputJsonValue)
          : undefined,
    },
  });

  res.json({ status: 'success', data: row });
});

export const reorderAgendaViews = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const parsed = reorderBody.safeParse(req.body);
  if (!parsed.success) throw createError(parsed.error.errors[0]?.message || 'Dados inválidos');

  const viewIds = parsed.data.viewIds;
  const rows = await prisma.agendaView.findMany({ where: { tenantId } });
  const known = new Set(rows.map((r) => r.id));

  if (viewIds.length !== rows.length) {
    throw createError('Informe todas as views na nova ordem.', 400);
  }
  for (const id of viewIds) {
    if (!known.has(id)) throw createError('View inválida.', 400);
  }

  await prisma.$transaction(
    viewIds.map((id, sortOrder) =>
      prisma.agendaView.update({
        where: { id },
        data: { sortOrder },
      })
    )
  );

  const data = await listAgendaViewsForTenant(tenantId);
  res.json({ status: 'success', data });
});

export const deleteAgendaView = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const existing = await prisma.agendaView.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw createError('View não encontrada', 404);

  await prisma.agendaView.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', message: 'View removida' });
});

export async function resolveAgendaViewFilter(
  tenantId: string,
  viewId: string
): Promise<AgendaFilterConfig | null> {
  const view = await prisma.agendaView.findFirst({ where: { id: viewId, tenantId } });
  if (!view) return null;
  return parseAgendaFilterConfig(view.filterConfig);
}
