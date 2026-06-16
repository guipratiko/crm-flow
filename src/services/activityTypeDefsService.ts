import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';

export const DEFAULT_ACTIVITY_TYPES: { slug: string; name: string }[] = [
  { slug: '1', name: 'Tarefa' },
  { slug: '2', name: 'Ligação' },
  { slug: '3', name: 'Reunião' },
  { slug: '4', name: 'E-mail' },
  { slug: '5', name: 'WhatsApp' },
  { slug: '6', name: 'Follow-up' },
  { slug: '7', name: 'Nota' },
];

export async function nextActivityTypeSlug(tenantId: string): Promise<string> {
  const rows = await prisma.activityTypeDef.findMany({
    where: { tenantId },
    select: { slug: true },
  });
  let max = 0;
  for (const row of rows) {
    const n = parseInt(row.slug, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

export async function ensureDefaultActivityTypes(tenantId: string): Promise<void> {
  const count = await prisma.activityTypeDef.count({ where: { tenantId } });
  if (count > 0) return;
  await prisma.activityTypeDef.createMany({
    data: DEFAULT_ACTIVITY_TYPES.map((d, i) => ({
      tenantId,
      slug: d.slug,
      name: d.name,
      sortOrder: i,
      isSystem: true,
    })),
  });
}

export async function listActivityTypesForTenant(tenantId: string) {
  await ensureDefaultActivityTypes(tenantId);
  return prisma.activityTypeDef.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function assertActivityTypeSlugExists(tenantId: string, slug: string): Promise<void> {
  const row = await prisma.activityTypeDef.findFirst({ where: { tenantId, slug } });
  if (!row) {
    throw createError(
      `Tipo de atividade "${slug}" não existe. Configure em Ajustes → CRM → Atividade.`,
      400
    );
  }
}
