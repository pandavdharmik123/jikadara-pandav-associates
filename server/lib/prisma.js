import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getDatabaseUrl } from './databaseUrl.js';

const connectionString = getDatabaseUrl();
const isProduction = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  max: 10,
  connectionTimeoutMillis: 10_000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
