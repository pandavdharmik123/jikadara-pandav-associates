import path from 'node:path';
import { defineConfig, env } from 'prisma/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://dbpandav@localhost:5432/advocate_management?schema=public',
  },
});
