import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';
import { startOfDayIST, endOfDayIST } from '../lib/dateUtils.js';

const router = Router();

/**
 * GET /api/upad
 * Get all active Upad entries with optional filters (userName, date range, search)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { userName, startDate, endDate, fyStartDate, fyEndDate, search } = req.query;

    const whereClause = {
      isDeleted: false,
    };

    if (userName && userName !== 'ALL') {
      whereClause.userName = { equals: userName.trim(), mode: 'insensitive' };
    }

    // Date filtering (specific range or financial year)
    const effectiveStart = startDate || fyStartDate;
    const effectiveEnd = endDate || fyEndDate;

    if (effectiveStart || effectiveEnd) {
      whereClause.date = {};
      if (effectiveStart) whereClause.date.gte = startOfDayIST(effectiveStart);
      if (effectiveEnd) whereClause.date.lte = endOfDayIST(effectiveEnd);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereClause.OR = [
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { userName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const upads = await prisma.upad.findMany({
      where: whereClause,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Compute summary metrics
    const totalAmount = upads.reduce((sum, item) => sum + Number(item.amount), 0);
    const uniqueUsers = new Set(
      upads
        .map((item) => item.userName?.trim().toLowerCase())
        .filter(Boolean)
    );

    res.json({
      upads,
      summary: {
        totalAmount,
        totalEntries: upads.length,
        totalUsers: uniqueUsers.size,
      },
    });
  } catch (err) {
    console.error('Failed to fetch Upads:', err);
    res.status(500).json({ error: 'Failed to fetch Upad records' });
  }
});

/**
 * GET /api/upad/:id
 * Get single active Upad record by ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const upad = await prisma.upad.findFirst({
      where: { id: req.params.id, isDeleted: false },
    });

    if (!upad) {
      return res.status(404).json({ error: 'Upad record not found' });
    }

    res.json({ upad });
  } catch (err) {
    console.error('Failed to fetch Upad record:', err);
    res.status(500).json({ error: 'Failed to fetch Upad record' });
  }
});

/**
 * POST /api/upad
 * Create a new Upad record with direct userName text
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, userName, description, amount } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    if (!userName || !userName.trim()) {
      return res.status(400).json({ error: 'User name is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount greater than 0 is required' });
    }

    const newUpad = await prisma.upad.create({
      data: {
        date: startOfDayIST(date),
        userId: req.user.id,
        userName: userName.trim(),
        description: description.trim(),
        amount: Number(amount),
      },
    });

    res.status(201).json({ upad: newUpad });
  } catch (err) {
    console.error('Create Upad error:', err);
    res.status(500).json({ error: err.message || 'Failed to create Upad record' });
  }
});

/**
 * PUT /api/upad/:id
 * Update an existing Upad record
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, userName, description, amount } = req.body;

    const existing = await prisma.upad.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Upad record not found' });
    }

    const updateData = {};

    if (date) {
      updateData.date = startOfDayIST(date);
    }

    if (userName !== undefined) {
      if (!userName.trim()) {
        return res.status(400).json({ error: 'User name cannot be empty' });
      }
      updateData.userName = userName.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({ error: 'Description cannot be empty' });
      }
      updateData.description = description.trim();
    }

    if (amount !== undefined) {
      if (isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Valid amount greater than 0 is required' });
      }
      updateData.amount = Number(amount);
    }

    const updatedUpad = await prisma.upad.update({
      where: { id },
      data: updateData,
    });

    res.json({ upad: updatedUpad });
  } catch (err) {
    console.error('Update Upad error:', err);
    res.status(500).json({ error: err.message || 'Failed to update Upad record' });
  }
});

/**
 * DELETE /api/upad/:id
 * Soft delete an Upad record
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.upad.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Upad record not found' });
    }

    await prisma.upad.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    res.json({ message: 'Upad record moved to Recycle Bin' });
  } catch (err) {
    console.error('Delete Upad error:', err);
    res.status(500).json({ error: 'Failed to delete Upad record' });
  }
});

export default router;
