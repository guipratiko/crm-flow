import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';

const DEFAULT_STAGES: {
  name: string;
  order: number;
  shortId: number;
  color: string;
  probability: number;
}[] = [
  { name: 'Novo lead', order: 0, shortId: 1, color: '#94A3B8', probability: 10 },
  { name: 'Primeiro contato', order: 1, shortId: 2, color: '#60A5FA', probability: 20 },
  { name: 'Qualificação', order: 2, shortId: 3, color: '#818CF8', probability: 35 },
  { name: 'Proposta enviada', order: 3, shortId: 4, color: '#F59E0B', probability: 55 },
  { name: 'Negociação', order: 4, shortId: 5, color: '#F97316', probability: 75 },
  { name: 'Fechado ganho', order: 5, shortId: 6, color: '#22C55E', probability: 100 },
  { name: 'Fechado perdido', order: 6, shortId: 7, color: '#EF4444', probability: 0 },
];

export async function nextPipelineStageShortId(tenantId: string, pipelineId: string): Promise<number> {
  const agg = await prisma.pipelineStage.aggregate({
    where: { tenantId, pipelineId },
    _max: { shortId: true },
  });
  return (agg._max.shortId ?? 0) + 1;
}

export async function resolvePipelineStage(tenantId: string, stageIdOrShortId: string) {
  const trimmed = stageIdOrShortId.trim();
  if (/^\d+$/.test(trimmed)) {
    const shortId = parseInt(trimmed, 10);
    if (!Number.isFinite(shortId) || shortId < 1) return null;
    const pipeline = await ensureDefaultPipeline(tenantId);
    return prisma.pipelineStage.findFirst({
      where: { tenantId, pipelineId: pipeline.id, shortId },
    });
  }
  return prisma.pipelineStage.findFirst({
    where: { id: trimmed, tenantId },
  });
}

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
        shortId: s.shortId,
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

export async function assertPipelineStageExists(tenantId: string, stageIdOrShortId: string) {
  const stage = await resolvePipelineStage(tenantId, stageIdOrShortId);
  if (!stage) {
    throw createError('Etapa não encontrada', 404);
  }
  return stage;
}
