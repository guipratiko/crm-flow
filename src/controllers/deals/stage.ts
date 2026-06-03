import { prisma } from '../../lib/prisma';
import { moveStageBody } from '../../schemas';
import { createError } from '../../middleware/errorHandler';
import { recordTimeline } from '../../services/timelineService';
import { dealInclude } from '../../prisma/includes';
import { requireTenantId, parseBody, asyncHandler } from '../../utils/requestContext';

export const moveDealStage = asyncHandler(async (req, res) => {
  const tenantId = requireTenantId(req);
  const { stageId, lossReason } = parseBody(moveStageBody, req.body);

  const deal = await prisma.deal.findFirst({
    where: { id: req.params.id, tenantId },
    include: { stage: true },
  });
  if (!deal) throw createError('Negócio não encontrado', 404);

  const newStage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, tenantId },
  });
  if (!newStage) throw createError('Etapa não encontrada', 404);

  const stageNameLower = newStage.name.toLowerCase();
  const isWon = stageNameLower.includes('ganho');
  const isLost = stageNameLower.includes('perdido');

  const updated = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stageId: newStage.id,
      probability: newStage.probability,
      status: isWon ? 'won' : isLost ? 'lost' : 'open',
      lossReason: isLost ? lossReason ?? deal.lossReason : null,
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
});
