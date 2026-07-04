import prisma from './prisma.js';
import { maskDatabaseUrl, getDatabaseUrl } from './databaseUrl.js';

const DEFAULT_DOCUMENT_TYPES = [
  'Sale Deed',
  'Agreement to Sale',
  'Rent Agreement',
  'Partnership Deed',
  'Will',
  'Power of Attorney',
];

export async function pingDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}

export async function initializeDocumentTypes() {
  const count = await prisma.documentType.count();
  if (count === 0) {
    await Promise.all(
      DEFAULT_DOCUMENT_TYPES.map((name) =>
        prisma.documentType.create({ data: { name } })
      )
    );
    console.log(`✅ Seeded ${DEFAULT_DOCUMENT_TYPES.length} default document types`);
  }
}

export async function runStartupTasks() {
  const url = getDatabaseUrl();
  console.log(`📦 Database: ${maskDatabaseUrl(url)}`);

  try {
    await pingDatabase();
    console.log('✅ Database connected');
    await initializeDocumentTypes();
  } catch (err) {
    const code = err.code ?? err.meta?.driverAdapterError?.cause?.kind;
    if (code === 'P2021' || err.message?.includes('does not exist')) {
      console.error('❌ Database tables missing:', err.message);
      console.error(
        '   Fix: ensure deploy runs `npm run build` or `npm run start` (both run prisma db push).\n' +
        '   Render build command: npm install && npm run build'
      );
    } else {
      console.error('❌ Database connection failed:', err.message);
      console.error(
        '   Fix: In Render → Environment, set DATABASE_URL to your provider\'s pooled URL.\n' +
          '   Supabase: use Session pooler (*.pooler.supabase.com:5432), not direct (db.*.supabase.co).'
      );
    }
  }
}
