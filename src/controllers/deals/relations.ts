import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { dealContactBody, dealProductBody } from '../../schemas';
import { createError } from '../../middleware/errorHandler';
import { recordTimeline } from '../../services/timelineService';
import { recalcDealProductTotal, syncDealValueFromProducts } from '../../utils/dealTotals';
import { requireTenantId, parseBody, asyncHandler } from '../../utils/requestContext';

export const addDealContact = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const parsed = parseBody(dealContactBody, req.body);

  const deal = await prisma.deal.findFirst({ where: { id: req.params.dealId, tenantId } });
  if (!deal) throw createError('Negócio não encontrado', 404);

  const contact = await prisma.contact.findFirst({
    where: { id: parsed.contactId, tenantId },
  });
  if (!contact) throw createError('Contato não encontrado', 404);

  const whereKey = { dealId: deal.id, contactId: parsed.contactId };
  const alreadyLinked = await prisma.dealContact.findUnique({
    where: { dealId_contactId: whereKey },
  });

  const link = await prisma.dealContact.upsert({
    where: { dealId_contactId: whereKey },
    create: {
      tenantId,
      dealId: deal.id,
      contactId: parsed.contactId,
      role: parsed.role ?? null,
    },
    update: parsed.role ? { role: parsed.role } : {},
    include: { contact: true },
  });

  if (!alreadyLinked) {
    await recordTimeline({
      tenantId,
      entityType: 'deal',
      entityId: deal.id,
      action: 'deal_contact_linked',
      description: `Contato vinculado ao negócio (${parsed.role || 'envolvido'})`,
      userId: req.user?.id,
    });
  }

  res.status(alreadyLinked ? 200 : 201).json({ status: 'success', data: link });
});

export const removeDealContact = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  await prisma.dealContact.deleteMany({
    where: { tenantId, dealId: req.params.dealId, contactId: req.params.contactId },
  });
  res.json({ status: 'success', message: 'Vínculo removido' });
});

export const addDealProduct = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const parsed = parseBody(dealProductBody, req.body);

  const deal = await prisma.deal.findFirst({ where: { id: req.params.dealId, tenantId } });
  if (!deal) throw createError('Negócio não encontrado', 404);

  const product = await prisma.product.findFirst({
    where: { id: parsed.productId, tenantId },
  });
  if (!product) throw createError('Produto não encontrado', 404);

  const qty = parsed.quantity ?? 1;
  const unitPrice = new Prisma.Decimal(parsed.unitPrice ?? Number(product.price));
  const discount = new Prisma.Decimal(parsed.discount ?? 0);
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
});

export const removeDealProduct = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const dealId = req.params.dealId;
  await prisma.dealProduct.deleteMany({
    where: { tenantId, dealId, productId: req.params.productId },
  });
  await syncDealValueFromProducts(dealId, tenantId);
  res.json({ status: 'success', message: 'Produto removido do negócio' });
});
