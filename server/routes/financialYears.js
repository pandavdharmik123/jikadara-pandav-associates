import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

/**
 * GET /api/financialYears
 * Get all financial years for the logged-in user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const financialYears = await prisma.financialYear.findMany({
      where: { userId: req.user.id },
      orderBy: { startDate: 'desc' },
    });
    res.json(financialYears);
  } catch (err) {
    console.error('Failed to fetch financial years:', err);
    res.status(500).json({ error: 'Failed to fetch financial years' });
  }
});

/**
 * POST /api/financialYears
 * Create a new financial year
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, startDate, endDate, isDefault } = req.body;
    
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, Start Date, and End Date are required' });
    }

    if (isDefault) {
      // Unset default for existing
      await prisma.financialYear.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newYear = await prisma.financialYear.create({
      data: {
        userId: req.user.id,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isDefault: isDefault || false,
      },
    });

    res.status(201).json(newYear);
  } catch (err) {
    console.error('Create financial year error:', err);
    res.status(500).json({ error: 'Failed to create financial year' });
  }
});

/**
 * PUT /api/financialYears/:id
 * Update an existing financial year
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, isDefault } = req.body;

    const existing = await prisma.financialYear.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Financial year not found' });
    }

    if (isDefault) {
      // Unset default for others
      await prisma.financialYear.updateMany({
        where: { userId: req.user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.financialYear.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Update financial year error:', err);
    res.status(500).json({ error: 'Failed to update financial year' });
  }
});

/**
 * DELETE /api/financialYears/:id
 * Delete a financial year
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.financialYear.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Financial year not found' });
    }

    await prisma.financialYear.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete financial year error:', err);
    res.status(500).json({ error: 'Failed to delete financial year' });
  }
});

export default router;
