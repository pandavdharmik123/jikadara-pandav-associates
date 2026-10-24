#!/usr/bin/env node
import 'dotenv/config';
import path from 'node:path';
import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import pg from 'pg';
import { loadBackupConfig, selectAccounts, assertBackupConfigured } from '../services/backup/config.js';
import { downloadFile, listBackups, ensureBackupFolder } from '../services/backup/drive.js';
import { isEncryptedFile, decryptFile } from '../services/backup/encrypt.js';
import { buildPgArgs, buildPgEnv, parsePostgresUrl, runCommand, isLocalHost } from '../services/backup/pg.js';
import { humanBytes } from '../services/backup/hash.js';
import { getLatestBackupInfo } from '../services/backup/index.js';
import { getDatabaseUrl, needsCloudSsl } from '../lib/databaseUrl.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--list') args.list = true;
    else if (arg === '--latest') args.latest = true;
    else if (arg === '--file') args.file = next();
    else if (arg.startsWith('--file=')) args.file = arg.split('=')[1];
    else if (arg === '--drive-file-id') args.driveFileId = next();
    else if (arg.startsWith('--drive-file-id=')) args.driveFileId = arg.split('=')[1];
    else if (arg === '--account') args.account = next();
    else if (arg.startsWith('--account=')) args.account = arg.split('=')[1];
    else if (arg === '--target') args.target = next();
    else if (arg.startsWith('--target=')) args.target = arg.split('=')[1];
    else if (arg === '--key') args.key = next();
    else if (arg.startsWith('--key=')) args.key = arg.split('=')[1];
    else if (arg === '--keep') args.keep = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Usage: npm run backup:restore -- [options]

Restore a database backup from Google Drive or a local file.

Options:
  --list                  List backups in the Drive folder and exit
  --latest                Restore the most recent successful backup
  --file=path             Use a local dump/archive
  --drive-file-id=id      Download a specific Drive file
  --account=primary       Account id to use for Drive
  --target=db_or_url      Target database name or full postgres:// URL (required)
  --key=passphrase        Encryption key (otherwise DB_BACKUP_ENCRYPTION_KEY)
  --force                 Allow restoring over the current DATABASE_URL
  --keep                  Keep downloaded/decrypted temp files
  -h, --help              Show this help

Examples:
  npm run backup:restore -- --list
  npm run backup:restore -- --latest --target=advocate_management_restore_test
  npm run backup:restore -- --file=./backups/tmp/x.dump --target=postgresql://...

The target database must already exist. This uses --clean --if-exists, so
objects inside the target database are replaced.
`);
}

function resolveTargetUrl(target) {
  if (!target) return null;
  if (/^postgres(ql)?:\/\//i.test(target)) return target;

  const base = new URL(getDatabaseUrl());
  base.pathname = `/${target}`;
  return base.toString();
}

function sameTarget(a, b) {
  try {
    const left = parsePostgresUrl(a);
    const right = parsePostgresUrl(b);
    return (
      left.host === right.host &&
      left.port === right.port &&
      left.database === right.database &&
      left.user === right.user
    );
  } catch {
    return false;
  }
}

async function detectFormat(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const { buffer } = await handle.read(Buffer.alloc(5), 0, 5, 0);
    if (buffer.subarray(0, 5).toString() === 'PGDMP') return 'custom';
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) return 'plain-gzip';
    return 'plain';
  } finally {
    await handle.close();
  }
}

async function restoreCustom(filePath, connection) {
  const args = [
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '--exit-on-error',
    ...buildPgArgs(connection),
    filePath,
  ];
  await runCommand(process.env.PG_RESTORE_PATH || 'pg_restore', args, {
    env: buildPgEnv(connection),
    timeoutMs: 60 * 60 * 1000,
  });
}

async function restorePlain(filePath, connection) {
  const args = [
    '--set',
    'ON_ERROR_STOP=1',
    ...buildPgArgs(connection),
    '--file',
    filePath,
  ];
  await runCommand(process.env.PSQL_PATH || 'psql', args, {
    env: buildPgEnv(connection),
    timeoutMs: 60 * 60 * 1000,
  });
}

async function tableCount(connection) {
  const client = new pg.Client({
    host: connection.host,
    port: Number(connection.port),
    user: connection.user || undefined,
    password: connection.password || undefined,
    database: connection.database,
    ssl:
      needsCloudSsl(connection.host) && !isLocalHost(connection.host)
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`
    );
    return rows[0]?.count || 0;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();

  const config = loadBackupConfig();
  const accounts = selectAccounts(config, args.account ? [args.account] : []);
  const account = accounts[0];

  if (args.list) {
    assertBackupConfigured(config, accounts);
    const folder = await ensureBackupFolder(account, config);
    const files = await listBackups(account, folder.id);

    console.log(`Backups in ${account.email} / ${folder.name}:\n`);
    if (files.length === 0) console.log('  (none)');
    for (const file of files) {
      console.log(
        `  ${file.createdTime}  ${humanBytes(file.size).padStart(9)}  ${file.id}  ${file.name}`
      );
    }
    return;
  }

  let localFile = args.file;
  let downloaded = false;

  if (!localFile) {
    if (!args.latest && !args.driveFileId) {
      throw new Error('Provide --latest, --drive-file-id, or --file (or use --list).');
    }

    assertBackupConfigured(config, accounts);

    let driveFileId = args.driveFileId;
    let fileName = `download-${Date.now()}`;

    if (args.latest) {
      const latest = await getLatestBackupInfo(account.id);
      if (!latest?.driveFileId) {
        throw new Error('No successful backup found in the database log. Use --list to inspect Drive.');
      }
      driveFileId = latest.driveFileId;
      fileName = latest.fileName || fileName;
    }

    await fs.mkdir(config.tempDir, { recursive: true });
    localFile = path.join(config.tempDir, `restore-${Date.now()}-${path.basename(fileName)}`);
    downloaded = true;
    console.log(`Downloading ${driveFileId} from ${account.email}...`);
    await downloadFile(account, driveFileId, localFile);
  }

  const stat = await fs.stat(localFile);
  console.log(`Archive: ${localFile} (${humanBytes(stat.size)})`);

  let workingFile = localFile;
  if (await isEncryptedFile(workingFile)) {
    const key = args.key || config.encryptionKey;
    if (!key) throw new Error('Archive is encrypted. Set DB_BACKUP_ENCRYPTION_KEY or pass --key.');

    const decrypted = `${workingFile}.decrypted`;
    console.log('Decrypting archive...');
    await decryptFile(workingFile, decrypted, key);
    workingFile = decrypted;
  }

  let format = await detectFormat(workingFile);
  let sqlFile = workingFile;

  if (format === 'plain-gzip') {
    sqlFile = `${workingFile}.sql`;
    console.log('Decompressing SQL...');
    await pipeline(
      createReadStream(workingFile),
      createGunzip(),
      createWriteStream(sqlFile, { mode: 0o600 })
    );
    format = 'plain';
  }

  if (!args.target) {
    throw new Error('--target is required for a restore (database name or postgres:// URL).');
  }

  const targetUrl = resolveTargetUrl(args.target);
  const currentUrl = getDatabaseUrl();

  if (sameTarget(targetUrl, currentUrl) && !args.force) {
    throw new Error(
      'Refusing to restore over the database in DATABASE_URL. Use a scratch database or pass --force.'
    );
  }

  const connection = parsePostgresUrl(targetUrl);
  console.log(`Restoring into ${connection.host}:${connection.port}/${connection.database} ...`);

  if (format === 'custom') {
    await restoreCustom(sqlFile, connection);
  } else {
    await restorePlain(sqlFile, connection);
  }

  const tables = await tableCount(connection);
  console.log(`\nRestore complete: ${tables} tables in ${connection.database}.`);

  if (!args.keep) {
    const cleanup = new Set();
    if (downloaded) cleanup.add(localFile);
    if (workingFile !== localFile) cleanup.add(workingFile);
    if (sqlFile !== workingFile) cleanup.add(sqlFile);
    for (const file of cleanup) {
      if (file) await fs.unlink(file).catch(() => {});
    }
  }
}

main().catch((err) => {
  console.error(`\nRestore failed: ${err.message}`);
  if (process.env.DEBUG_BACKUP) console.error(err);
  process.exitCode = 1;
});
