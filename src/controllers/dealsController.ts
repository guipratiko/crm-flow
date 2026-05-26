import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { dealBody, moveStageBody, dealContactBody, dealProductBody } from '../schemas';
import { createError } from '../middleware/errorHandler';
import { recordTimeline } from '../services/timelineService';
import { ensureDefaultPipeline } from '../services/pipelineService';
import { recalcDealProductTotal, syncDealValueFromProducts } from '../utils/dealTotals';

const dealInclude = {
  stage: true,
  pipeline: true,
  company: { select: { id: true, name: true } },
  mainContact: { select: { id: true, name: true, email: true, phone: true } },
  contacts: { include: { contact: true } },
  products: { include: { product: true } },
};

export async function listDeals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const pipelineId = req.query.pipelineId as string | undefined;
    const deals = await prisma.deal.findMany({
      where: { tenantId, ...(pipelineId ? { pipelineId } : {}) },
      include: dealInclude,
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ status: 'success', data: deals });
  } catch (e) {
    next(e);
  }
}

export async function getDeal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        ...dealInclude,
        activities: { orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }], take: 50 },
      },
    });
    if (!deal) return next(createError('Negócio não encontrado', 404));
    res.json({ status: 'success', data: deal });
  } catch (e) {
    next(e);
  }
}

export async function createDeal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = dealBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const data = parsed.data;
    const pipeline = await ensureDefaultPipeline(tenantId);
    const stageId = data.stageId || pipeline.stages[0]?.id;
    if (!stageId) return next(createError('Funil sem etapas', 500));
    const stage = pipeline.stages.find((s) => s.id === stageId);
    const deal = await prisma.deal.create({
      data: {
        tenantId,
        title: data.title,
        description: data.description ?? null,
        value: new Prisma.Decimal(data.value ?? 0),
        status: data.status ?? 'open',
        probability: data.probability ?? stage?.probability ?? 0,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        pipelineId: data.pipelineId ?? pipeline.id,
        stageId,
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
  } catch (e) {
    next(e);
  }
}

export async function updateDeal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = dealBody.partial().safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Negócio não encontrado', 404));
    const d = parsed.data;
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
  } catch (e) {
    next(e);
  }
}

export async function deleteDeal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return next(createError('Negócio não encontrado', 404));
    await prisma.deal.delete({ where: { id: req.params.id } });
    res.json({ status: 'success', message: 'Negócio removido' });
  } catch (e) {
    next(e);
  }
}

export async function moveDealStage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = moveStageBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId }, include: { stage: true } });
    if (!deal) return next(createError('Negócio não encontrado', 404));
    const newStage = await prisma.pipelineStage.findFirst({
      where: { id: parsed.data.stageId, tenantId },
    });
    if (!newStage) return next(createError('Etapa não encontrada', 404));
    const isWon = newStage.name.toLowerCase().includes('ganho');
    const isLost = newStage.name.toLowerCase().includes('perdido');
    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stageId: newStage.id,
        probability: newStage.probability,
        status: isWon ? 'won' : isLost ? 'lost' : 'open',
        lossReason: isLost ? parsed.data.lossReason ?? deal.lossReason : null,
      },
      include: dealInclude,
    });
    await recordTimeline({
      tenantId,
      entityType: 'deal',
      entityId: deal.id,
      action: 'deal_stage_moved',
      description: `Negócio movido de "${deal.stage.name}" para "${newStage.name}"`,
      userId: req.user?.id,
      metadata: { fromStageId: deal.stageId, toStageId: newStage.id },
    });
    res.json({ status: 'success', data: updated });
  } catch (e) {
    next(e);
  }
}

export async function addDealContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = dealContactBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const deal = await prisma.deal.findFirst({ where: { id: req.params.dealId, tenantId } });
    if (!deal) return next(createError('Negócio não encontrado', 404));
    const contact = await prisma.contact.findFirst({
      where: { id: parsed.data.contactId, tenantId },
    });
    if (!contact) return next(createError('Contato não encontrado', 404));
    const whereKey = { dealId: deal.id, contactId: parsed.data.contactId };
    const alreadyLinked = await prisma.dealContact.findUnique({
      where: { dealId_contactId: whereKey },
    });
    const link = await prisma.dealContact.upsert({
      where: { dealId_contactId: whereKey },
      create: {
        tenantId,
        dealId: deal.id,
        contactId: parsed.data.contactId,
        role: parsed.data.role ?? null,
      },
      update: parsed.data.role ? { role: parsed.data.role } : {},
      include: { contact: true },
    });
    if (!alreadyLinked) {
      await recordTimeline({
        tenantId,
        entityType: 'deal',
        entityId: deal.id,
        action: 'deal_contact_linked',
        description: `Contato vinculado ao negócio (${parsed.data.role || 'envolvido'})`,
        userId: req.user?.id,
      });
    }
    res.status(alreadyLinked ? 200 : 201).json({ status: 'success', data: link });
  } catch (e) {
    next(e);
  }
}

export async function removeDealContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    await prisma.dealContact.deleteMany({
      where: { tenantId, dealId: req.params.dealId, contactId: req.params.contactId },
    });
    res.json({ status: 'success', message: 'Vínculo removido' });
  } catch (e) {
    next(e);
  }
}

export async function addDealProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = dealProductBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const deal = await prisma.deal.findFirst({ where: { id: req.params.dealId, tenantId } });
    if (!deal) return next(createError('Negócio não encontrado', 404));
    const product = await prisma.product.findFirst({
      where: { id: parsed.data.productId, tenantId },
    });
    if (!product) return next(createError('Produto não encontrado', 404));
    const qty = parsed.data.quantity ?? 1;
    const unitPrice = new Prisma.Decimal(parsed.data.unitPrice ?? Number(product.price));
    const discount = new Prisma.Decimal(parsed.data.discount ?? 0);
    const total = recalcDealProductTotal(qty, unitPrice, discount);
    const row = await prisma.dealProduct.create({
      data: {
        tenantId,
        dealId: deal.id,
        productId: product.id,
        quantity: qty,
        unitPrice,
        discount,
        total,
      },
      include: { product: true },
    });
    await syncDealValueFromProducts(deal.id, tenantId);
    await recordTimeline({
      tenantId,
      entityType: 'deal',
      entityId: deal.id,
      action: 'deal_product_added',
      description: `Produto "${product.name}" adicionado ao negócio`,
      userId: req.user?.id,
    });
    res.status(201).json({ status: 'success', data: row });
  } catch (e) {
    next(e);
  }
}

export async function removeDealProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const dealId = req.params.dealId;
    await prisma.dealProduct.deleteMany({
      where: { tenantId, dealId, productId: req.params.productId },
    });
    await syncDealValueFromProducts(dealId, tenantId);
    res.json({ status: 'success', message: 'Produto removido do negócio' });
  } catch (e) {
    next(e);
  }
}

export async function listPipelines(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const pipeline = await ensureDefaultPipeline(tenantId);
    res.json({ status: 'success', data: pipeline });
  } catch (e) {
    next(e);
  }
}
