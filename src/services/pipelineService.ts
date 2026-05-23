import { prisma } from '../lib/prisma';

const DEFAULT_STAGES: { name: string; order: number; color: string; probability: number }[] = [
  { name: 'Novo lead', order: 0, color: '#94A3B8', probability: 10 },
  { name: 'Primeiro contato', order: 1, color: '#60A5FA', probability: 20 },
  { name: 'Qualificação', order: 2, color: '#818CF8', probability: 35 },
  { name: 'Proposta enviada', order: 3, color: '#F59E0B', probability: 55 },
  { name: 'Negociação', order: 4, color: '#F97316', probability: 75 },
  { name: 'Fechado ganho', order: 5, color: '#22C55E', probability: 100 },
  { name: 'Fechado perdido', order: 6, color: '#EF4444', probability: 0 },
];

export async function ensureDefaultPipeline(tenantId: string) {
  let pipeline = await prisma.pipeline.findFirst({
    where: { tenantId },
    include: { stages: { orderBy: { order: 'asc' } } },
  });

  if (pipeline && pipeline.stages.length > 0) {
    return pipeline;
  }

  await prisma.tenantProfile.upsert({
    where: { id: tenantId },
    create: { id: tenantId, name: 'Minha empresa' },
    update: {},
  });

  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        tenantId,
        name: 'Funil principal',
        description: 'Funil padrão OnlyFlow CRM',
      },
      include: { stages: true },
    });
  }

  if (pipeline.stages.length === 0) {
    await prisma.pipelineStage.createMany({
      data: DEFAULT_STAGES.map((s) => ({
        tenantId,
        pipelineId: pipeline!.id,
        name: s.name,
        order: s.order,
        color: s.color,
        probability: s.probability,
      })),
    });
    pipeline = await prisma.pipeline.findFirst({
      where: { id: pipeline.id },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  return pipeline!;
}
