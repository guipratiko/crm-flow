import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import {
  listActivityTypesForTenant,
  nextActivityTypeSlug,
} from '../services/activityTypeDefsService';
import { requireTenantId, asyncHandler } from '../utils/requestContext';
import { z } from 'zod';

const createBody = z.object({
  name: z.string().min(1).max(120),
});

const updateBody = z.object({
  name: z.string().min(1).max(120),
});

const reorderBody = z.object({
  typeIds: z.array(z.string().uuid()).min(1),
});

export const listActivityTypeDefs = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const data = await listActivityTypesForTenant(tenantId);
  res.json({ status: 'success', data });
});

export const createActivityTypeDef = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) throw createError(parsed.error.errors[0]?.message || 'Dados inválidos');

  const slug = await nextActivityTypeSlug(tenantId);

  const maxOrder = await prisma.activityTypeDef.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });

  const row = await prisma.activityTypeDef.create({
    data: {
      tenantId,
      name: parsed.data.name.trim(),
      slug,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      isSystem: false,
    },
  });

  res.status(201).json({ status: 'success', data: row });
});

export const updateActivityTypeDef = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const parsed = updateBody.safeParse(req.body);
  if (!parsed.success) throw createError(parsed.error.errors[0]?.message || 'Dados inválidos');

  const existing = await prisma.activityTypeDef.findFirst({
    where: { id: req.params.id, tenantId },
  });
  if (!existing) throw createError('Tipo não encontrado', 404);

  const row = await prisma.activityTypeDef.update({
    where: { id: existing.id },
    data: { name: parsed.data.name.trim() },
  });

  res.json({ status: 'success', data: row });
});

export const reorderActivityTypeDefs = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const parsed = reorderBody.safeParse(req.body);
  if (!parsed.success) throw createError(parsed.error.errors[0]?.message || 'Dados inválidos');

  const typeIds = parsed.data.typeIds;
  const rows = await prisma.activityTypeDef.findMany({ where: { tenantId } });
  const known = new Set(rows.map((r) => r.id));

  if (typeIds.length !== rows.length) {
    throw createError('Informe todos os tipos na nova ordem.', 400);
  }
  for (const id of typeIds) {
    if (!known.has(id)) throw createError('Tipo inválido.', 400);
  }

  await prisma.$transaction(
    typeIds.map((id, sortOrder) =>
      prisma.activityTypeDef.update({
        where: { id },
        data: { sortOrder },
      })
    )
  );

  const data = await listActivityTypesForTenant(tenantId);
  res.json({ status: 'success', data });
});

export const deleteActivityTypeDef = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const { id } = req.params;
  const row = await prisma.activityTypeDef.findFirst({ where: { id, tenantId } });
  if (!row) throw createError('Tipo não encontrado', 404);

  const inUse = await prisma.activity.count({ where: { tenantId, type: row.slug } });
  if (inUse > 0) {
    throw createError('Não é possível excluir: existem atividades com este tipo.', 409);
  }

  await prisma.activityTypeDef.delete({ where: { id } });
  res.json({ status: 'success', message: 'Tipo removido' });
});
