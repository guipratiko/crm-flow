import { recordTimeline } from './timelineService';

type ActivityEntityRefs = {
  contactId: string | null;
  companyId: string | null;
  dealId: string | null;
};

/** Registra a mesma ação na timeline de contato, empresa e/ou negócio vinculados. */
export async function recordActivityLinkedTimelines(
  tenantId: string,
  activity: ActivityEntityRefs,
  action: string,
  description: string,
  userId?: string
): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (activity.contactId) {
    tasks.push(
      recordTimeline({
        tenantId,
        entityType: 'contact',
        entityId: activity.contactId,
        action,
        description,
        userId,
      })
    );
  }
  if (activity.companyId) {
    tasks.push(
      recordTimeline({
        tenantId,
        entityType: 'company',
        entityId: activity.companyId,
        action,
        description,
        userId,
      })
    );
  }
  if (activity.dealId) {
    tasks.push(
      recordTimeline({
        tenantId,
        entityType: 'deal',
        entityId: activity.dealId,
        action,
        description,
        userId,
      })
    );
  }

  await Promise.all(tasks);
}
