process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

import express from 'express';
import cors from 'cors';
import { SERVER_CONFIG } from './config/constants';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

const app = express();

app.use(
  cors({
    origin: SERVER_CONFIG.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CRM-Flow',
    api: '/api/crm-flow',
  });
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'CRM-Flow', database: 'connected' });
  } catch (err) {
    console.error('[CRM-Flow] Health check — banco indisponível:', err);
    res.status(503).json({
      status: 'error',
      service: 'CRM-Flow',
      database: 'disconnected',
      message: 'DATABASE_URL inacessível ou schema crm_flow não configurado',
    });
  }
});

app.use('/api/crm-flow', routes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`🚀 CRM-Flow na porta ${SERVER_CONFIG.PORT}`);
  void prisma
    .$queryRaw`SELECT 1`
    .then(() => console.log('✅ CRM-Flow: Postgres conectado (schema crm_flow)'))
    .catch((err) =>
      console.error(
        '❌ CRM-Flow: falha ao conectar no Postgres — dashboard retornará 500 até corrigir DATABASE_URL / setup:db:',
        err instanceof Error ? err.message : err
      )
    );
});

export default app;
