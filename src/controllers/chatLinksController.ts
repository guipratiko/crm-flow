import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { recordTimeline } from '../services/timelineService';

const linkBody = z.object({
  crmContactId: z.string().uuid(),
  chatContactId: z.string().uuid(),
  chatInstanceId: z.string().min(1),
  chatChannel: z.enum(['whatsapp', 'instagram']),
});

/** GET /chat-links/by-chat/:chatContactId */
export async function getLinkByChatContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const chatContactId = String(req.params.chatContactId || '').trim();
    const link = await prisma.chatContactLink.findFirst({
      where: { tenantId, chatContactId },
      include: { contact: { select: { id: true, name: true } } },
    });
    res.json({ status: 'success', data: link });
  } catch (e) {
    next(e);
  }
}

/** GET /chat-links/by-crm/:crmContactId */
export async function listLinksByCrmContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const crmContactId = String(req.params.crmContactId || '').trim();
    const contact = await prisma.contact.findFirst({ where: { id: crmContactId, tenantId } });
    if (!contact) return next(createError('Contato não encontrado', 404));
    const links = await prisma.chatContactLink.findMany({
      where: { tenantId, crmContactId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ status: 'success', data: links });
  } catch (e) {
    next(e);
  }
}

/** POST /chat-links */
export async function createChatLink(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = linkBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos'));
    const data = parsed.data;

    const contact = await prisma.contact.findFirst({
      where: { id: data.crmContactId, tenantId },
    });
    if (!contact) return next(createError('Contato comercial não encontrado', 404));

    const existingChat = await prisma.chatContactLink.findFirst({
      where: { tenantId, chatContactId: data.chatContactId },
    });
    if (existingChat && existingChat.crmContactId !== data.crmContactId) {
      return next(createError('Esta conversa do Chat já está vinculada a outro contato comercial.', 409));
    }

    const link = await prisma.chatContactLink.upsert({
      where: {
        tenantId_chatContactId: { tenantId, chatContactId: data.chatContactId },
      },
      create: {
        tenantId,
        crmContactId: data.crmContactId,
        chatContactId: data.chatContactId,
        chatInstanceId: data.chatInstanceId,
        chatChannel: data.chatChannel,
        linkedByUserId: req.user?.id ?? null,
      },
      update: {
        crmContactId: data.crmContactId,
        chatInstanceId: data.chatInstanceId,
        chatChannel: data.chatChannel,
        linkedByUserId: req.user?.id ?? null,
      },
    });

    await recordTimeline({
      tenantId,
      entityType: 'contact',
      entityId: data.crmContactId,
      action: 'chat_linked',
      description: 'Conversa do Chat vinculada ao contato comercial',
      userId: req.user?.id,
      metadata: {
        chatContactId: data.chatContactId,
        chatInstanceId: data.chatInstanceId,
        chatChannel: data.chatChannel,
      },
    });

    res.status(201).json({ status: 'success', data: link });
  } catch (e) {
    next(e);
  }
}

/** DELETE /chat-links/by-chat/:chatContactId */
export async function deleteLinkByChatContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const chatContactId = String(req.params.chatContactId || '').trim();
    const existing = await prisma.chatContactLink.findFirst({ where: { tenantId, chatContactId } });
    if (!existing) return next(createError('Vínculo não encontrado', 404));
    await prisma.chatContactLink.delete({ where: { id: existing.id } });
    res.json({ status: 'success', message: 'Vínculo removido' });
  } catch (e) {
    next(e);
  }
}

/** POST /chat-links/batch-status — quais chatContactIds já estão vinculados */
export async function batchLinkStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const ids = Array.isArray((req.body as { chatContactIds?: unknown }).chatContactIds)
      ? ((req.body as { chatContactIds: unknown[] }).chatContactIds.map((x) => String(x).trim()).filter(Boolean))
      : [];
    if (!ids.length) {
      res.json({ status: 'success', data: {} });
      return;
    }
    const links = await prisma.chatContactLink.findMany({
      where: { tenantId, chatContactId: { in: ids } },
      select: { chatContactId: true, crmContactId: true },
    });
    const map: Record<string, string> = {};
    for (const l of links) map[l.chatContactId] = l.crmContactId;
    res.json({ status: 'success', data: map });
  } catch (e) {
    next(e);
  }
}
