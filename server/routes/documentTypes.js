import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

// Ensure some defaults exist (optional self-healing or can just rely on manual entry)
const initializeDefaults = async () => {
  const count = await prisma.documentType.count();
  if (count === 0) {
    const defaultTypes = [
      'Sale Deed',
      'Agreement to Sale',
      'Rent Agreement',
      'Partnership Deed',
      'Will',
      'Power of Attorney'
    ];
    await Promise.all(defaultTypes.map(name => prisma.documentType.create({ data: { name } })));
  }
};
initializeDefaults().catch(console.error);

/**
 * GET /api/documentTypes
 * Get all document types
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const types = await prisma.documentType.findMany({
      orderBy: { name: 'asc' }
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
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await prisma.documentType.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Document type already exists' });
    }

    const newType = await prisma.documentType.create({
      data: { name }
    });
    res.status(201).json(newType);
  } catch (err) {
    console.error('Create document type error:', err);
    res.status(500).json({ error: 'Failed to create document type' });
  }
});

/**
 * PUT /api/documentTypes/:id
 * Update a document type (Admin only)
 */
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await prisma.documentType.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      return res.status(400).json({ error: 'Document type already exists' });
    }

    const updated = await prisma.documentType.update({
      where: { id },
      data: { name }
    });
    res.json(updated);
  } catch (err) {
    console.error('Update document type error:', err);
    res.status(500).json({ error: 'Failed to update document type' });
  }
});

/**
 * DELETE /api/documentTypes/:id
 * Delete a document type (Admin only)
 */
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.documentType.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete document type error:', err);
    res.status(500).json({ error: 'Failed to delete document type' });
  }
});

export default router;
