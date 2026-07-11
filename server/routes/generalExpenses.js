import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

/**
 * GET /api/general-expenses
 * Get all general expenses for the logged-in user within an optional date range
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {
      userId: req.user.id,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    const expenses = await prisma.generalExpense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    res.json(expenses);
  } catch (err) {
    console.error('Failed to fetch general expenses:', err);
    res.status(500).json({ error: 'Failed to fetch general expenses' });
  }
});

/**
 * POST /api/general-expenses
 * Create a new general expense
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, description, amount } = req.body;
    
    if (!date || !amount) {
      return res.status(400).json({ error: 'Date and Amount are required' });
    }

    const newExpense = await prisma.generalExpense.create({
      data: {
        userId: req.user.id,
        date: new Date(date),
        description: description || "",
        amount: Number(amount),
      },
    });

    res.status(201).json(newExpense);
  } catch (err) {
    console.error('Create general expense error:', err);
    res.status(500).json({ error: 'Failed to create general expense' });
  }
});

/**
 * PUT /api/general-expenses/:id
 * Update an existing general expense
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, description, amount } = req.body;

    const existing = await prisma.generalExpense.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'General expense not found' });
    }

    const updated = await prisma.generalExpense.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: Number(amount) }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Update general expense error:', err);
    res.status(500).json({ error: 'Failed to update general expense' });
  }
});

/**
 * DELETE /api/general-expenses/:id
 * Delete a general expense
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.generalExpense.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'General expense not found' });
    }

    await prisma.generalExpense.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete general expense error:', err);
    res.status(500).json({ error: 'Failed to delete general expense' });
  }
});

export default router;
