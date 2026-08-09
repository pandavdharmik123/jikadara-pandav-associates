import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { startOfDayIST, endOfDayIST, startOfMonthIST, endOfMonthIST, toISTDateParts } from '../lib/dateUtils.js';

const router = Router();

/**
 * GET /api/reports/dashboard
 * Dashboard stats for the current user
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userFilter = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };

    const now = new Date();
    const { year: nowYear, month: nowMonth } = toISTDateParts(now);
    const startOfMonth = startOfMonthIST(nowYear, nowMonth);
    const endOfMonth = endOfMonthIST(nowYear, nowMonth);

    const { fyStartDate, fyEndDate } = req.query;
    
    let fyStart, fyEnd;
    if (fyStartDate && fyEndDate) {
      fyStart = startOfDayIST(fyStartDate);
      fyEnd = endOfDayIST(fyEndDate);
    } else {
      // Fallback to current year in IST if no FY is selected
      fyStart = startOfMonthIST(nowYear, 1);
      fyEnd = endOfMonthIST(nowYear, 12);
    }

    let effStartOfMonth = startOfMonth;
    let effEndOfMonth = endOfMonth;
    
    if (fyStart && fyStart > effStartOfMonth) effStartOfMonth = fyStart;
    if (fyEnd && fyEnd < effEndOfMonth) effEndOfMonth = fyEnd;
    
    const isMonthInFy = effStartOfMonth <= effEndOfMonth;

    const completedDateFilter = (start, end) => ({
      OR: [
        { completedDate: { gte: start, lte: end } },
        { completedDate: null, startDate: { gte: start, lte: end } },
      ],
    });

    const [totalClients, activeTasks, completedTasks, monthlyAgg, fyAgg] = await Promise.all([
      prisma.client.count({ where: userFilter }),
      prisma.task.count({ where: { ...userFilter, status: 'ACTIVE', startDate: { gte: fyStart, lte: fyEnd } } }),
      prisma.task.count({ where: { ...userFilter, status: 'DONE', ...completedDateFilter(fyStart, fyEnd) } }),
      isMonthInFy ? prisma.task.aggregate({
        where: {
          userId: req.user.id,
          status: 'DONE',
          ...completedDateFilter(effStartOfMonth, effEndOfMonth),
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
          ...completedDateFilter(fyStart, fyEnd),
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
    const month = parseInt(req.query.month) || toISTDateParts(new Date()).month;

    let startOfMonth = startOfMonthIST(year, month);
    let endOfMonth = endOfMonthIST(year, month);

    const { fyStartDate, fyEndDate } = req.query;
    if (fyStartDate) {
      const fyStart = startOfDayIST(fyStartDate);
      if (fyStart > startOfMonth) startOfMonth = fyStart;
    }
    if (fyEndDate) {
      const fyEnd = endOfDayIST(fyEndDate);
      if (fyEnd < endOfMonth) endOfMonth = fyEnd;
    }

    const isMonthInFy = startOfMonth <= endOfMonth;
    const userFilter = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };

    const completedDateFilter = (start, end) => ({
      OR: [
        { completedDate: { gte: start, lte: end } },
        { completedDate: null, startDate: { gte: start, lte: end } },
      ],
    });

    const tasks = isMonthInFy ? await prisma.task.findMany({
      where: {
        ...userFilter,
        status: 'DONE',
        ...completedDateFilter(startOfMonth, endOfMonth),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: [
        { completedDate: 'asc' },
        { startDate: 'asc' },
      ],
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
      startOfYear = startOfDayIST(fyStartDate);
      endOfYear = endOfDayIST(fyEndDate);
    } else {
      const targetYear = parseInt(year) || toISTDateParts(new Date()).year;
      startOfYear = startOfMonthIST(targetYear, 1);
      endOfYear = endOfMonthIST(targetYear, 12);
    }

    const completedDateFilter = (start, end) => ({
      OR: [
        { completedDate: { gte: start, lte: end } },
        { completedDate: null, startDate: { gte: start, lte: end } },
      ],
    });

    const tasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        status: 'DONE',
        ...completedDateFilter(startOfYear, endOfYear),
      },
      select: {
        startDate: true,
        completedDate: true,
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
      const effectiveDate = task.completedDate || task.startDate;
      const { year: y, month: m } = toISTDateParts(effectiveDate);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (monthsMap.has(key)) {
        const mo = monthsMap.get(key);
        mo.totalIncome += Number(task.totalIncome);
        mo.totalExpense += Number(task.totalExpense);
        mo.netAmount += Number(task.netAmount);
        mo.taskCount += 1;
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
      fyStart = startOfDayIST(fyStartDate);
      fyEnd = endOfDayIST(fyEndDate);
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
