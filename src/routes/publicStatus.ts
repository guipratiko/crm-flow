import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/public/status
 * Health público alinhado ao padrão OnlyFlow (consumido pelo GET /api/public/status do backend principal).
 */
router.get('/status', async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();

  let packageVersion = '1.0.0';
  try {
    const pkg = require('../../package.json') as { version?: string };
    if (pkg?.version) packageVersion = pkg.version;
  } catch {
    // ignora
  }

  if (!process.env.DATABASE_URL?.trim()) {
    res.status(500).json({
      status: 'error',
      service: 'crm-flow',
      version: packageVersion,
      message: 'CRM-Flow indisponível: DATABASE_URL não configurado.',
      timestamp,
      details: { postgresql: false },
    });
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ok',
      service: 'crm-flow',
      version: packageVersion,
      message: 'CRM-Flow API está funcionando',
      timestamp,
      details: { postgresql: true },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao consultar Postgres';
    res.status(500).json({
      status: 'error',
      service: 'crm-flow',
      version: packageVersion,
      message: `CRM-Flow com problemas: ${msg}`,
      timestamp,
      details: { postgresql: false, error: msg },
    });
  }
});

export default router;
