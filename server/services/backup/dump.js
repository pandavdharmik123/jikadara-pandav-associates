import { spawn } from 'node:child_process';
import { createWriteStream, promises as fs } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import {
  assertPgDumpCompatible,
  buildPgArgs,
  buildPgEnv,
  parsePostgresUrl,
  runCommand,
} from './pg.js';
import { formatTimestamp, slugify } from './time.js';

const DUMP_TIMEOUT_MS = 30 * 60 * 1000;

function spawnProcess(command, args, options) {
  const child = spawn(command, args, options);
  let stderr = '';

  child.stderr?.on('data', (chunk) => {
    if (stderr.length < 64 * 1024) stderr += chunk.toString();
  });

  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${command} timed out after ${DUMP_TIMEOUT_MS / 60000} minutes.`));
    }, DUMP_TIMEOUT_MS);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ code, stderr });
      } else {
        reject(
          new Error(
            `${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}.` +
              (stderr ? `\n${stderr.trim()}` : '')
          )
        );
      }
    });
  });

  return { child, done };
}

export function dumpExtension(format = 'custom') {
  return format === 'plain' ? '.sql.gz' : '.dump';
}

/**
 * Create a consistent PostgreSQL dump in the configured temp directory.
 * pg_dump uses a single snapshot, so this is safe on a live database.
 */
export async function createDump(config, { onLog = () => {} } = {}) {
  const started = Date.now();
  const connection = parsePostgresUrl();
  const env = buildPgEnv(connection);

  const versions = await assertPgDumpCompatible(config.pgDumpPath);
  onLog(`Using ${versions.client.text} against PostgreSQL ${versions.server.text}`);

  await fs.mkdir(config.tempDir, { recursive: true });

  const baseName = `${slugify(config.projectName)}_${formatTimestamp(new Date(), config.timezone)}`;
  const extension = dumpExtension(config.format);
  let filePath = path.join(config.tempDir, `${baseName}${extension}`);

  // Extremely unlikely, but never overwrite an in-flight dump.
  for (let i = 1; i <= 9; i += 1) {
    try {
      await fs.access(filePath);
      filePath = path.join(config.tempDir, `${baseName}-${i}${extension}`);
    } catch {
      break;
    }
  }

  const commonArgs = [
    '--no-owner',
    '--no-privileges',
    '--lock-wait-timeout=30000',
    ...buildPgArgs(connection),
  ];

  if (config.format === 'plain') {
    await runPlainDump(
      config,
      [...commonArgs, '--format=plain', '--compress=0', '--clean', '--if-exists'],
      filePath,
      env
    );
  } else {
    await runCustomDump(
      config,
      [...commonArgs, '--format=custom', '--compress=9', `--file=${filePath}`],
      env
    );
  }

  const stat = await fs.stat(filePath);
  if (stat.size === 0) {
    await fs.unlink(filePath).catch(() => {});
    throw new Error('pg_dump produced an empty file.');
  }

  const verification = await verifyDump(filePath, config.format);
  onLog(
    `Dump created: ${path.basename(filePath)} (${stat.size} bytes, ${verification.tables} tables)`
  );

  return {
    filePath,
    fileName: path.basename(filePath),
    sizeBytes: stat.size,
    durationMs: Date.now() - started,
    format: config.format,
    tables: verification.tables,
    pgClientVersion: versions.client.text,
    pgServerVersion: versions.server.text,
  };
}

async function runCustomDump(config, args, env) {
  const { done } = spawnProcess(config.pgDumpPath, args, {
    env,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  await done;
}

async function runPlainDump(config, args, filePath, env) {
  const { child, done } = spawnProcess(config.pgDumpPath, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await Promise.all([
    done,
    pipeline(
      child.stdout,
      createGzip({ level: 9 }),
      createWriteStream(filePath, { mode: 0o600 })
    ),
  ]);
}

async function verifyDump(filePath, format) {
  if (format === 'plain') {
    const handle = await fs.open(filePath, 'r');
    try {
      const { buffer } = await handle.read(Buffer.alloc(2), 0, 2, 0);
      if (buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
        throw new Error('Plain dump is not a valid gzip file.');
      }
    } finally {
      await handle.close();
    }
    return { tables: 0 };
  }

  const { stdout } = await runCommand(
    process.env.PG_RESTORE_PATH || 'pg_restore',
    ['--list', filePath],
    { timeoutMs: 60_000 }
  );
  const tables = (stdout.match(/TABLE DATA/g) || []).length;
  return { tables };
}

/** Sanity check before uploading: custom dumps must be readable by pg_restore. */
export async function verifyArchive(filePath, format) {
  return verifyDump(filePath, format);
}

export async function removeFile(filePath) {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => {});
}

export async function fileSize(filePath) {
  const stat = await fs.stat(filePath);
  return stat.size;
}
