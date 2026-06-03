/**
 * Prisma migrate deploy usando DATABASE_URL ou POSTGRES_URI (mesmo nome do Backend).
 */
import { config } from 'dotenv';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env') });

/** POSTGRES_URI primeiro (igual ao Backend / deploy produção). */
const databaseUrl = (process.env.POSTGRES_URI || process.env.DATABASE_URL || '').trim();

if (!databaseUrl) {
  console.error(
    '❌ Defina DATABASE_URL ou POSTGRES_URI no .env ou na linha de comando.\n' +
      '   Ex.: POSTGRES_URI=postgres://user:pass@host:5435/onlydb?sslmode=disable npm run prisma:migrate'
  );
  process.exit(1);
}

const masked = databaseUrl.replace(/:([^:@/]+)@/, ':****@');
console.log(`📦 prisma migrate deploy → ${masked}`);

execSync('npx prisma migrate deploy', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
