import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Create new Rent Agreement calculation
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      clientName,
      rentAmount,
      years,
      agreementType,
      totalCost,
      calculationData
    } = req.body;

    const resolvedClient = clientName || calculationData?.partyName || '';

    const defaultTitle = resolvedClient
      ? `${resolvedClient} - Rent Agreement`
      : 'Untitled Rent Agreement';

    const calculation = await prisma.rentAgreementCalculation.create({
      data: {
        userId: req.user.id,
        title: title || defaultTitle,
        clientName: resolvedClient,
        rentAmount: rentAmount !== undefined && rentAmount !== null ? Number(rentAmount) : 0,
        years: years !== undefined && years !== null ? parseInt(years, 10) || 0 : 0,
        agreementType: agreementType || calculationData?.agreementType || 'Residence',
        totalCost: totalCost !== undefined && totalCost !== null ? Number(totalCost) : 0,
        calculationData: calculationData || {}
      }
    });

    res.status(201).json({ success: true, calculation });
  } catch (error) {
    console.error('Error creating rent agreement calculation:', error);
    res.status(500).json({ error: 'Failed to create rent agreement calculation' });
  }
});

// List all active calculations for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;

    const where = {
      userId: req.user.id,
      isDeleted: false
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } }
      ];
    }

    const calculations = await prisma.rentAgreementCalculation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        clientName: true,
        rentAmount: true,
        years: true,
        agreementType: true,
        totalCost: true,
        calculationData: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ success: true, calculations });
  } catch (error) {
    console.error('Error fetching rent agreement calculations:', error);
    res.status(500).json({ error: 'Failed to fetch rent agreement calculations' });
  }
});

// Get a single calculation by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const calculation = await prisma.rentAgreementCalculation.findFirst({
      where: {
        id,
        userId: req.user.id,
        isDeleted: false
      }
    });

    if (!calculation) {
      return res.status(404).json({ error: 'Rent agreement calculation not found' });
    }

    res.json({ success: true, calculation });
  } catch (error) {
    console.error('Error fetching rent agreement calculation:', error);
    res.status(500).json({ error: 'Failed to fetch rent agreement calculation' });
  }
});

// Update a calculation by ID
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      clientName,
      rentAmount,
      years,
      agreementType,
      totalCost,
      calculationData
    } = req.body;

    const existing = await prisma.rentAgreementCalculation.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rent agreement calculation not found' });
    }

    const updated = await prisma.rentAgreementCalculation.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        clientName: clientName !== undefined ? clientName : existing.clientName,
        rentAmount: rentAmount !== undefined && rentAmount !== null ? Number(rentAmount) : existing.rentAmount,
        years: years !== undefined && years !== null ? parseInt(years, 10) || 0 : existing.years,
        agreementType: agreementType !== undefined ? agreementType : existing.agreementType,
        totalCost: totalCost !== undefined && totalCost !== null ? Number(totalCost) : existing.totalCost,
        calculationData: calculationData !== undefined ? calculationData : existing.calculationData
      }
    });

    res.json({ success: true, calculation: updated });
  } catch (error) {
    console.error('Error updating rent agreement calculation:', error);
    res.status(500).json({ error: 'Failed to update rent agreement calculation' });
  }
});

// Soft delete a calculation
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.rentAgreementCalculation.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rent agreement calculation not found' });
    }

    await prisma.rentAgreementCalculation.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Rent agreement calculation deleted successfully' });
  } catch (error) {
    console.error('Error deleting rent agreement calculation:', error);
    res.status(500).json({ error: 'Failed to delete rent agreement calculation' });
  }
});

// Clone / Duplicate an existing calculation
router.post('/:id/clone', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.rentAgreementCalculation.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rent agreement calculation not found' });
    }

    const cloned = await prisma.rentAgreementCalculation.create({
      data: {
        userId: req.user.id,
        title: `${existing.title} (Copy)`,
        clientName: existing.clientName,
        rentAmount: existing.rentAmount,
        years: existing.years,
        agreementType: existing.agreementType,
        totalCost: existing.totalCost,
        calculationData: existing.calculationData
      }
    });

    res.status(201).json({ success: true, calculation: cloned });
  } catch (error) {
    console.error('Error cloning rent agreement calculation:', error);
    res.status(500).json({ error: 'Failed to clone rent agreement calculation' });
  }
});

export default router;
