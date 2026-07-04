import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
import { getDatabaseUrl } from './lib/databaseUrl.js';

dotenv.config();

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: getDatabaseUrl(),
  },
});
