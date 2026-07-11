import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

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

    const invoice = await prisma.invoice.create({
      data: {
        userId: req.user.id,
        invoiceNo,
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

// Get invoices for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user.id },
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

    // Ensure the invoice belongs to the user
    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        invoiceNo,
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

export default router;
