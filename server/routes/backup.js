import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import {
  getBackupOverview,
  getBackupHistory,
  runBackup,
  deleteBackupRun,
  isBackupRunning,
} from '../services/backup/index.js';
import { getNextScheduledRun } from '../services/backup/scheduler.js';
import { loadBackupConfig } from '../services/backup/config.js';

const router = Router();

// Every backup endpoint is admin-only: these responses can reveal account
// emails and Drive links, and running a backup uses server credentials.
router.use(requireAuth, requireRole('ADMIN'));

function configError(err) {
  const config = loadBackupConfig();
  return {
    error: err.message,
    missing: config.missing,
  };
}

/** GET /api/backup/status — configuration, quota, last run and recent history. */
router.get('/status', async (req, res) => {
  try {
    const overview = await getBackupOverview();
    res.json({
      ...overview,
      nextRun: getNextScheduledRun(),
    });
  } catch (err) {
    console.error('Backup status error:', err);
    res.status(500).json({ error: 'Failed to load backup status' });
  }
});

/** GET /api/backup/runs?limit=50&offset=0 — paginated audit log. */
router.get('/runs', async (req, res) => {
  try {
    const history = await getBackupHistory({
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json(history);
  } catch (err) {
    console.error('Backup history error:', err);
    res.status(500).json({ error: 'Failed to load backup history' });
  }
});

/**
 * POST /api/backup/run
 * Body: { dryRun?: boolean, accountIds?: string[], applyRetention?: boolean }
 */
router.post('/run', async (req, res) => {
  if (isBackupRunning()) {
    return res.status(409).json({ error: 'A backup is already running.' });
  }

  const { dryRun = false, accountIds = [], applyRetention = true } = req.body || {};

  try {
    const result = await runBackup({
      trigger: req.user?.email ? `manual:${req.user.email}` : 'manual',
      dryRun: Boolean(dryRun),
      accountIds: Array.isArray(accountIds) ? accountIds.map(String) : [],
      applyRetention: Boolean(applyRetention),
      onLog: (line) => console.log(line),
    });

    if (!result.ok && !result.dryRun) {
      const failures = result.results.filter((item) => !item.ok);
      return res.status(502).json({
        error: `Backup failed for ${failures.length} account(s).`,
        result,
      });
    }

    res.json({ result });
  } catch (err) {
    console.error('Manual backup error:', err);
    const status = err.statusCode || 400;
    res.status(status).json(configError(err));
  }
});

/** DELETE /api/backup/runs/:id — permanently remove the Drive file + mark the log row. */
router.delete('/runs/:id', async (req, res) => {
  try {
    const run = await deleteBackupRun(req.params.id);
    res.json({ success: true, run });
  } catch (err) {
    console.error('Delete backup error:', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to delete backup' });
  }
});

export default router;
