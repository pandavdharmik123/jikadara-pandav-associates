import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { runStartupTasks, pingDatabase } from './lib/startup.js';
import { startKeepAlive } from './lib/keepAlive.js';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import taskRoutes from './routes/tasks.js';
import transactionRoutes from './routes/transactions.js';
import reportRoutes from './routes/reports.js';
import generalExpensesRoutes from './routes/generalExpenses.js';
import officeLedgerRoutes from './routes/officeLedger.js';
import documentTypeRoutes from './routes/documentTypes.js';
import financialYearRoutes from './routes/financialYears.js';
import invoiceRoutes from './routes/invoices.js';
import documentRoutes from './routes/document.js';
import upadRoutes from './routes/upad.js';
import recycleBinRoutes from './routes/recycleBin.js';
import pedhinamuRoutes from './routes/pedhinamu.js';
import jantriRoutes from './routes/jantri.js';
import verabillRoutes from './routes/verabill.js';
import nondhStatusRoutes from './routes/nondhStatus.js';
import formBuilderRoutes from './routes/formBuilder.js';
import backupRoutes from './routes/backup.js';
import { startBackupScheduler } from './services/backup/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001; // Updated scanner pool active

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins (for ease of deployment)
    callback(null, true);
  },
  credentials: true,
}));

// Form Builder only stores typed fields (no uploads), but a 100 KB default is
// too small for large address blocks / long lists. This parser is registered
// before the global parser so the larger limit applies only to this module.
app.use('/api/form-builder', express.json({ limit: '1mb' }), formBuilderRoutes);

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/documentTypes', documentTypeRoutes);
app.use('/api/financialYears', financialYearRoutes);
app.use('/api/general-expenses', generalExpensesRoutes);
app.use('/api/office-ledger', officeLedgerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/upad', upadRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);
app.use('/api/pedhinamu', pedhinamuRoutes);
app.use('/api/jantri', jantriRoutes);
app.use('/api/verabill', verabillRoutes);
app.use('/api/backup', backupRoutes);

// Health check (includes database connectivity)
app.get('/api/health', async (req, res) => {
  try {
    await pingDatabase();
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// Error handler
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

await runStartupTasks();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startKeepAlive();
  startBackupScheduler();
});
