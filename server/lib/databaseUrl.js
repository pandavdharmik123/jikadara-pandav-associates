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

/** Strip SSL query params so pg.Pool `ssl` option controls verification. */
export function stripSslParams(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('sslaccept');
    parsed.searchParams.delete('sslrootcert');
    return parsed.toString();
  } catch {
    return url;
  }
}

export function needsCloudSsl(hostname) {
  return isCloudHost(hostname) || process.env.NODE_ENV === 'production';
}

/**
 * Returns a production-safe DATABASE_URL.
 * Uses sslmode=no-verify for cloud Postgres (Supabase pooler TLS on Render).
 */
export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL is not set. Add it in Render → Environment. ' +
          'Use your provider\'s pooled connection string (Neon: *-pooler.neon.tech, Supabase: *.pooler.supabase.com:5432).'
      );
    }
    return LOCAL_FALLBACK;
  }

  try {
    const parsed = new URL(url);

    if (needsCloudSsl(parsed.hostname)) {
      const mode = parsed.searchParams.get('sslmode');
      // Strict modes break Render → Supabase pooler (self-signed cert chain)
      if (!mode || mode === 'require' || mode === 'verify-full' || mode === 'verify-ca') {
        parsed.searchParams.set('sslmode', 'no-verify');
      }
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
