import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ensureDefaultPipeline } from '../services/pipelineService';

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const pipeline = await ensureDefaultPipeline(tenantId);
    const deals = await prisma.deal.findMany({
      where: { tenantId, pipelineId: pipeline.id },
      include: { stage: true },
    });
    const openDeals = deals.filter((d) => d.status === 'open');
    const wonDeals = deals.filter((d) => d.status === 'won');
    const lostDeals = deals.filter((d) => d.status === 'lost');
    const forecastRevenue = openDeals.reduce(
      (sum, d) => sum + Number(d.value) * (d.probability / 100),
      0
    );
    const closedRevenue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const pendingActivities = await prisma.activity.count({
      where: { tenantId, status: 'pending' },
    });
    const byStage = pipeline.stages.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      color: stage.color,
      count: deals.filter((d) => d.stageId === stage.id && d.status === 'open').length,
      value: deals
        .filter((d) => d.stageId === stage.id && d.status === 'open')
        .reduce((s, d) => s + Number(d.value), 0),
    }));
    const totalOpen = openDeals.length;
    const conversionRate =
      deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

    res.json({
      status: 'success',
      data: {
        totalDeals: deals.length,
        openDeals: totalOpen,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        forecastRevenue,
        closedRevenue,
        pendingActivities,
        conversionRate,
        funnel: byStage,
        pipeline: { id: pipeline.id, name: pipeline.name },
      },
    });
  } catch (e) {
    next(e);
  }
}
