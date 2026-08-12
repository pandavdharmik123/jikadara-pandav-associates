import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { runStartupTasks, pingDatabase } from './lib/startup.js';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import taskRoutes from './routes/tasks.js';
import transactionRoutes from './routes/transactions.js';
import reportRoutes from './routes/reports.js';
import generalExpensesRoutes from './routes/generalExpenses.js';
import documentTypeRoutes from './routes/documentTypes.js';
import financialYearRoutes from './routes/financialYears.js';
import invoiceRoutes from './routes/invoices.js';
import documentRoutes from './routes/document.js';
import upadRoutes from './routes/upad.js';
import recycleBinRoutes from './routes/recycleBin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins (for ease of deployment)
    callback(null, true);
  },
  credentials: true,
}));
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
app.use('/api/invoices', invoiceRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/upad', upadRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);

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
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

await runStartupTasks();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
