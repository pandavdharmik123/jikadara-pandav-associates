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
    const userFilter = {
      isDeleted: false,
      ...(req.user.role === 'ADMIN' ? {} : { userId: req.user.id }),
    };

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

    const [
      totalClients,
      activeTasks,
      completedTasks,
      monthlyAgg,
      fyAgg,
      monthlyDirectIncomeAgg,
      fyDirectIncomeAgg,
    ] = await Promise.all([
      prisma.client.count({ where: userFilter }),
      prisma.task.count({ where: { ...userFilter, status: 'ACTIVE', startDate: { gte: fyStart, lte: fyEnd } } }),
      prisma.task.count({ where: { ...userFilter, status: 'DONE', ...completedDateFilter(fyStart, fyEnd) } }),
      isMonthInFy ? prisma.task.aggregate({
        where: {
          userId: req.user.id,
          status: 'DONE',
          isDeleted: false,
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
          isDeleted: false,
          ...completedDateFilter(fyStart, fyEnd),
        },
        _sum: {
          totalIncome: true,
          totalExpense: true,
          netAmount: true,
        },
      }),
      isMonthInFy ? prisma.taskTransaction.aggregate({
        where: {
          userId: req.user.id,
          taskId: null,
          isDeleted: false,
          type: 'INCOME',
          date: { gte: effStartOfMonth, lte: effEndOfMonth },
        },
        _sum: {
          amount: true,
        },
      }) : Promise.resolve({ _sum: { amount: 0 } }),
      prisma.taskTransaction.aggregate({
        where: {
          userId: req.user.id,
          taskId: null,
          isDeleted: false,
          type: 'INCOME',
          date: { gte: fyStart, lte: fyEnd },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const mTaskInc = Number(monthlyAgg._sum.totalIncome) || 0;
    const mTaskExp = Number(monthlyAgg._sum.totalExpense) || 0;
    const mDirectInc = Number(monthlyDirectIncomeAgg._sum.amount) || 0;
    const mTotalInc = mTaskInc + mDirectInc;
    const mNet = mTotalInc - mTaskExp;

    const fyTaskInc = Number(fyAgg._sum.totalIncome) || 0;
    const fyTaskExp = Number(fyAgg._sum.totalExpense) || 0;
    const fyDirectInc = Number(fyDirectIncomeAgg._sum.amount) || 0;
    const fyTotalInc = fyTaskInc + fyDirectInc;
    const fyNet = fyTotalInc - fyTaskExp;

    res.json({
      stats: {
        totalClients,
        activeTasks,
        completedTasks,
        monthlyIncome: mTotalInc,
        monthlyExpense: mTaskExp,
        monthlyNet: mNet,
        fyIncome: fyTotalInc,
        fyExpense: fyTaskExp,
        fyNet: fyNet,
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * GET /api/reports/monthly?year=2026&month=6
 * Monthly report — completed tasks and direct income entries for a specific month
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
    const userFilter = {
      isDeleted: false,
      ...(req.user.role === 'ADMIN' ? {} : { userId: req.user.id }),
    };

    const completedDateFilter = (start, end) => ({
      OR: [
        { completedDate: { gte: start, lte: end } },
        { completedDate: null, startDate: { gte: start, lte: end } },
      ],
    });

    const [tasks, directIncomes] = await Promise.all([
      isMonthInFy ? prisma.task.findMany({
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
      }) : [],
      isMonthInFy ? prisma.taskTransaction.findMany({
        where: {
          ...userFilter,
          taskId: null,
          type: 'INCOME',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        include: {
          client: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      }) : [],
    ]);

    // Format direct income transactions to match income table format
    const directIncomeItems = directIncomes.map((item) => ({
      id: item.id,
      documentType: item.documentType || 'Income',
      place: item.place || '',
      referenceName: item.referenceName || '',
      clientId: item.clientId,
      clientName: item.clientName || '',
      client: item.client,
      startDate: item.date,
      completedDate: item.date,
      status: 'DONE',
      totalIncome: Number(item.amount),
      totalExpense: 0,
      netAmount: Number(item.amount),
      isDirectIncome: true,
    }));

    // Merge and sort by date ascending
    const combinedTasks = [...tasks, ...directIncomeItems].sort((a, b) => {
      const dateA = new Date(a.completedDate || a.startDate);
      const dateB = new Date(b.completedDate || b.startDate);
      return dateA - dateB;
    });

    const totals = combinedTasks.reduce(
      (acc, item) => ({
        totalIncome: acc.totalIncome + Number(item.totalIncome),
        totalExpense: acc.totalExpense + Number(item.totalExpense),
        netAmount: acc.netAmount + Number(item.netAmount),
      }),
      { totalIncome: 0, totalExpense: 0, netAmount: 0 }
    );

    res.json({ tasks: combinedTasks, totals, year, month });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly report' });
  }
});

/**
 * GET /api/reports/yearly
 * Yearly report — month-wise summary of completed tasks and direct income within the FY
 */
router.get('/yearly', requireAuth, requireRole('ADMIN', 'SENIOR'), async (req, res) => {
  try {
    const userFilter = {
      isDeleted: false,
      ...(req.user.role === 'ADMIN' ? {} : { userId: req.user.id }),
    };

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

    const [tasks, directIncomes] = await Promise.all([
      prisma.task.findMany({
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
      }),
      prisma.taskTransaction.findMany({
        where: {
          ...userFilter,
          taskId: null,
          type: 'INCOME',
          date: { gte: startOfYear, lte: endOfYear },
        },
        select: {
          date: true,
          amount: true,
        },
      }),
    ]);

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

    directIncomes.forEach((item) => {
      const { year: y, month: m } = toISTDateParts(item.date);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (monthsMap.has(key)) {
        const mo = monthsMap.get(key);
        mo.totalIncome += Number(item.amount);
        mo.netAmount += Number(item.amount);
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
 * Recent active clients and tasks for dashboard
 */
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const userFilter = {
      isDeleted: false,
      ...(req.user.role === 'ADMIN' ? {} : { userId: req.user.id }),
    };

    const [recentClients, recentTasks] = await Promise.all([
      prisma.client.findMany({
        where: userFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { tasks: { where: { isDeleted: false } } } },
        },
      }),
      prisma.task.findMany({
        where: userFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
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
