/**
 * Configurações centralizadas do CRM-Flow.
 */

import './loadEnv';

export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || '4339', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  TIMEZONE: process.env.TZ || 'America/Sao_Paulo',
} as const;

export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
} as const;

/** Prisma usa DATABASE_URL; exposto aqui para health checks. */
export const DATABASE_CONFIG = {
  URL: (process.env.DATABASE_URL || process.env.POSTGRES_URI || '').trim(),
} as const;

export const ONLYFLOW_INTERNAL_CONFIG = {
  API_KEY: (process.env.ONLYFLOW_INTERNAL_KEY || process.env.JWT_SECRET || '').trim(),
} as const;

/** Lembretes de atividades (cron / backend interno). */
export const ACTIVITY_REMINDER_CONFIG = {
  LEAD_MINUTES: parseInt(process.env.CRM_ACTIVITY_REMINDER_LEAD_MINUTES || '30', 10),
  QUERY_LIMIT: parseInt(process.env.CRM_ACTIVITY_REMINDER_QUERY_LIMIT || '200', 10),
  DIGEST_ACTIVITY_LIMIT: parseInt(process.env.CRM_DAILY_DIGEST_ACTIVITY_LIMIT || '2000', 10),
  DIGEST_ITEMS_PER_USER: parseInt(process.env.CRM_DAILY_DIGEST_ITEMS_PER_USER || '15', 10),
} as const;
