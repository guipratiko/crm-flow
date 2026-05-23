import dotenv from 'dotenv';

dotenv.config();

export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || '4339', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
};
