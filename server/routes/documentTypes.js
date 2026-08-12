import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

/**
 * GET /api/documentTypes
 * Get all active document types
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const types = await prisma.documentType.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });
    res.json(types);
  } catch (err) {
    console.error('Failed to fetch document types:', err);
    res.status(500).json({ error: 'Failed to fetch document types' });
  }
});

/**
 * POST /api/documentTypes
 * Create a new document type
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const trimmedName = name.trim();
    const existing = await prisma.documentType.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    });

    if (existing) {
      if (existing.isDeleted) {
        // If it was previously soft-deleted, reactivate it
        const reactivated = await prisma.documentType.update({
          where: { id: existing.id },
          data: { isDeleted: false, deletedAt: null, name: trimmedName },
        });
        return res.status(201).json(reactivated);
      }
      return res.status(400).json({ error: 'Document type already exists' });
    }

    const newType = await prisma.documentType.create({
      data: { name: trimmedName },
    });
    res.status(201).json(newType);
  } catch (err) {
    console.error('Create document type error:', err);
    res.status(500).json({ error: 'Failed to create document type' });
  }
});

/**
 * PUT /api/documentTypes/:id
 * Update a document type
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const trimmedName = name.trim();
    const existing = await prisma.documentType.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    });

    if (existing && existing.id !== id && !existing.isDeleted) {
      return res.status(400).json({ error: 'Document type already exists' });
    }

    const updated = await prisma.documentType.update({
      where: { id },
      data: { name: trimmedName },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update document type error:', err);
    res.status(500).json({ error: 'Failed to update document type' });
  }
});

/**
 * DELETE /api/documentTypes/:id
 * Soft delete a document type
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.documentType.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document type not found' });
    }

    await prisma.documentType.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    res.json({ success: true, message: 'Document type moved to Recycle Bin' });
  } catch (err) {
    console.error('Delete document type error:', err);
    res.status(500).json({ error: 'Failed to delete document type' });
  }
});

export default router;
