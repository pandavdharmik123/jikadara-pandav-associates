import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

/**
 * GET /api/clients
 * List all clients for the authenticated user (Admin sees all)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };
    const search = req.query.search;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { referenceName: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search } },
      ];
    }

    const { fyStartDate, fyEndDate } = req.query;
    let fyFilter = {};
    if (fyStartDate && fyEndDate) {
      fyFilter = { startDate: { gte: new Date(fyStartDate), lte: new Date(fyEndDate) } };
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: { select: { tasks: { where: fyFilter } } },
        tasks: { where: fyFilter, select: { status: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ clients });
  } catch (err) {
    console.error('List clients error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * GET /api/clients/:id
 * Get a single client with tasks
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const { fyStartDate, fyEndDate } = req.query;
    let fyFilter = {};
    if (fyStartDate && fyEndDate) {
      fyFilter = { startDate: { gte: new Date(fyStartDate), lte: new Date(fyEndDate) } };
    }

    const client = await prisma.client.findFirst({
      where,
      include: {
        tasks: {
          where: fyFilter,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { transactions: true } } },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client });
  } catch (err) {
    console.error('Get client error:', err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

/**
 * POST /api/clients
 * Create a new client
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, referenceName, mobileNumber } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const client = await prisma.client.create({
      data: {
        userId: req.user.id,
        name,
        referenceName: referenceName || '',
        mobileNumber: mobileNumber || '',
      },
    });

    res.status(201).json({ client });
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

/**
 * PUT /api/clients/:id
 * Update a client
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existing = await prisma.client.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { name, referenceName, mobileNumber } = req.body;

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(referenceName !== undefined && { referenceName }),
        ...(mobileNumber !== undefined && { mobileNumber }),
      },
    });

    res.json({ client });
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

/**
 * DELETE /api/clients/:id
 * Delete a client (cascades to tasks and transactions)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existing = await prisma.client.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
