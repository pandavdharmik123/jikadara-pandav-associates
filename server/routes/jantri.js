import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Create new Jantri calculation
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      clientName,
      propertyDetails,
      village,
      propertyType,
      finalValue,
      totalFee,
      calculationData
    } = req.body;

    const resolvedClient = clientName || calculationData?.buyerName || '';
    const resolvedVillage = village || calculationData?.village || '';
    const resolvedPropertyType = propertyType || calculationData?.propertyType || '';
    const resolvedPropertyDetails = propertyDetails || calculationData?.propertyDetails || '';

    const defaultTitle = resolvedClient
      ? (resolvedVillage ? `${resolvedClient} (${resolvedVillage}) - Jantri` : `${resolvedClient} - Jantri`)
      : 'Untitled Jantri';

    const calculation = await prisma.jantriCalculation.create({
      data: {
        userId: req.user.id,
        title: title || defaultTitle,
        clientName: resolvedClient,
        propertyDetails: resolvedPropertyDetails,
        village: resolvedVillage,
        propertyType: resolvedPropertyType,
        finalValue: finalValue !== undefined && finalValue !== null ? Number(finalValue) : 0,
        totalFee: totalFee !== undefined && totalFee !== null ? Number(totalFee) : 0,
        calculationData: calculationData || {}
      }
    });

    res.status(201).json({ success: true, calculation });
  } catch (error) {
    console.error('Error creating jantri calculation:', error);
    res.status(500).json({ error: 'Failed to create jantri calculation' });
  }
});

// List all active calculations for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, propertyType } = req.query;

    const where = {
      userId: req.user.id,
      isDeleted: false
    };

    if (propertyType && propertyType !== 'ALL') {
      where.propertyType = propertyType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { propertyDetails: { contains: q, mode: 'insensitive' } },
        { village: { contains: q, mode: 'insensitive' } },
      ];
    }

    const calculations = await prisma.jantriCalculation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        clientName: true,
        propertyDetails: true,
        village: true,
        propertyType: true,
        finalValue: true,
        totalFee: true,
        calculationData: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ success: true, calculations });
  } catch (error) {
    console.error('Error fetching jantri calculations:', error);
    res.status(500).json({ error: 'Failed to fetch jantri calculations' });
  }
});

// Get a single calculation by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const calculation = await prisma.jantriCalculation.findFirst({
      where: {
        id,
        userId: req.user.id,
        isDeleted: false
      }
    });

    if (!calculation) {
      return res.status(404).json({ error: 'Jantri calculation not found' });
    }

    res.json({ success: true, calculation });
  } catch (error) {
    console.error('Error fetching jantri calculation:', error);
    res.status(500).json({ error: 'Failed to fetch jantri calculation' });
  }
});

// Update a calculation by ID
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      clientName,
      propertyDetails,
      village,
      propertyType,
      finalValue,
      totalFee,
      calculationData
    } = req.body;

    const existing = await prisma.jantriCalculation.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Jantri calculation not found' });
    }

    const updated = await prisma.jantriCalculation.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        clientName: clientName !== undefined ? clientName : existing.clientName,
        propertyDetails: propertyDetails !== undefined ? propertyDetails : existing.propertyDetails,
        village: village !== undefined ? village : existing.village,
        propertyType: propertyType !== undefined ? propertyType : existing.propertyType,
        finalValue: finalValue !== undefined && finalValue !== null ? Number(finalValue) : existing.finalValue,
        totalFee: totalFee !== undefined && totalFee !== null ? Number(totalFee) : existing.totalFee,
        calculationData: calculationData !== undefined ? calculationData : existing.calculationData
      }
    });

    res.json({ success: true, calculation: updated });
  } catch (error) {
    console.error('Error updating jantri calculation:', error);
    res.status(500).json({ error: 'Failed to update jantri calculation' });
  }
});

// Soft delete a calculation
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.jantriCalculation.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Jantri calculation not found' });
    }

    await prisma.jantriCalculation.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Jantri calculation deleted successfully' });
  } catch (error) {
    console.error('Error deleting jantri calculation:', error);
    res.status(500).json({ error: 'Failed to delete jantri calculation' });
  }
});

// Clone / Duplicate an existing calculation
router.post('/:id/clone', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.jantriCalculation.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Jantri calculation not found' });
    }

    const cloned = await prisma.jantriCalculation.create({
      data: {
        userId: req.user.id,
        title: `${existing.title} (Copy)`,
        clientName: existing.clientName,
        propertyDetails: existing.propertyDetails,
        village: existing.village,
        propertyType: existing.propertyType,
        finalValue: existing.finalValue,
        totalFee: existing.totalFee,
        calculationData: existing.calculationData
      }
    });

    res.status(201).json({ success: true, calculation: cloned });
  } catch (error) {
    console.error('Error cloning jantri calculation:', error);
    res.status(500).json({ error: 'Failed to clone jantri calculation' });
  }
});

export default router;
