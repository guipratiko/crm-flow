import { Router, Request, Response } from 'express';
import { DATABASE_CONFIG, SERVER_CONFIG } from '../config/constants';
import { prisma } from '../lib/prisma';
import packageJson from '../../package.json';

const router = Router();

/**
 * GET /api/public/status
 * Health público alinhado ao padrão OnlyFlow (consumido pelo GET /api/public/status do backend principal).
 */
router.get('/status', async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  const packageVersion = packageJson.version || '1.0.0';

  if (!DATABASE_CONFIG.URL) {
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
      environment: SERVER_CONFIG.NODE_ENV,
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
