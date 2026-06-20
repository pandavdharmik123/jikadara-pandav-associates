import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

/**
 * GET /api/tasks (query: ?clientId=xxx)
 * List tasks — optionally filtered by clientId
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.status) where.status = req.query.status;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tasks });
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/tasks/:id
 * Get a single task with all transactions
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const task = await prisma.task.findFirst({
      where,
      include: {
        client: { select: { id: true, name: true, referenceName: true } },
        transactions: { orderBy: { date: 'asc' } },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

/**
 * POST /api/tasks
 * Create a new task for a client
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { clientId, documentType, referenceName, startDate } = req.body;

    if (!clientId || !documentType) {
      return res.status(400).json({ error: 'clientId and documentType are required' });
    }

    // Verify client ownership
    const clientWhere = { id: clientId };
    if (req.user.role !== 'ADMIN') clientWhere.userId = req.user.id;

    const client = await prisma.client.findFirst({ where: clientWhere });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const task = await prisma.task.create({
      data: {
        clientId,
        userId: req.user.id,
        documentType,
        referenceName: referenceName || client.referenceName || '',
        startDate: startDate ? new Date(startDate) : new Date(),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ task });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * PUT /api/tasks/:id
 * Update a task (only if ACTIVE)
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existing = await prisma.task.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (existing.status === 'DONE') {
      return res.status(400).json({ error: 'Cannot edit a completed task' });
    }

    const { documentType, referenceName, startDate } = req.body;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(documentType !== undefined && { documentType }),
        ...(referenceName !== undefined && { referenceName }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
      },
    });

    res.json({ task });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * PATCH /api/tasks/:id/done
 * Mark task as DONE — freezes financial totals
 * Only ADMIN and SENIOR can do this
 */
router.patch('/:id/done', requireAuth, requireRole('ADMIN', 'SENIOR'), async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existing = await prisma.task.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Calculate totals from transactions
    const aggregations = await prisma.taskTransaction.groupBy({
      by: ['type'],
      where: { taskId: req.params.id },
      _sum: { amount: true },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    aggregations.forEach((agg) => {
      if (agg.type === 'INCOME') totalIncome = Number(agg._sum.amount) || 0;
      if (agg.type === 'EXPENSE') totalExpense = Number(agg._sum.amount) || 0;
    });

    const netAmount = totalIncome - totalExpense;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: 'DONE',
        totalIncome,
        totalExpense,
        netAmount,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    res.json({ task });
  } catch (err) {
    console.error('Mark done error:', err);
    res.status(500).json({ error: 'Failed to mark task as done' });
  }
});

/**
 * PATCH /api/tasks/:id/reopen
 * Reopen a DONE task back to ACTIVE
 * Only ADMIN and SENIOR can do this
 */
router.patch('/:id/reopen', requireAuth, requireRole('ADMIN', 'SENIOR'), async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existing = await prisma.task.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
    });

    res.json({ task });
  } catch (err) {
    console.error('Reopen task error:', err);
    res.status(500).json({ error: 'Failed to reopen task' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task (cascades to transactions)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existing = await prisma.task.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
