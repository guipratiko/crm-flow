/**
 * Executa comando Prisma (db push, etc.) com DATABASE_URL ou POSTGRES_URI.
 */
import { config } from 'dotenv';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env') });

const databaseUrl = (process.env.POSTGRES_URI || process.env.DATABASE_URL || '').trim();
const prismaArgs = process.argv.slice(2);

if (!databaseUrl) {
  console.error('❌ Defina DATABASE_URL ou POSTGRES_URI.');
  process.exit(1);
}

if (prismaArgs.length === 0) {
  console.error('❌ Informe o comando Prisma (ex.: db push).');
  process.exit(1);
}

const masked = databaseUrl.replace(/:([^:@/]+)@/, ':****@');
console.log(`📦 prisma ${prismaArgs.join(' ')} → ${masked}`);

execSync(`npx prisma ${prismaArgs.map((a) => JSON.stringify(a)).join(' ')}`, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
