import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import { getDatabaseUrl, needsCloudSsl } from '../../lib/databaseUrl.js';

const execFileAsync = promisify(execFile);

/**
 * Split a PostgreSQL connection string into the pieces we need.
 * Accepts the Prisma-specific `?schema=` parameter by ignoring it.
 */
export function parsePostgresUrl(rawUrl = getDatabaseUrl()) {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not set.');
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid connection string.');
  }

  return {
    rawUrl,
    host: url.hostname || 'localhost',
    port: url.port || '5432',
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')) || 'postgres',
    schema: url.searchParams.get('schema') || '',
    sslmode: (url.searchParams.get('sslmode') || '').toLowerCase(),
  };
}

export function isLocalHost(hostname = '') {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(hostname).toLowerCase());
}

/**
 * Build an env for libpq tools (pg_dump / pg_restore / psql).
 *
 * node-postgres understands `sslmode=no-verify`, but libpq does not. For cloud
 * hosts we therefore use `require` (encrypted, no certificate verification),
 * which matches how the app's pg pool is configured. Local databases are left
 * alone even when NODE_ENV=production.
 */
export function buildPgEnv(connection, extra = {}) {
  const env = { ...process.env, ...extra };

  if (connection.password) {
    env.PGPASSWORD = connection.password;
  } else {
    delete env.PGPASSWORD;
  }

  const mode = connection.sslmode;
  if (mode === 'no-verify' || mode === 'require') {
    env.PGSSLMODE = 'require';
  } else if (mode === 'disable') {
    delete env.PGSSLMODE;
  } else if (mode) {
    env.PGSSLMODE = mode;
  } else if (needsCloudSsl(connection.host) && !isLocalHost(connection.host)) {
    env.PGSSLMODE = 'require';
  } else {
    delete env.PGSSLMODE;
  }

  env.PGCONNECT_TIMEOUT = env.PGCONNECT_TIMEOUT || '15';
  return env;
}

/** Connection flags usable by pg_dump / pg_restore / psql. */
export function buildPgArgs(connection) {
  const args = ['-h', connection.host];
  if (connection.port) args.push('-p', String(connection.port));
  if (connection.user) args.push('-U', connection.user);
  args.push('-d', connection.database);
  return args;
}

export async function runCommand(command, args, { env, timeoutMs = 30 * 60 * 1000, cwd } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      env: env || process.env,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      cwd,
      windowsHide: true,
    });
    return { stdout, stderr };
  } catch (err) {
    const detail = (err.stderr || err.stdout || err.message || '').toString().trim();
    throw new Error(`${command} failed: ${detail}`, { cause: err });
  }
}

let cachedClientVersion = null;

/** Returns `{ major, text }` for the installed pg_dump. */
export async function getPgDumpVersion(pgDumpPath = 'pg_dump') {
  if (cachedClientVersion && cachedClientVersion.binary === pgDumpPath) {
    return cachedClientVersion;
  }

  try {
    const { stdout } = await runCommand(pgDumpPath, ['--version'], { timeoutMs: 15_000 });
    const match = stdout.match(/(\d+)(?:\.(\d+))?/);
    cachedClientVersion = {
      binary: pgDumpPath,
      major: match ? Number(match[1]) : null,
      text: stdout.trim(),
    };
    return cachedClientVersion;
  } catch {
    throw new Error(
      `PostgreSQL client tools not found ("${pgDumpPath}"). Install postgresql-client ` +
        '(e.g. `brew install postgresql@18` or `apt-get install postgresql-client`) ' +
        'or set PG_DUMP_PATH to the pg_dump binary.'
    );
  }
}

/** Reads the PostgreSQL server version with a short-lived dedicated connection. */
export async function getServerVersion(connection) {
  const client = new pg.Client({
    host: connection.host,
    port: Number(connection.port),
    user: connection.user || undefined,
    password: connection.password || undefined,
    database: connection.database,
    ssl: needsCloudSsl(connection.host) && !isLocalHost(connection.host)
      ? { rejectUnauthorized: false }
      : undefined,
    connectionTimeoutMillis: 15_000,
  });

  await client.connect();
  try {
    const { rows } = await client.query('SHOW server_version_num');
    const num = Number(rows[0]?.server_version_num || 0);
    const { rows: pretty } = await client.query('SHOW server_version');
    return {
      number: num,
      major: num >= 100000 ? Math.floor(num / 10000) : Math.floor(num / 100),
      text: pretty[0]?.server_version || String(num),
    };
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * pg_dump cannot dump a server newer than itself. Fail early with a useful
 * message instead of letting the dump die halfway through.
 */
export async function assertPgDumpCompatible(pgDumpPath) {
  const [client, server] = await Promise.all([
    getPgDumpVersion(pgDumpPath),
    getServerVersion(parsePostgresUrl()),
  ]);

  if (client.major && server.major && client.major < server.major) {
    throw new Error(
      `pg_dump ${client.text} is older than PostgreSQL server ${server.text}. ` +
        'Install a matching or newer PostgreSQL client (PG_DUMP_PATH can point to it).'
    );
  }

  return { client, server };
}
