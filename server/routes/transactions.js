import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

/**
 * GET /api/transactions?taskId=xxx
 * List transactions for a task
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId) {
      return res.status(400).json({ error: 'taskId query parameter is required' });
    }

    // Verify task ownership
    const taskWhere = { id: taskId };
    if (req.user.role !== 'ADMIN') taskWhere.userId = req.user.id;

    const task = await prisma.task.findFirst({ where: taskWhere });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const transactions = await prisma.taskTransaction.findMany({
      where: { taskId },
      orderBy: { date: 'asc' },
    });

    res.json({ transactions });
  } catch (err) {
    console.error('List transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * POST /api/transactions
 * Add a new transaction (INCOME or EXPENSE) to a task
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { taskId, date, type, description, amount } = req.body;

    if (!taskId || !type || amount === undefined) {
      return res.status(400).json({ error: 'taskId, type, and amount are required' });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'type must be INCOME or EXPENSE' });
    }

    // Verify task ownership and status
    const taskWhere = { id: taskId };
    if (req.user.role !== 'ADMIN') taskWhere.userId = req.user.id;

    const task = await prisma.task.findFirst({ where: taskWhere });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'DONE') {
      return res.status(400).json({ error: 'Cannot add transactions to a completed task' });
    }

    const transaction = await prisma.taskTransaction.create({
      data: {
        taskId,
        userId: req.user.id,
        date: date ? new Date(date) : new Date(),
        type,
        description: description || '',
        amount: parseFloat(amount) || 0,
      },
    });

    // Recalculate task totals
    const aggregations = await prisma.taskTransaction.groupBy({
      by: ['type'],
      where: { taskId },
      _sum: { amount: true },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    aggregations.forEach((agg) => {
      if (agg.type === 'INCOME') totalIncome = Number(agg._sum.amount) || 0;
      if (agg.type === 'EXPENSE') totalExpense = Number(agg._sum.amount) || 0;
    });

    await prisma.task.update({
      where: { id: taskId },
      data: {
        totalIncome,
        totalExpense,
        netAmount: totalIncome - totalExpense,
      },
    });

    res.status(201).json({ transaction });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * PUT /api/transactions/:id
 * Update a transaction
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existing = await prisma.taskTransaction.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check task is not DONE
    const task = await prisma.task.findUnique({ where: { id: existing.taskId } });
    if (task?.status === 'DONE') {
      return res.status(400).json({ error: 'Cannot edit transactions of a completed task' });
    }

    const { date, type, description, amount } = req.body;

    const transaction = await prisma.taskTransaction.update({
      where: { id: req.params.id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
      },
    });

    // Recalculate task totals
    const aggregations = await prisma.taskTransaction.groupBy({
      by: ['type'],
      where: { taskId: existing.taskId },
      _sum: { amount: true },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    aggregations.forEach((agg) => {
      if (agg.type === 'INCOME') totalIncome = Number(agg._sum.amount) || 0;
      if (agg.type === 'EXPENSE') totalExpense = Number(agg._sum.amount) || 0;
    });

    await prisma.task.update({
      where: { id: existing.taskId },
      data: {
        totalIncome,
        totalExpense,
        netAmount: totalIncome - totalExpense,
      },
    });

    res.json({ transaction });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existing = await prisma.taskTransaction.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check task is not DONE
    const task = await prisma.task.findUnique({ where: { id: existing.taskId } });
    if (task?.status === 'DONE') {
      return res.status(400).json({ error: 'Cannot delete transactions of a completed task' });
    }

    const taskId = existing.taskId;

    await prisma.taskTransaction.delete({ where: { id: req.params.id } });

    // Recalculate task totals
    const aggregations = await prisma.taskTransaction.groupBy({
      by: ['type'],
      where: { taskId },
      _sum: { amount: true },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    aggregations.forEach((agg) => {
      if (agg.type === 'INCOME') totalIncome = Number(agg._sum.amount) || 0;
      if (agg.type === 'EXPENSE') totalExpense = Number(agg._sum.amount) || 0;
    });

    await prisma.task.update({
      where: { id: taskId },
      data: {
        totalIncome,
        totalExpense,
        netAmount: totalIncome - totalExpense,
      },
    });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
