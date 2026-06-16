import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { dealBody } from '../../schemas';
import { createError } from '../../middleware/errorHandler';
import { recordTimeline } from '../../services/timelineService';
import { ensureDefaultPipeline, assertPipelineStageExists } from '../../services/pipelineService';
import { dealInclude } from '../../prisma/includes';
import { requireTenantId, parseBody, asyncHandler } from '../../utils/requestContext';

export const listDeals = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const pipelineId = req.query.pipelineId as string | undefined;
  const deals = await prisma.deal.findMany({
    where: { tenantId, ...(pipelineId ? { pipelineId } : {}) },
    include: dealInclude,
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ status: 'success', data: deals });
});

export const getDeal = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const deal = await prisma.deal.findFirst({
    where: { id: req.params.id, tenantId },
    include: {
      ...dealInclude,
      activities: { orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }], take: 50 },
    },
  });
  if (!deal) throw createError('Negócio não encontrado', 404);
  res.json({ status: 'success', data: deal });
});

export const createDeal = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const data = parseBody(dealBody, req.body);
  const pipeline = await ensureDefaultPipeline(tenantId);
  const stageRef = data.stageId ?? String(pipeline.stages[0]?.shortId ?? pipeline.stages[0]?.id ?? '');
  if (!stageRef) throw createError('Funil sem etapas', 500);

  const stage = await assertPipelineStageExists(tenantId, stageRef);
  const deal = await prisma.deal.create({
    data: {
      tenantId,
      title: data.title,
      description: data.description ?? null,
      value: new Prisma.Decimal(data.value ?? 0),
      status: data.status ?? 'open',
      probability: data.probability ?? stage.probability ?? 0,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      pipelineId: data.pipelineId ?? pipeline.id,
      stageId: stage.id,
      companyId: data.companyId ?? null,
      mainContactId: data.mainContactId ?? null,
      responsibleUserId: data.responsibleUserId ?? req.user?.id ?? null,
      lossReason: data.lossReason ?? null,
    },
    include: dealInclude,
  });

  if (data.mainContactId) {
    await prisma.dealContact.upsert({
      where: { dealId_contactId: { dealId: deal.id, contactId: data.mainContactId } },
      create: { tenantId, dealId: deal.id, contactId: data.mainContactId, role: 'Principal' },
      update: {},
    });
  }

  await recordTimeline({
    tenantId,
    entityType: 'deal',
    entityId: deal.id,
    action: 'deal_created',
    description: `Negócio "${deal.title}" criado`,
    userId: req.user?.id,
  });

  res.status(201).json({ status: 'success', data: deal });
});

export const updateDeal = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const d = parseBody(dealBody.partial(), req.body);
  const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw createError('Negócio não encontrado', 404);

  const deal = await prisma.deal.update({
    where: { id: req.params.id },
    data: {
      ...d,
      value: d.value !== undefined ? new Prisma.Decimal(d.value) : undefined,
      expectedCloseDate:
        d.expectedCloseDate !== undefined
          ? d.expectedCloseDate
            ? new Date(d.expectedCloseDate)
            : null
          : undefined,
    },
    include: dealInclude,
  });

  await recordTimeline({
    tenantId,
    entityType: 'deal',
    entityId: deal.id,
    action: 'deal_updated',
    description: `Negócio "${deal.title}" atualizado`,
    userId: req.user?.id,
  });

  res.json({ status: 'success', data: deal });
});

export const deleteDeal = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw createError('Negócio não encontrado', 404);
  await prisma.deal.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', message: 'Negócio removido' });
});

export const listPipelines = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const pipeline = await ensureDefaultPipeline(tenantId);
  res.json({ status: 'success', data: pipeline });
});
