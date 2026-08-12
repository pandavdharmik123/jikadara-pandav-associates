import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

/**
 * Helper to get user filter for items belonging to users
 */
const getUserFilter = (req) => {
  return req.user.role === 'ADMIN' ? {} : { userId: req.user.id };
};

/**
 * GET /api/recycle-bin
 * Fetch all soft-deleted items across all entities
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userFilter = getUserFilter(req);

    const [
      clients,
      tasks,
      transactions,
      generalExpenses,
      upads,
      invoices,
      documentTypes,
    ] = await Promise.all([
      prisma.client.findMany({
        where: { isDeleted: true, ...userFilter },
        include: {
          _count: { select: { tasks: true } },
          user: { select: { name: true } },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.task.findMany({
        where: { isDeleted: true, ...userFilter },
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { transactions: true } },
          user: { select: { name: true } },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.taskTransaction.findMany({
        where: { isDeleted: true, ...userFilter },
        include: {
          task: { select: { id: true, documentType: true } },
          client: { select: { id: true, name: true } },
          user: { select: { name: true } },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.generalExpense.findMany({
        where: { isDeleted: true, ...userFilter },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.upad.findMany({
        where: { isDeleted: true, ...userFilter },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { isDeleted: true, ...userFilter },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.documentType.findMany({
        where: { isDeleted: true },
        orderBy: { deletedAt: 'desc' },
      }),
    ]);

    const counts = {
      clients: clients.length,
      tasks: tasks.length,
      transactions: transactions.length,
      generalExpenses: generalExpenses.length,
      upads: upads.length,
      invoices: invoices.length,
      documentTypes: documentTypes.length,
      total:
        clients.length +
        tasks.length +
        transactions.length +
        generalExpenses.length +
        upads.length +
        invoices.length +
        documentTypes.length,
    };

    res.json({
      counts,
      data: {
        clients,
        tasks,
        transactions,
        generalExpenses,
        upads,
        invoices,
        documentTypes,
      },
    });
  } catch (err) {
    console.error('Fetch recycle bin error:', err);
    res.status(500).json({ error: 'Failed to fetch recycle bin items' });
  }
});

/**
 * POST /api/recycle-bin/restore
 * Restore an item from recycle bin (with cascading restore where applicable)
 */
router.post('/restore', requireAuth, async (req, res) => {
  try {
    const { type, id } = req.body;

    if (!type || !id) {
      return res.status(400).json({ error: 'type and id are required' });
    }

    const userFilter = getUserFilter(req);

    switch (type) {
      case 'CLIENT': {
        const existing = await prisma.client.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Deleted client not found' });
        }

        await prisma.$transaction([
          // Restore client
          prisma.client.update({
            where: { id },
            data: { isDeleted: false, deletedAt: null },
          }),
          // Restore tasks for this client
          prisma.task.updateMany({
            where: { clientId: id },
            data: { isDeleted: false, deletedAt: null },
          }),
          // Restore transactions
          prisma.taskTransaction.updateMany({
            where: {
              OR: [{ clientId: id }, { task: { clientId: id } }],
            },
            data: { isDeleted: false, deletedAt: null },
          }),
          // Restore invoices
          prisma.invoice.updateMany({
            where: { task: { clientId: id } },
            data: { isDeleted: false, deletedAt: null },
          }),
        ]);

        return res.json({ message: 'Client and all related records restored successfully' });
      }

      case 'TASK': {
        const existing = await prisma.task.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Deleted task not found' });
        }

        const transactionOps = [
          // Restore task
          prisma.task.update({
            where: { id },
            data: { isDeleted: false, deletedAt: null },
          }),
          // Restore task transactions
          prisma.taskTransaction.updateMany({
            where: { taskId: id },
            data: { isDeleted: false, deletedAt: null },
          }),
          // Restore task invoices
          prisma.invoice.updateMany({
            where: { taskId: id },
            data: { isDeleted: false, deletedAt: null },
          }),
        ];

        // If parent client was deleted, also restore the client
        if (existing.clientId) {
          const parentClient = await prisma.client.findUnique({
            where: { id: existing.clientId },
          });
          if (parentClient && parentClient.isDeleted) {
            transactionOps.push(
              prisma.client.update({
                where: { id: existing.clientId },
                data: { isDeleted: false, deletedAt: null },
              })
            );
          }
        }

        await prisma.$transaction(transactionOps);

        return res.json({ message: 'Task and related records restored successfully' });
      }

      case 'TRANSACTION': {
        const existing = await prisma.taskTransaction.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Deleted transaction not found' });
        }

        await prisma.taskTransaction.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null },
        });

        // If part of a task, ensure task is active and recalculate financial totals
        if (existing.taskId) {
          const parentTask = await prisma.task.findUnique({
            where: { id: existing.taskId },
          });
          if (parentTask && parentTask.isDeleted) {
            await prisma.task.update({
              where: { id: existing.taskId },
              data: { isDeleted: false, deletedAt: null },
            });
          }

          const aggregations = await prisma.taskTransaction.groupBy({
            by: ['type'],
            where: { taskId: existing.taskId, isDeleted: false },
            _sum: { amount: true },
          });

          let totalIncome = 0;
          let totalExpense = 0;
          aggregations.forEach((agg) => {
            if (agg.type === 'INCOME') totalIncome = Number(agg._sum.amount) || 0;
            if (agg.type === 'EXPENSE') totalExpense = Number(agg._sum.amount) || 0;
          });

          await prisma.task.update({
            where: { id: existing.taskId },
            data: {
              totalIncome,
              totalExpense,
              netAmount: totalIncome - totalExpense,
            },
          });
        }

        return res.json({ message: 'Transaction restored successfully' });
      }

      case 'GENERAL_EXPENSE': {
        const existing = await prisma.generalExpense.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Deleted general expense not found' });
        }

        await prisma.generalExpense.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null },
        });

        return res.json({ message: 'General expense restored successfully' });
      }

      case 'UPAD': {
        const existing = await prisma.upad.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Deleted Upad not found' });
        }

        await prisma.upad.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null },
        });

        return res.json({ message: 'Upad entry restored successfully' });
      }

      case 'INVOICE': {
        const existing = await prisma.invoice.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Deleted invoice not found' });
        }

        await prisma.invoice.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null },
        });

        return res.json({ message: 'Invoice restored successfully' });
      }

      case 'DOCUMENT_TYPE': {
        const existing = await prisma.documentType.findFirst({
          where: { id, isDeleted: true },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Deleted document type not found' });
        }

        await prisma.documentType.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null },
        });

        return res.json({ message: 'Document type restored successfully' });
      }

      default:
        return res.status(400).json({ error: `Invalid item type: ${type}` });
    }
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: err.message || 'Failed to restore item' });
  }
});

/**
 * DELETE /api/recycle-bin/permanent
 * Permanently delete a single item from the database
 */
router.delete('/permanent', requireAuth, async (req, res) => {
  try {
    const { type, id } = req.body;

    if (!type || !id) {
      return res.status(400).json({ error: 'type and id are required' });
    }

    const userFilter = getUserFilter(req);

    switch (type) {
      case 'CLIENT': {
        const existing = await prisma.client.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Item not found in Recycle Bin' });
        }
        await prisma.client.delete({ where: { id } });
        return res.json({ message: 'Client permanently deleted' });
      }

      case 'TASK': {
        const existing = await prisma.task.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Item not found in Recycle Bin' });
        }
        await prisma.task.delete({ where: { id } });
        return res.json({ message: 'Task permanently deleted' });
      }

      case 'TRANSACTION': {
        const existing = await prisma.taskTransaction.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Item not found in Recycle Bin' });
        }
        const taskId = existing.taskId;
        await prisma.taskTransaction.delete({ where: { id } });

        if (taskId) {
          const aggregations = await prisma.taskTransaction.groupBy({
            by: ['type'],
            where: { taskId, isDeleted: false },
            _sum: { amount: true },
          });

          let totalIncome = 0;
          let totalExpense = 0;
          aggregations.forEach((agg) => {
            if (agg.type === 'INCOME') totalIncome = Number(agg._sum.amount) || 0;
            if (agg.type === 'EXPENSE') totalExpense = Number(agg._sum.amount) || 0;
          });

          await prisma.task.update({
            where: { id: taskId },
            data: {
              totalIncome,
              totalExpense,
              netAmount: totalIncome - totalExpense,
            },
          });
        }
        return res.json({ message: 'Transaction permanently deleted' });
      }

      case 'GENERAL_EXPENSE': {
        const existing = await prisma.generalExpense.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Item not found in Recycle Bin' });
        }
        await prisma.generalExpense.delete({ where: { id } });
        return res.json({ message: 'General expense permanently deleted' });
      }

      case 'UPAD': {
        const existing = await prisma.upad.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Item not found in Recycle Bin' });
        }
        await prisma.upad.delete({ where: { id } });
        return res.json({ message: 'Upad entry permanently deleted' });
      }

      case 'INVOICE': {
        const existing = await prisma.invoice.findFirst({
          where: { id, isDeleted: true, ...userFilter },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Item not found in Recycle Bin' });
        }
        await prisma.invoice.delete({ where: { id } });
        return res.json({ message: 'Invoice permanently deleted' });
      }

      case 'DOCUMENT_TYPE': {
        const existing = await prisma.documentType.findFirst({
          where: { id, isDeleted: true },
        });
        if (!existing) {
          return res.status(404).json({ error: 'Item not found in Recycle Bin' });
        }
        await prisma.documentType.delete({ where: { id } });
        return res.json({ message: 'Document type permanently deleted' });
      }

      default:
        return res.status(400).json({ error: `Invalid item type: ${type}` });
    }
  } catch (err) {
    console.error('Permanent delete error:', err);
    res.status(500).json({ error: err.message || 'Failed to permanently delete item' });
  }
});

/**
 * DELETE /api/recycle-bin/empty
 * Empty the entire recycle bin (or for a specific category)
 */
router.delete('/empty', requireAuth, async (req, res) => {
  try {
    const { category } = req.body || {};
    const userFilter = getUserFilter(req);

    if (!category || category === 'ALL') {
      await prisma.$transaction([
        prisma.taskTransaction.deleteMany({ where: { isDeleted: true, ...userFilter } }),
        prisma.invoice.deleteMany({ where: { isDeleted: true, ...userFilter } }),
        prisma.task.deleteMany({ where: { isDeleted: true, ...userFilter } }),
        prisma.client.deleteMany({ where: { isDeleted: true, ...userFilter } }),
        prisma.generalExpense.deleteMany({ where: { isDeleted: true, ...userFilter } }),
        prisma.upad.deleteMany({ where: { isDeleted: true, ...userFilter } }),
        ...(req.user.role === 'ADMIN'
          ? [prisma.documentType.deleteMany({ where: { isDeleted: true } })]
          : []),
      ]);
      return res.json({ message: 'Recycle bin emptied successfully' });
    }

    switch (category) {
      case 'CLIENT':
        await prisma.client.deleteMany({ where: { isDeleted: true, ...userFilter } });
        break;
      case 'TASK':
        await prisma.task.deleteMany({ where: { isDeleted: true, ...userFilter } });
        break;
      case 'TRANSACTION':
        await prisma.taskTransaction.deleteMany({ where: { isDeleted: true, ...userFilter } });
        break;
      case 'GENERAL_EXPENSE':
        await prisma.generalExpense.deleteMany({ where: { isDeleted: true, ...userFilter } });
        break;
      case 'UPAD':
        await prisma.upad.deleteMany({ where: { isDeleted: true, ...userFilter } });
        break;
      case 'INVOICE':
        await prisma.invoice.deleteMany({ where: { isDeleted: true, ...userFilter } });
        break;
      case 'DOCUMENT_TYPE':
        await prisma.documentType.deleteMany({ where: { isDeleted: true } });
        break;
      default:
        return res.status(400).json({ error: `Invalid category: ${category}` });
    }

    res.json({ message: `${category} items deleted permanently` });
  } catch (err) {
    console.error('Empty recycle bin error:', err);
    res.status(500).json({ error: err.message || 'Failed to empty recycle bin' });
  }
});

export default router;
