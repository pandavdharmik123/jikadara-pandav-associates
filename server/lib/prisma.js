import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getDatabaseUrl, stripSslParams, needsCloudSsl } from './databaseUrl.js';

const rawUrl = getDatabaseUrl();
let hostname = '';
try {
  hostname = new URL(rawUrl).hostname;
} catch {
  // keep empty — ssl falls back to NODE_ENV check below
}

const connectionString = stripSslParams(rawUrl);
const useSsl = needsCloudSsl(hostname);

const pool = new pg.Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  connectionTimeoutMillis: 10_000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
