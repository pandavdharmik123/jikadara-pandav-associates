import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

/**
 * GET /api/reports/dashboard
 * Dashboard stats for the current user
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userFilter = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [totalClients, activeTasks, completedTasks, monthlyAgg] = await Promise.all([
      prisma.client.count({ where: userFilter }),
      prisma.task.count({ where: { ...userFilter, status: 'ACTIVE' } }),
      prisma.task.count({ where: { ...userFilter, status: 'DONE' } }),
      prisma.task.aggregate({
        where: {
          ...userFilter,
          status: 'DONE',
          startDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: {
          totalIncome: true,
          totalExpense: true,
          netAmount: true,
        },
      }),
    ]);

    res.json({
      stats: {
        totalClients,
        activeTasks,
        completedTasks,
        monthlyIncome: Number(monthlyAgg._sum.totalIncome) || 0,
        monthlyExpense: Number(monthlyAgg._sum.totalExpense) || 0,
        monthlyNet: Number(monthlyAgg._sum.netAmount) || 0,
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * GET /api/reports/monthly?year=2026&month=6
 * Monthly report — completed tasks for a specific month
 */
router.get('/monthly', requireAuth, requireRole('ADMIN', 'SENIOR'), async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const userFilter = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };

    const tasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        status: 'DONE',
        startDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const totals = tasks.reduce(
      (acc, task) => ({
        totalIncome: acc.totalIncome + Number(task.totalIncome),
        totalExpense: acc.totalExpense + Number(task.totalExpense),
        netAmount: acc.netAmount + Number(task.netAmount),
      }),
      { totalIncome: 0, totalExpense: 0, netAmount: 0 }
    );

    res.json({ tasks, totals, year, month });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly report' });
  }
});

/**
 * GET /api/reports/yearly?year=2026
 * Yearly report — month-wise summary of completed tasks
 */
router.get('/yearly', requireAuth, requireRole('ADMIN', 'SENIOR'), async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const userFilter = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const tasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        status: 'DONE',
        startDate: { gte: startOfYear, lte: endOfYear },
      },
      select: {
        startDate: true,
        totalIncome: true,
        totalExpense: true,
        netAmount: true,
      },
    });

    // Group by month
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalIncome: 0,
      totalExpense: 0,
      netAmount: 0,
      taskCount: 0,
    }));

    tasks.forEach((task) => {
      const m = new Date(task.startDate).getMonth();
      months[m].totalIncome += Number(task.totalIncome);
      months[m].totalExpense += Number(task.totalExpense);
      months[m].netAmount += Number(task.netAmount);
      months[m].taskCount += 1;
    });

    const yearlyTotals = months.reduce(
      (acc, m) => ({
        totalIncome: acc.totalIncome + m.totalIncome,
        totalExpense: acc.totalExpense + m.totalExpense,
        netAmount: acc.netAmount + m.netAmount,
        taskCount: acc.taskCount + m.taskCount,
      }),
      { totalIncome: 0, totalExpense: 0, netAmount: 0, taskCount: 0 }
    );

    res.json({ months, yearlyTotals, year });
  } catch (err) {
    console.error('Yearly report error:', err);
    res.status(500).json({ error: 'Failed to fetch yearly report' });
  }
});

/**
 * GET /api/reports/recent
 * Recent clients and tasks for dashboard
 */
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const userFilter = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };

    const [recentClients, recentTasks] = await Promise.all([
      prisma.client.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, referenceName: true, mobileNumber: true, createdAt: true },
      }),
      prisma.task.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          client: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.json({ recentClients, recentTasks });
  } catch (err) {
    console.error('Recent data error:', err);
    res.status(500).json({ error: 'Failed to fetch recent data' });
  }
});

export default router;
