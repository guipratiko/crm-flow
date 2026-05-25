process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

import express from 'express';
import cors from 'cors';
import { SERVER_CONFIG } from './config/constants';
import routes from './routes';
import publicStatusRoutes from './routes/publicStatus';
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
    res.json({ status: 'ok', service: 'CRM-Flow', database: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao conectar ao Postgres';
    console.error('❌ CRM-Flow /health:', message);
    res.status(503).json({ status: 'error', service: 'CRM-Flow', database: false, message });
  }
});

app.use('/api/public', publicStatusRoutes);
app.use('/api/crm-flow', routes);
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ CRM-Flow: Postgres conectado');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('❌ CRM-Flow: falha ao conectar Postgres —', message);
    process.exit(1);
  }

  app.listen(SERVER_CONFIG.PORT, () => {
    console.log(`🚀 CRM-Flow na porta ${SERVER_CONFIG.PORT}`);
  });
}

start();

export default app;
