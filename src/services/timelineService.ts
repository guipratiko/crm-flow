import { TimelineEntityType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function recordTimeline(params: {
  tenantId: string;
  entityType: TimelineEntityType;
  entityId: string;
  action: string;
  description: string;
  userId?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.timelineEvent.create({
    data: {
      tenantId: params.tenantId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      description: params.description,
      userId: params.userId ?? null,
      metadata: params.metadata ?? undefined,
    },
  });
}

export async function listTimeline(
  tenantId: string,
  entityType: TimelineEntityType,
  entityId: string
) {
  return prisma.timelineEvent.findMany({
    where: { tenantId, entityType, entityId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}
