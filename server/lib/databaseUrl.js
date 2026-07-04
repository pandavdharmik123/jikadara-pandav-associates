import dotenv from 'dotenv';

dotenv.config();

const LOCAL_FALLBACK =
  'postgresql://dbpandav@localhost:5432/advocate_management?schema=public';

const CLOUD_HOST_PATTERNS = [
  'neon.tech',
  'supabase.co',
  'render.com',
  'aws.amazon.com',
  'azure.com',
  'elephantsql.com',
  'railway.app',
];

function isCloudHost(hostname) {
  return CLOUD_HOST_PATTERNS.some((pattern) => hostname.includes(pattern));
}

/**
 * Returns a production-safe DATABASE_URL.
 * Adds sslmode=require for known cloud Postgres hosts when missing.
 */
export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL is not set. Add it in Render → Environment. ' +
          'Use your provider\'s pooled connection string (Neon: *-pooler.neon.tech, Supabase: port 6543).'
      );
    }
    return LOCAL_FALLBACK;
  }

  try {
    const parsed = new URL(url);

    if (
      process.env.NODE_ENV === 'production' &&
      isCloudHost(parsed.hostname) &&
      !parsed.searchParams.has('sslmode')
    ) {
      parsed.searchParams.set('sslmode', 'require');
      return parsed.toString();
    }

    return url;
  } catch {
    return url;
  }
}

export function maskDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '****';
    return parsed.toString();
  } catch {
    return '(invalid DATABASE_URL)';
  }
}
