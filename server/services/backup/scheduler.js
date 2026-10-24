import cron from 'node-cron';
import { loadBackupConfig } from './config.js';
import { runBackup } from './index.js';

let task = null;

export function getNextScheduledRun() {
  if (!task) return null;
  try {
    return task.getNextRun?.()?.toISOString?.() || null;
  } catch {
    return null;
  }
}

/**
 * Start the in-process cron scheduler.
 *
 * This is the simplest option for a VPS or an always-on machine. On Render's
 * free tier, prefer an external scheduler (GitHub Actions / Render Cron Job)
 * calling `npm run backup`, because web services restart and can miss a run.
 */
export function startBackupScheduler({ onLog = console.log } = {}) {
  if (task) return task;

  const config = loadBackupConfig();

  if (!config.enabled) {
    onLog('⏸️  [backup] Google Drive backups are disabled (GOOGLE_DRIVE_BACKUP_ENABLED=false).');
    return null;
  }

  if (!config.scheduleEnabled) {
    onLog('⏸️  [backup] Scheduler disabled (DB_BACKUP_SCHEDULE_ENABLED=false). Manual backups still work.');
    return null;
  }

  if (!config.configured) {
    onLog(
      `⚠️  [backup] Scheduler not started — missing: ${config.missing.join(', ')}. ` +
        'Run `npm run backup:auth` and add the credentials to server/.env.'
    );
    return null;
  }

  if (!cron.validate(config.schedule)) {
    onLog(`❌ [backup] Invalid DB_BACKUP_SCHEDULE "${config.schedule}". Scheduler not started.`);
    return null;
  }

  task = cron.schedule(
    config.schedule,
    async () => {
      const started = new Date().toISOString();
      onLog(`[backup] Scheduled backup started at ${started}`);
      try {
        const result = await runBackup({ trigger: 'scheduled', onLog });
        onLog(
          `[backup] Scheduled backup ${result.ok ? 'completed' : 'finished with failures'} ` +
            `(${result.fileName}, ${result.sizeBytes} bytes)`
        );
      } catch (err) {
        onLog(`[backup] Scheduled backup failed: ${err.message}`);
      }
    },
    {
      timezone: config.timezone,
      name: 'database-backup',
    }
  );

  const next = getNextScheduledRun();
  onLog(
    `⏰ [backup] Scheduler active: "${config.schedule}" (${config.timezone})` +
      (next ? ` — next run ${next}` : '')
  );

  return task;
}

export function stopBackupScheduler() {
  if (!task) return;
  task.stop();
  task = null;
}
