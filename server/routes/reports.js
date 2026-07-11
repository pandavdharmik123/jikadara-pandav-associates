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

    const { fyStartDate, fyEndDate } = req.query;
    
    let fyStart, fyEnd;
    if (fyStartDate && fyEndDate) {
      fyStart = new Date(fyStartDate);
      fyEnd = new Date(fyEndDate);
    } else {
      // Fallback to current year if no FY is selected
      fyStart = new Date(now.getFullYear(), 0, 1);
      fyEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    let effStartOfMonth = startOfMonth;
    let effEndOfMonth = endOfMonth;
    
    if (fyStart && fyStart > effStartOfMonth) effStartOfMonth = fyStart;
    if (fyEnd && fyEnd < effEndOfMonth) effEndOfMonth = fyEnd;
    
    const isMonthInFy = effStartOfMonth <= effEndOfMonth;

    const [totalClients, activeTasks, completedTasks, monthlyAgg, fyAgg] = await Promise.all([
      prisma.client.count({ where: userFilter }),
      prisma.task.count({ where: { ...userFilter, status: 'ACTIVE', startDate: { gte: fyStart, lte: fyEnd } } }),
      prisma.task.count({ where: { ...userFilter, status: 'DONE', startDate: { gte: fyStart, lte: fyEnd } } }),
      isMonthInFy ? prisma.task.aggregate({
        where: {
          userId: req.user.id,
          status: 'DONE',
          startDate: { gte: effStartOfMonth, lte: effEndOfMonth },
        },
        _sum: {
          totalIncome: true,
          totalExpense: true,
          netAmount: true,
        },
      }) : Promise.resolve({ _sum: { totalIncome: 0, totalExpense: 0, netAmount: 0 } }),
      prisma.task.aggregate({
        where: {
          userId: req.user.id,
          status: 'DONE',
          startDate: { gte: fyStart, lte: fyEnd },
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
        fyIncome: Number(fyAgg._sum.totalIncome) || 0,
        fyExpense: Number(fyAgg._sum.totalExpense) || 0,
        fyNet: Number(fyAgg._sum.netAmount) || 0,
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

    let startOfMonth = new Date(year, month - 1, 1);
    let endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const { fyStartDate, fyEndDate } = req.query;
    if (fyStartDate) {
      const fyStart = new Date(fyStartDate);
      if (fyStart > startOfMonth) startOfMonth = fyStart;
    }
    if (fyEndDate) {
      const fyEnd = new Date(fyEndDate);
      if (fyEnd < endOfMonth) endOfMonth = fyEnd;
    }

    const isMonthInFy = startOfMonth <= endOfMonth;
    const userFilter = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };

    const tasks = isMonthInFy ? await prisma.task.findMany({
      where: {
        ...userFilter,
        status: 'DONE',
        startDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    }) : [];

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
 * GET /api/reports/yearly
 * Yearly report — month-wise summary of completed tasks within the FY
 */
router.get('/yearly', requireAuth, requireRole('ADMIN', 'SENIOR'), async (req, res) => {
  try {
    const userFilter = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };

    const { fyStartDate, fyEndDate, year } = req.query;
    
    let startOfYear, endOfYear;
    if (fyStartDate && fyEndDate) {
      startOfYear = new Date(fyStartDate);
      endOfYear = new Date(fyEndDate);
    } else {
      const targetYear = parseInt(year) || new Date().getFullYear();
      startOfYear = new Date(targetYear, 0, 1);
      endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
    }

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

    // Group by YYYY-MM
    const monthsMap = new Map();
    
    // Initialize map with all months in range
    let current = new Date(startOfYear.getFullYear(), startOfYear.getMonth(), 1);
    while (current <= endOfYear) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      monthsMap.set(key, {
        key,
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        totalIncome: 0,
        totalExpense: 0,
        netAmount: 0,
        taskCount: 0,
      });
      current.setMonth(current.getMonth() + 1);
    }

    tasks.forEach((task) => {
      const d = new Date(task.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthsMap.has(key)) {
        const m = monthsMap.get(key);
        m.totalIncome += Number(task.totalIncome);
        m.totalExpense += Number(task.totalExpense);
        m.netAmount += Number(task.netAmount);
        m.taskCount += 1;
      }
    });
    
    const months = Array.from(monthsMap.values());

    const yearlyTotals = months.reduce(
      (acc, m) => ({
        totalIncome: acc.totalIncome + m.totalIncome,
        totalExpense: acc.totalExpense + m.totalExpense,
        netAmount: acc.netAmount + m.netAmount,
        taskCount: acc.taskCount + m.taskCount,
      }),
      { totalIncome: 0, totalExpense: 0, netAmount: 0, taskCount: 0 }
    );

    res.json({ months, yearlyTotals, fyStartDate, fyEndDate });
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
    
    const { fyStartDate, fyEndDate } = req.query;
    
    let fyStart, fyEnd;
    if (fyStartDate && fyEndDate) {
      fyStart = new Date(fyStartDate);
      fyEnd = new Date(fyEndDate);
    }

    const [recentClients, recentTasks] = await Promise.all([
      prisma.client.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, referenceName: true, mobileNumber: true, createdAt: true },
      }),
      prisma.task.findMany({
        where: {
          ...userFilter,
          ...(fyStart && fyEnd && { startDate: { gte: fyStart, lte: fyEnd } }),
        },
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
