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
import mortgageStampDutyRoutes from './routes/mortgageStampDuty.js';
import rentAgreementRoutes from './routes/rentAgreement.js';
import verabillRoutes from './routes/verabill.js';
import notaryHisabRoutes from './routes/notaryHisab.js';
import nondhStatusRoutes from './routes/nondhStatus.js';
import translateRoutes from './routes/translate.js';
// AnyRoR portal integration (temporarily disabled)
// import anyrorRoutes from './routes/anyror.js';
import formBuilderRoutes from './routes/formBuilder.js';
import surfacyRoutes from './routes/surfacy.js';
import moeRoutes from './routes/moe.js';
import backupRoutes from './routes/backup.js';
import { startBackupScheduler } from './services/backup/scheduler.js';

import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3001; // Updated scanner pool active

// Security headers (QA-11)
app.use(helmet({
  contentSecurityPolicy: false, // Handled explicitly below
  crossOriginEmbedderPolicy: false,
  xFrameOptions: false, // Handled dynamically below (allowed for SMC viewbill proxy)
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Global CSP & frame headers
app.use((req, res, next) => {
  // Allow framing for SMC viewbill proxy from authorized frontend origins
  if (req.path.includes('/smc-viewbill-proxy') || req.path.includes('/smc-api-proxy')) {
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://jikadara-and-pandav-associates.vercel.app https://*.vercel.app http://localhost:* http://127.0.0.1:* capacitor://localhost https://localhost"
    );
    res.removeHeader('X-Frame-Options');
    return next();
  }

  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );
  next();
});

// CORS configuration (QA-01)
const allowedOrigins = [
  'https://jikadara-and-pandav-associates.vercel.app',
  'https://jikadara-pandav-associates-india.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  // Standalone income-expense app (income-expense-app/): Vite dev + preview.
  'http://localhost:5180',
  'http://127.0.0.1:5180',
  'http://localhost:4180',
  'http://127.0.0.1:4180',
  // Capacitor native shells: Android WebView origin and iOS WKWebView origin.
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'http://127.0.0.1:5173',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()) : []),
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (curl, server-to-server, mobile native requests)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const isVercelPreview = /^https:\/\/jikadara-.*\.vercel\.app$/.test(origin);
    const isRenderDomain = /^https:\/\/.*\.onrender\.com$/.test(origin);

    if (isExplicitlyAllowed || isVercelPreview || isRenderDomain) {
      callback(null, true);
    } else {
      // Reject origin gracefully without throwing an unhandled Error that triggers a 500 crash
      callback(null, false);
    }
  },
  credentials: true,
}));

// Form Builder only stores typed fields (no uploads), but a 100 KB default is
// too small for large address blocks / long lists. This parser is registered
// before the global parser so the larger limit applies only to this module.
app.use('/api/form-builder', express.json({ limit: '1mb' }), formBuilderRoutes);
app.use('/api/surfacy', express.json({ limit: '2mb' }), surfacyRoutes);
app.use('/api/moe', express.json({ limit: '10mb' }), moeRoutes);

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
app.use('/api/mortgageStampDuty', mortgageStampDutyRoutes);
app.use('/api/rentAgreement', rentAgreementRoutes);
app.use('/api/nondh-status', nondhStatusRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/verabill', verabillRoutes);
app.use('/api/notary-hisab', notaryHisabRoutes);
// AnyRoR portal integration (temporarily disabled)
// app.use('/api/anyror', anyrorRoutes);
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
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Not allowed by CORS' });
  }

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
