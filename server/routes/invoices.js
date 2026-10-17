import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

const getUserFilter = (req) => {
  return req.user.role === 'ADMIN' ? {} : { userId: req.user.id };
};

// Create an invoice
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      invoiceNo,
      taskId,
      clientName,
      date,
      discountAmount,
      jamaAmount,
      subTotal,
      total,
      balance,
      items
    } = req.body;

    const userFilter = getUserFilter(req);
    const trimmedNo = invoiceNo?.toString().trim();

    // If an active invoice with this invoice number already exists, update it instead of creating a duplicate
    const existing = await prisma.invoice.findFirst({
      where: {
        invoiceNo: trimmedNo,
        ...userFilter,
        isDeleted: false,
      }
    });

    if (existing) {
      const updatedInvoice = await prisma.invoice.update({
        where: { id: existing.id },
        data: {
          taskId: taskId || null,
          clientName,
          date: new Date(date),
          discountAmount,
          jamaAmount,
          subTotal,
          total,
          balance,
          items
        }
      });
      return res.status(200).json({ invoice: updatedInvoice });
    }

    const invoice = await prisma.invoice.create({
      data: {
        userId: req.user.id,
        invoiceNo: trimmedNo,
        taskId: taskId || null,
        clientName,
        date: new Date(date),
        discountAmount,
        jamaAmount,
        subTotal,
        total,
        balance,
        items
      }
    });

    res.status(201).json({ invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Get active invoices for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userFilter = getUserFilter(req);
    const invoices = await prisma.invoice.findMany({
      where: {
        ...userFilter,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: { documentType: true }
        }
      }
    });
    res.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Update an invoice
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      invoiceNo,
      taskId,
      clientName,
      date,
      discountAmount,
      jamaAmount,
      subTotal,
      total,
      balance,
      items
    } = req.body;

    const userFilter = getUserFilter(req);
    // Ensure the invoice belongs to the user or admin
    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, ...userFilter, isDeleted: false }
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        invoiceNo: invoiceNo?.toString().trim(),
        taskId: taskId || null,
        clientName,
        date: new Date(date),
        discountAmount,
        jamaAmount,
        subTotal,
        total,
        balance,
        items
      }
    });

    res.json({ invoice: updatedInvoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Soft delete an invoice
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userFilter = getUserFilter(req);

    const existing = await prisma.invoice.findFirst({
      where: { id, ...userFilter, isDeleted: false }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await prisma.invoice.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    res.json({ success: true, message: 'Invoice moved to Recycle Bin' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

export default router;
