import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Create new Pedhinamu draft/document
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      applicantName,
      deceasedName,
      documentData
    } = req.body;

    const pedhinamu = await prisma.pedhinamu.create({
      data: {
        userId: req.user.id,
        title: title || 'Untitled Pedhinamu',
        applicantName: applicantName || '',
        deceasedName: deceasedName || '',
        documentData: documentData || {}
      }
    });

    res.status(201).json({ success: true, pedhinamu });
  } catch (error) {
    console.error('Error creating pedhinamu draft:', error);
    res.status(500).json({ error: 'Failed to create pedhinamu draft' });
  }
});

// List all active drafts for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const pedhinamus = await prisma.pedhinamu.findMany({
      where: {
        userId: req.user.id,
        isDeleted: false
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        applicantName: true,
        deceasedName: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ success: true, pedhinamus });
  } catch (error) {
    console.error('Error fetching pedhinamus:', error);
    res.status(500).json({ error: 'Failed to fetch pedhinamus' });
  }
});

// Get a single draft by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pedhinamu = await prisma.pedhinamu.findFirst({
      where: {
        id,
        userId: req.user.id,
        isDeleted: false
      }
    });

    if (!pedhinamu) {
      return res.status(404).json({ error: 'Pedhinamu document not found' });
    }

    res.json({ success: true, pedhinamu });
  } catch (error) {
    console.error('Error fetching pedhinamu:', error);
    res.status(500).json({ error: 'Failed to fetch pedhinamu' });
  }
});

// Update a draft by ID
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      applicantName,
      deceasedName,
      documentData
    } = req.body;

    const existing = await prisma.pedhinamu.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pedhinamu document not found' });
    }

    const updated = await prisma.pedhinamu.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        applicantName: applicantName !== undefined ? applicantName : existing.applicantName,
        deceasedName: deceasedName !== undefined ? deceasedName : existing.deceasedName,
        documentData: documentData !== undefined ? documentData : existing.documentData
      }
    });

    res.json({ success: true, pedhinamu: updated });
  } catch (error) {
    console.error('Error updating pedhinamu:', error);
    res.status(500).json({ error: 'Failed to update pedhinamu' });
  }
});

// Soft delete a draft
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.pedhinamu.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pedhinamu document not found' });
    }

    await prisma.pedhinamu.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Pedhinamu deleted successfully' });
  } catch (error) {
    console.error('Error deleting pedhinamu:', error);
    res.status(500).json({ error: 'Failed to delete pedhinamu' });
  }
});

export default router;
