import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { z } from 'zod';

const setBody = z.object({
  items: z.array(
    z.object({
      chatContactId: z.string().min(1),
      messageId: z.string().min(1),
    })
  ),
});

export async function listDealTimelineMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId }, select: { id: true } });
    if (!deal) return next(createError('Negócio não encontrado', 404));
    const items = await prisma.dealTimelineMessage.findMany({
      where: { tenantId, dealId: deal.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ status: 'success', data: items });
  } catch (e) {
    next(e);
  }
}

export async function setDealTimelineMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = setBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId }, select: { id: true } });
    if (!deal) return next(createError('Negócio não encontrado', 404));

    await prisma.$transaction([
      prisma.dealTimelineMessage.deleteMany({ where: { tenantId, dealId: deal.id } }),
      ...(parsed.data.items.length
        ? [
            prisma.dealTimelineMessage.createMany({
              data: parsed.data.items.map((item) => ({
                tenantId,
                dealId: deal.id,
                chatContactId: item.chatContactId.trim(),
                messageId: item.messageId.trim(),
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    const items = await prisma.dealTimelineMessage.findMany({
      where: { tenantId, dealId: deal.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ status: 'success', data: items });
  } catch (e) {
    next(e);
  }
}
