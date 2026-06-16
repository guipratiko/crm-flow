import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { pipelineStageBody, pipelineStageCreateBody, pipelineStageReorderBody } from '../schemas';
import { ensureDefaultPipeline, nextPipelineStageShortId } from '../services/pipelineService';

export const MIN_PIPELINE_STAGES = 5;
export const MAX_PIPELINE_STAGES = 30;

export async function createStage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = pipelineStageCreateBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos', 400));

    const pipeline = await ensureDefaultPipeline(tenantId);
    if (pipeline.stages.length >= MAX_PIPELINE_STAGES) {
      return next(createError(`Limite de ${MAX_PIPELINE_STAGES} etapas atingido.`, 400));
    }

    const name = parsed.data.name.trim();
    if (pipeline.stages.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return next(createError('Já existe uma etapa com este nome.', 409));
    }

    const maxOrder = pipeline.stages.reduce((m, s) => Math.max(m, s.order), -1);
    const shortId = await nextPipelineStageShortId(tenantId, pipeline.id);
    const stage = await prisma.pipelineStage.create({
      data: {
        tenantId,
        pipelineId: pipeline.id,
        name,
        order: maxOrder + 1,
        shortId,
        color: parsed.data.color ?? '#3B82F6',
        probability: parsed.data.probability ?? 0,
      },
    });

    res.status(201).json({ status: 'success', data: stage });
  } catch (e) {
    next(e);
  }
}

export async function updateStage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const stageId = String(req.params.id || '').trim();
    const parsed = pipelineStageBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos', 400));

    const pipeline = await ensureDefaultPipeline(tenantId);
    const existing = pipeline.stages.find((s) => s.id === stageId);
    if (!existing) return next(createError('Etapa não encontrada', 404));

    const data = parsed.data;
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) return next(createError('Nome da etapa é obrigatório', 400));
      const dup = pipeline.stages.some(
        (s) => s.id !== stageId && s.name.toLowerCase() === name.toLowerCase()
      );
      if (dup) return next(createError('Já existe uma etapa com este nome.', 409));
    }

    const stage = await prisma.pipelineStage.update({
      where: { id: stageId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.probability !== undefined ? { probability: data.probability } : {}),
      },
    });

    res.json({ status: 'success', data: stage });
  } catch (e) {
    next(e);
  }
}

export async function deleteStage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const stageId = String(req.params.id || '').trim();

    const pipeline = await ensureDefaultPipeline(tenantId);
    if (pipeline.stages.length <= MIN_PIPELINE_STAGES) {
      return next(createError(`É obrigatório manter no mínimo ${MIN_PIPELINE_STAGES} etapas.`, 400));
    }

    const existing = pipeline.stages.find((s) => s.id === stageId);
    if (!existing) return next(createError('Etapa não encontrada', 404));

    const dealCount = await prisma.deal.count({ where: { tenantId, stageId } });
    if (dealCount > 0) {
      return next(
        createError('Não é possível excluir: existem negócios nesta etapa. Mova-os antes de excluir.', 400)
      );
    }

    await prisma.pipelineStage.delete({ where: { id: stageId } });

    res.json({ status: 'success', message: 'Etapa removida.' });
  } catch (e) {
    next(e);
  }
}

export async function reorderStages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const parsed = pipelineStageReorderBody.safeParse(req.body);
    if (!parsed.success) return next(createError(parsed.error.errors[0]?.message || 'Dados inválidos', 400));

    const pipeline = await ensureDefaultPipeline(tenantId);
    const stageIds = parsed.data.stageIds;
    const pipelineStageIds = new Set(pipeline.stages.map((s) => s.id));

    if (stageIds.length !== pipeline.stages.length) {
      return next(createError('Informe todas as etapas na nova ordem.', 400));
    }
    for (const id of stageIds) {
      if (!pipelineStageIds.has(id)) {
        return next(createError('Etapa inválida para este funil.', 400));
      }
    }

    await prisma.$transaction(
      stageIds.map((id, order) =>
        prisma.pipelineStage.update({
          where: { id },
          data: { order },
        })
      )
    );

    const stages = await prisma.pipelineStage.findMany({
      where: { tenantId, pipelineId: pipeline.id },
      orderBy: { order: 'asc' },
    });

    res.json({ status: 'success', data: { stages } });
  } catch (e) {
    next(e);
  }
}
