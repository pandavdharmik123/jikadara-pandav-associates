import path from 'node:path';
import prisma from '../../lib/prisma.js';
import { sendEmail } from '../../lib/emailService.js';
import { loadBackupConfig, selectAccounts, assertBackupConfigured, describeBackupConfig } from './config.js';
import { createDump, removeFile, fileSize } from './dump.js';
import { encryptFile } from './encrypt.js';
import { sha256File, humanBytes } from './hash.js';
import {
  getAccountIdentity,
  ensureBackupFolder,
  uploadBackup,
  listBackups,
  deleteFile,
  getStorageQuota,
  folderLink,
} from './drive.js';
import { planRetention } from './retention.js';

const MAX_INT = 2_147_483_647;

let running = false;

export function isBackupRunning() {
  return running;
}

function logLine(onLog, message) {
  try {
    onLog(`[backup] ${message}`);
  } catch {
    // never let logging break a backup
  }
}

function errorText(err) {
  return String(err?.message || err || 'Unknown error').slice(0, 2000);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendAlert(config, { subject, heading, rows, error }) {
  if (!config.alertEmail) return;

  const bodyRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0;color:#0f172a">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  try {
    await sendEmail({
      to: config.alertEmail,
      subject,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px">
          <h2 style="color:${error ? '#dc2626' : '#16a34a'};margin:0 0 12px">${escapeHtml(heading)}</h2>
          <table style="font-size:14px">${bodyRows}</table>
          ${error ? `<pre style="margin-top:16px;padding:12px;background:#fef2f2;border-radius:8px;white-space:pre-wrap;font-size:12px">${escapeHtml(error)}</pre>` : ''}
        </div>`,
      text: `${heading}\n\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}${error ? `\n\n${error}` : ''}`,
    });
  } catch (err) {
    logLine(console.warn, `Could not send backup alert email: ${err.message}`);
  }
}

async function pruneAccount(account, config, folderId, { onLog = () => {} } = {}) {
  const files = await listBackups(account, folderId);
  const plan = planRetention(files, config.retention, config.timezone);

  const deleted = [];
  const failures = [];

  for (const entry of plan.remove) {
    try {
      await deleteFile(account, entry.file.id);
      deleted.push(entry.file);
      logLine(onLog, `Retention deleted ${entry.file.name}`);
    } catch (err) {
      failures.push({ file: entry.file.name, error: errorText(err) });
      logLine(onLog, `Retention could not delete ${entry.file.name}: ${err.message}`);
    }
  }

  return {
    keepCount: plan.keepCount,
    removeCount: plan.removeCount,
    reclaimBytes: deleted.reduce((sum, file) => sum + Number(file.size || 0), 0),
    deleted: deleted.map((file) => ({ id: file.id, name: file.name })),
    failures,
    unknownCount: plan.unknown.length,
  };
}

/**
 * Run a backup: dump -> (encrypt) -> upload to every selected Google account
 * -> prune old archives -> log. Returns a summary; never throws for a single
 * account failure (other accounts still get their copy).
 */
export async function runBackup(options = {}) {
  const {
    trigger = 'manual',
    dryRun = false,
    accountIds = [],
    keepTemp = false,
    applyRetention = true,
    onLog = console.log,
  } = options;

  if (running) {
    throw new Error('A backup is already running. Wait for it to finish.');
  }

  running = true;
  const config = loadBackupConfig();
  const accounts = selectAccounts(config, accountIds);
  const startedAt = new Date();
  const tempFiles = [];
  const results = [];

  try {
    for (const warning of config.warnings) logLine(onLog, `Warning: ${warning}`);

    if (!dryRun) {
      try {
        assertBackupConfigured(config, accounts);
      } catch (err) {
        err.isConfigurationError = true;
        throw err;
      }
    } else if (accounts.length === 0) {
      logLine(onLog, 'Dry run: no Google account configured, skipping upload.');
    }

    logLine(onLog, `Creating PostgreSQL dump (${config.format})...`);
    const dump = await createDump(config, { onLog });
    tempFiles.push(dump.filePath);

    let archivePath = dump.filePath;
    let encrypted = false;

    if (config.encryptionKey) {
      const encryptedPath = `${dump.filePath}.enc`;
      logLine(onLog, 'Encrypting archive with AES-256-GCM...');
      await encryptFile(dump.filePath, encryptedPath, config.encryptionKey);
      await removeFile(dump.filePath);
      tempFiles.splice(tempFiles.indexOf(dump.filePath), 1);
      tempFiles.push(encryptedPath);
      archivePath = encryptedPath;
      encrypted = true;
    }

    const sizeBytes = await fileSize(archivePath);
    const sha256 = await sha256File(archivePath);
    const fileName = path.basename(archivePath);

    if (sizeBytes > config.maxFileBytes) {
      throw new Error(
        `Backup is ${humanBytes(sizeBytes)}, larger than DB_BACKUP_MAX_FILE_MB=${config.maxFileMb}.`
      );
    }
    if (sizeBytes > MAX_INT) {
      throw new Error('Backup exceeds the database column limit for file size.');
    }

    logLine(
      onLog,
      `Archive ready: ${fileName} (${humanBytes(sizeBytes)}, sha256 ${sha256.slice(0, 12)}...)`
    );

    if (dryRun) {
      logLine(onLog, 'Dry run complete. Nothing was uploaded.');
      return {
        ok: true,
        dryRun: true,
        fileName,
        filePath: archivePath,
        sizeBytes,
        sha256,
        encrypted,
        tables: dump.tables,
        durationMs: dump.durationMs,
        accounts: accounts.map((account) => account.email || account.id),
        results: [],
      };
    }

    for (const account of accounts) {
      const runRecord = await prisma.backupRun.create({
        data: {
          project: config.projectName,
          accountId: account.id,
          accountEmail: account.email,
          trigger,
          status: 'RUNNING',
          fileName,
          fileSizeBytes: sizeBytes,
          sha256,
          encrypted,
        },
      });

      const accountStarted = Date.now();

      try {
        logLine(onLog, `Authenticating ${account.email}...`);
        const identity = await getAccountIdentity(account);
        logLine(onLog, `Uploading to Google Drive of ${identity.email}...`);

        const folder = await ensureBackupFolder(account, config);

        let quota = await getStorageQuota(account);
        let prePrune = null;

        if (
          quota &&
          quota.limit > 0 &&
          quota.free < sizeBytes + config.minFreeBytes &&
          applyRetention
        ) {
          logLine(onLog, 'Drive is low on space; pruning old backups first...');
          prePrune = await pruneAccount(account, config, folder.id, { onLog });
          quota = { ...quota, free: quota.free + prePrune.reclaimBytes };
        }

        if (quota && quota.limit > 0 && quota.free < sizeBytes + config.minFreeBytes) {
          throw new Error(
            `Not enough free space in ${identity.email}'s Google Drive: ` +
              `${humanBytes(quota.free)} free, ${humanBytes(sizeBytes + config.minFreeBytes)} required ` +
              `(includes ${config.minFreeMb} MB safety margin). Free up Drive space or reduce retention.`
          );
        }

        const uploaded = await uploadBackup(account, folder.id, archivePath, {
          name: fileName,
          appProperties: {
            project: config.projectName,
            createdAt: startedAt.toISOString(),
            sha256,
            format: config.format,
            encrypted: String(encrypted),
            trigger,
          },
        });

        let retention = prePrune;
        if (applyRetention) {
          retention = await pruneAccount(account, config, folder.id, { onLog });
        }

        const durationMs = Date.now() - accountStarted;

        await prisma.backupRun.update({
          where: { id: runRecord.id },
          data: {
            status: 'SUCCESS',
            driveFileId: uploaded.id,
            driveWebLink: uploaded.webViewLink,
            fileSizeBytes: uploaded.size,
            durationMs,
            finishedAt: new Date(),
          },
        });

        results.push({
          ok: true,
          accountId: account.id,
          accountEmail: identity.email,
          driveFileId: uploaded.id,
          webViewLink: uploaded.webViewLink,
          folderId: folder.id,
          folderLink: folderLink(folder.id),
          sizeBytes: uploaded.size,
          durationMs,
          retention,
        });

        logLine(
          onLog,
          `Uploaded to ${identity.email} in ${durationMs} ms` +
            (retention ? ` (${retention.removeCount} old backup(s) removed)` : '')
        );

        if (config.alertOnSuccess) {
          await sendAlert(config, {
            subject: `[Backup] Success — ${config.projectName}`,
            heading: 'Database backup uploaded',
            rows: [
              ['Project', config.projectName],
              ['Account', identity.email],
              ['File', fileName],
              ['Size', humanBytes(uploaded.size)],
              ['Duration', `${durationMs} ms`],
              ['Drive', uploaded.webViewLink || ''],
            ],
            error: null,
          });
        }
      } catch (err) {
        const durationMs = Date.now() - accountStarted;
        await prisma.backupRun
          .update({
            where: { id: runRecord.id },
            data: {
              status: 'FAILED',
              error: errorText(err),
              durationMs,
              finishedAt: new Date(),
            },
          })
          .catch(() => {});

        results.push({
          ok: false,
          accountId: account.id,
          accountEmail: account.email,
          error: errorText(err),
          durationMs,
        });

        logLine(onLog, `Backup failed for ${account.email}: ${err.message}`);

        await sendAlert(config, {
          subject: `[Backup] FAILED — ${config.projectName}`,
          heading: 'Database backup failed',
          rows: [
            ['Project', config.projectName],
            ['Account', account.email],
            ['File', fileName],
            ['Trigger', trigger],
          ],
          error: errorText(err),
        });
      }
    }

    const ok = results.length > 0 && results.every((result) => result.ok);

    return {
      ok,
      dryRun: false,
      fileName,
      filePath: archivePath,
      sizeBytes,
      sha256,
      encrypted,
      tables: dump.tables,
      durationMs: dump.durationMs,
      accounts: accounts.map((account) => account.email || account.id),
      results,
    };
  } catch (err) {
    // Failure before/while dumping: record it so the admin UI shows the error.
    // Configuration mistakes are not backup failures, so they are not logged.
    if (!dryRun && !err.isConfigurationError) {
      await prisma.backupRun
        .create({
          data: {
            project: config.projectName,
            accountId: accounts[0]?.id || '',
            accountEmail: accounts[0]?.email || '',
            trigger,
            status: 'FAILED',
            fileName: null,
            error: errorText(err),
            finishedAt: new Date(),
          },
        })
        .catch(() => {});
    }

    logLine(onLog, `Backup failed: ${err.message}`);

    if (!dryRun) {
      await sendAlert(config, {
        subject: `[Backup] FAILED — ${config.projectName}`,
        heading: 'Database backup failed before upload',
        rows: [
          ['Project', config.projectName],
          ['Trigger', trigger],
          ['Accounts', accounts.map((account) => account.email || account.id).join(', ') || '—'],
        ],
        error: errorText(err),
      });
    }

    throw err;
  } finally {
    if (!keepTemp) {
      for (const file of tempFiles) {
        await removeFile(file);
      }
    }
    running = false;
  }
}

export async function getBackupOverview() {
  const config = loadBackupConfig();
  const accounts = selectAccounts(config);

  const [lastRuns, totals, successCount, failedCount] = await Promise.all([
    prisma.backupRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
    prisma.backupRun.aggregate({
      where: { status: 'SUCCESS', deletedAt: null },
      _sum: { fileSizeBytes: true },
      _count: { _all: true },
    }),
    prisma.backupRun.count({ where: { status: 'SUCCESS' } }),
    prisma.backupRun.count({ where: { status: 'FAILED' } }),
  ]);

  let quota = null;
  let quotaError = null;
  if (accounts.length > 0 && accounts[0].configured) {
    quota = await getStorageQuota(accounts[0]);
    if (!quota) quotaError = 'Google Drive did not expose storage quota for this scope.';
  }

  return {
    running,
    config: describeBackupConfig(config),
    accounts: accounts.map((account) => ({
      id: account.id,
      email: account.email,
      folderId: account.folderId || null,
      folderLink: folderLink(account.folderId),
    })),
    quota,
    quotaError,
    lastRun: lastRuns[0] || null,
    recentRuns: lastRuns,
    totals: {
      successful: successCount,
      failed: failedCount,
      storedBytes: totals._sum.fileSizeBytes || 0,
      trackedFiles: totals._count._all || 0,
    },
  };
}

export async function getBackupHistory({ limit = 50, offset = 0 } = {}) {
  const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const skip = Math.max(Number(offset) || 0, 0);

  const [items, total] = await Promise.all([
    prisma.backupRun.findMany({
      orderBy: { startedAt: 'desc' },
      take,
      skip,
    }),
    prisma.backupRun.count(),
  ]);

  return { items, total, limit: take, offset: skip };
}

export async function deleteBackupRun(runId) {
  const run = await prisma.backupRun.findUnique({ where: { id: runId } });
  if (!run) {
    const error = new Error('Backup record not found.');
    error.statusCode = 404;
    throw error;
  }

  if (run.status === 'DELETED') return run;

  if (run.driveFileId) {
    const config = loadBackupConfig();
    const account =
      config.accounts.find((item) => item.id === run.accountId) ||
      config.accounts.find((item) => item.email === run.accountEmail);

    if (!account?.configured) {
      throw new Error('The Google account for this backup is no longer configured.');
    }

    await deleteFile(account, run.driveFileId);
  }

  return prisma.backupRun.update({
    where: { id: runId },
    data: { status: 'DELETED', deletedAt: new Date() },
  });
}

export async function getLatestBackupInfo(accountId) {
  return prisma.backupRun.findFirst({
    where: {
      status: 'SUCCESS',
      deletedAt: null,
      ...(accountId ? { accountId } : {}),
    },
    orderBy: { startedAt: 'desc' },
  });
}

export { describeBackupConfig };
