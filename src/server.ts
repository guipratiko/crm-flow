process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

import express from 'express';
import cors from 'cors';
import { SERVER_CONFIG } from './config/constants';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

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

app.use('/api/crm-flow', routes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`🚀 CRM-Flow na porta ${SERVER_CONFIG.PORT}`);
});

export default app;
