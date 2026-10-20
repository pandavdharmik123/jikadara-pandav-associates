import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

/**
 * GET /api/nondh-status
 * Fetch the current user's active Nondh Status records with optional search and filters
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, status, doneOrNot, referenceName } = req.query;

    const whereClause = {
      isDeleted: false,
      userId: req.user.id,
    };

    if (status && status.trim()) {
      whereClause.status = { contains: status.trim() };
    }

    if (doneOrNot && doneOrNot.trim()) {
      if (doneOrNot === 'Done') {
        whereClause.doneOrNot = 'Done';
      } else if (doneOrNot === 'Pending') {
        whereClause.doneOrNot = { not: 'Done' };
      }
    }

    if (referenceName && referenceName.trim()) {
      whereClause.referenceName = { equals: referenceName.trim(), mode: 'insensitive' };
    }

    if (search && search.trim()) {
      const q = search.trim();
      const numQ = Number(q);
      const orConditions = [
        { placeName: { contains: q, mode: 'insensitive' } },
        { documentType: { contains: q, mode: 'insensitive' } },
        { nondhNumber: { contains: q, mode: 'insensitive' } },
        { partyName: { contains: q, mode: 'insensitive' } },
        { referenceName: { contains: q, mode: 'insensitive' } },
        { status: { contains: q, mode: 'insensitive' } },
      ];

      if (!isNaN(numQ) && numQ > 0) {
        orConditions.push({ number: numQ });
      }

      whereClause.OR = orConditions;
    }

    const nondhStatuses = await prisma.nondhStatus.findMany({
      where: whereClause,
      orderBy: { number: 'asc' },
    });

    res.json({ success: true, nondhStatuses });
  } catch (error) {
    console.error('Error fetching nondh statuses:', error);
    res.status(500).json({ error: 'Failed to fetch Nondh Status records' });
  }
});

/**
 * POST /api/nondh-status
 * Create a new Nondh Status record
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      number,
      placeName,
      documentType,
      nondhNumber,
      date,
      partyName,
      status,
      referenceName,
      doneOrNot,
      vahivatFee,
      paymentDate,
    } = req.body;

    // Calculate number if not provided (per user)
    let num = Number(number);
    if (!num || isNaN(num) || num <= 0) {
      const maxRecord = await prisma.nondhStatus.findFirst({
        where: { userId: req.user.id, isDeleted: false },
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      num = (maxRecord?.number || 0) + 1;
    }

    const created = await prisma.nondhStatus.create({
      data: {
        userId: req.user.id,
        number: num,
        placeName: placeName ? String(placeName).trim() : '',
        documentType: documentType ? String(documentType).trim() : '',
        nondhNumber: nondhNumber !== undefined && nondhNumber !== null ? String(nondhNumber).trim() : '',
        date: date ? new Date(date) : null,
        partyName: partyName ? String(partyName).trim() : '',
        status: status ? String(status).trim() : 'પ્રમાણિત',
        referenceName: referenceName ? String(referenceName).trim() : '',
        doneOrNot: doneOrNot ? String(doneOrNot).trim() : 'Done',
        vahivatFee: vahivatFee !== null && vahivatFee !== undefined && vahivatFee !== '' ? Number(vahivatFee) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
      },
    });

    res.status(201).json({ success: true, nondhStatus: created });
  } catch (error) {
    console.error('Error creating nondh status:', error);
    res.status(500).json({ error: 'Failed to create Nondh Status record' });
  }
});

/**
 * PUT /api/nondh-status/:id
 * Update an existing Nondh Status record
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      number,
      placeName,
      documentType,
      nondhNumber,
      date,
      partyName,
      status,
      referenceName,
      doneOrNot,
      vahivatFee,
      paymentDate,
    } = req.body;

    const existing = await prisma.nondhStatus.findFirst({
      where: {
        id,
        userId: req.user.id,
        isDeleted: false,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Nondh Status record not found' });
    }

    const updated = await prisma.nondhStatus.update({
      where: { id },
      data: {
        number: number !== undefined ? Number(number) : undefined,
        placeName: placeName !== undefined ? String(placeName).trim() : undefined,
        documentType: documentType !== undefined ? String(documentType).trim() : undefined,
        nondhNumber: nondhNumber !== undefined && nondhNumber !== null ? String(nondhNumber).trim() : undefined,
        date: date !== undefined ? (date ? new Date(date) : null) : undefined,
        partyName: partyName !== undefined ? String(partyName).trim() : undefined,
        status: status !== undefined ? String(status).trim() : undefined,
        referenceName: referenceName !== undefined ? String(referenceName).trim() : undefined,
        doneOrNot: doneOrNot !== undefined ? String(doneOrNot).trim() : undefined,
        vahivatFee:
          vahivatFee !== undefined
            ? (vahivatFee !== null && vahivatFee !== '' ? Number(vahivatFee) : null)
            : undefined,
        paymentDate: paymentDate !== undefined ? (paymentDate ? new Date(paymentDate) : null) : undefined,
      },
    });

    res.json({ success: true, nondhStatus: updated });
  } catch (error) {
    console.error('Error updating nondh status:', error);
    res.status(500).json({ error: 'Failed to update Nondh Status record' });
  }
});

/**
 * DELETE /api/nondh-status/:id
 * Soft delete a Nondh Status record
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.nondhStatus.findFirst({
      where: {
        id,
        userId: req.user.id,
        isDeleted: false,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Nondh Status record not found' });
    }

    await prisma.nondhStatus.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Nondh Status record deleted' });
  } catch (error) {
    console.error('Error deleting nondh status:', error);
    res.status(500).json({ error: 'Failed to delete Nondh Status record' });
  }
});

export default router;
