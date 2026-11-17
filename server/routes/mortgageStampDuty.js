import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Create new Mortgage Stamp Duty calculation
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      clientName,
      propertyDetails,
      loanAmount,
      sanctionDate,
      vakilFee,
      grandTotal,
      calculationData
    } = req.body;

    const resolvedClient = clientName || calculationData?.oldPartyName || '';
    const resolvedPropertyDetails = propertyDetails || calculationData?.propertyDetails || '';

    const defaultTitle = resolvedClient
      ? `${resolvedClient} - Mortgage Stamp Duty`
      : 'Untitled Mortgage Calculation';

    let parsedSanctionDate = null;
    if (sanctionDate) {
      const d = new Date(sanctionDate);
      if (!isNaN(d.getTime())) parsedSanctionDate = d;
    }

    const calculation = await prisma.mortgageStampDutyCalculation.create({
      data: {
        userId: req.user.id,
        title: title || defaultTitle,
        clientName: resolvedClient,
        propertyDetails: resolvedPropertyDetails,
        loanAmount: loanAmount !== undefined && loanAmount !== null ? Number(loanAmount) : 0,
        sanctionDate: parsedSanctionDate,
        vakilFee: vakilFee !== undefined && vakilFee !== null ? Number(vakilFee) : 0,
        grandTotal: grandTotal !== undefined && grandTotal !== null ? Number(grandTotal) : 0,
        calculationData: calculationData || {}
      }
    });

    res.status(201).json({ success: true, calculation });
  } catch (error) {
    console.error('Error creating mortgage stamp duty calculation:', error);
    res.status(500).json({ error: 'Failed to create mortgage stamp duty calculation' });
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
        { clientName: { contains: q, mode: 'insensitive' } },
        { propertyDetails: { contains: q, mode: 'insensitive' } }
      ];
    }

    const calculations = await prisma.mortgageStampDutyCalculation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        clientName: true,
        propertyDetails: true,
        loanAmount: true,
        sanctionDate: true,
        vakilFee: true,
        grandTotal: true,
        calculationData: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ success: true, calculations });
  } catch (error) {
    console.error('Error fetching mortgage stamp duty calculations:', error);
    res.status(500).json({ error: 'Failed to fetch mortgage stamp duty calculations' });
  }
});

// Get a single calculation by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const calculation = await prisma.mortgageStampDutyCalculation.findFirst({
      where: {
        id,
        userId: req.user.id,
        isDeleted: false
      }
    });

    if (!calculation) {
      return res.status(404).json({ error: 'Mortgage calculation not found' });
    }

    res.json({ success: true, calculation });
  } catch (error) {
    console.error('Error fetching mortgage calculation:', error);
    res.status(500).json({ error: 'Failed to fetch mortgage calculation' });
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
      loanAmount,
      sanctionDate,
      vakilFee,
      grandTotal,
      calculationData
    } = req.body;

    const existing = await prisma.mortgageStampDutyCalculation.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Mortgage calculation not found' });
    }

    let parsedSanctionDate = undefined;
    if (sanctionDate !== undefined) {
      if (sanctionDate === null || sanctionDate === '') {
        parsedSanctionDate = null;
      } else {
        const d = new Date(sanctionDate);
        parsedSanctionDate = isNaN(d.getTime()) ? existing.sanctionDate : d;
      }
    }

    const updated = await prisma.mortgageStampDutyCalculation.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        clientName: clientName !== undefined ? clientName : existing.clientName,
        propertyDetails: propertyDetails !== undefined ? propertyDetails : existing.propertyDetails,
        loanAmount: loanAmount !== undefined && loanAmount !== null ? Number(loanAmount) : existing.loanAmount,
        sanctionDate: parsedSanctionDate !== undefined ? parsedSanctionDate : existing.sanctionDate,
        vakilFee: vakilFee !== undefined && vakilFee !== null ? Number(vakilFee) : existing.vakilFee,
        grandTotal: grandTotal !== undefined && grandTotal !== null ? Number(grandTotal) : existing.grandTotal,
        calculationData: calculationData !== undefined ? calculationData : existing.calculationData
      }
    });

    res.json({ success: true, calculation: updated });
  } catch (error) {
    console.error('Error updating mortgage calculation:', error);
    res.status(500).json({ error: 'Failed to update mortgage calculation' });
  }
});

// Soft delete a calculation
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.mortgageStampDutyCalculation.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Mortgage calculation not found' });
    }

    await prisma.mortgageStampDutyCalculation.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Mortgage calculation deleted successfully' });
  } catch (error) {
    console.error('Error deleting mortgage calculation:', error);
    res.status(500).json({ error: 'Failed to delete mortgage calculation' });
  }
});

// Clone / Duplicate an existing calculation
router.post('/:id/clone', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.mortgageStampDutyCalculation.findFirst({
      where: { id, userId: req.user.id, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Mortgage calculation not found' });
    }

    const cloned = await prisma.mortgageStampDutyCalculation.create({
      data: {
        userId: req.user.id,
        title: `${existing.title} (Copy)`,
        clientName: existing.clientName,
        propertyDetails: existing.propertyDetails,
        loanAmount: existing.loanAmount,
        sanctionDate: existing.sanctionDate,
        vakilFee: existing.vakilFee,
        grandTotal: existing.grandTotal,
        calculationData: existing.calculationData
      }
    });

    res.status(201).json({ success: true, calculation: cloned });
  } catch (error) {
    console.error('Error cloning mortgage calculation:', error);
    res.status(500).json({ error: 'Failed to clone mortgage calculation' });
  }
});

export default router;
