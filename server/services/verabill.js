import prisma from '../lib/prisma.js';
import { VerabillValidationError } from '../lib/verabillValidation.js';
import { toISTDateString } from '../lib/dateUtils.js';

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function serializeFee(f) {
  return {
    id: f.id,
    amount: roundCurrency(f.amount),
    receivedBy: f.receivedBy,
    transactionDate: f.transactionDate ? toISTDateString(f.transactionDate) : null,
    description: f.description,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

function serializeExpense(e) {
  return {
    id: e.id,
    amount: roundCurrency(e.amount),
    expensePerson: e.expensePerson,
    expenseDate: e.expenseDate ? toISTDateString(e.expenseDate) : null,
    description: e.description,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function totalsOf(entry) {
  const fees = entry.fees || [];
  const expenses = entry.expenses || [];
  const totalFees = roundCurrency(fees.reduce((s, f) => s + Number(f.amount), 0));
  const totalExpenses = roundCurrency(expenses.reduce((s, e) => s + Number(e.amount), 0));
  const additionalIncome = entry.additionalIncome == null
    ? 0 : roundCurrency(entry.additionalIncome);
  const netBalance = roundCurrency(totalFees - totalExpenses + additionalIncome);
  return { totalFees, totalExpenses, additionalIncome, netBalance };
}

function serializeEntry(entry) {
  const t = totalsOf(entry);
  return {
    id: entry.id,
    clientName: entry.clientName,
    property: entry.property,
    workDescription: entry.workDescription,
    remarks: entry.remarks,
    startDate: entry.startDate ? toISTDateString(entry.startDate) : null,
    workDate: entry.startDate ? toISTDateString(entry.startDate) : null,
    incomeDescription: entry.incomeDescription,
    originalExcelData: entry.originalExcelData,
    isDeleted: entry.isDeleted,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    fees: (entry.fees || []).map(serializeFee),
    expenses: (entry.expenses || []).map(serializeExpense),
    ...t,
    additionalIncome: entry.additionalIncome == null ? null : roundCurrency(entry.additionalIncome),
  };
}

const entryInclude = {
  fees: { orderBy: { createdAt: 'asc' } },
  expenses: { orderBy: { createdAt: 'asc' } },
};

export async function getSummary({ userId }) {
  const entries = await prisma.verabillEntry.findMany({
    where: { userId, isDeleted: false },
    include: entryInclude,
  });
  let totalFees = 0, totalExpenses = 0, totalAdditionalIncome = 0;
  for (const e of entries) {
    const t = totalsOf(e);
    totalFees += t.totalFees;
    totalExpenses += t.totalExpenses;
    totalAdditionalIncome += t.additionalIncome;
  }
  totalFees = roundCurrency(totalFees);
  totalExpenses = roundCurrency(totalExpenses);
  totalAdditionalIncome = roundCurrency(totalAdditionalIncome);
  return {
    totalClients: entries.length,
    totalFeesReceived: totalFees,
    totalExpenses,
    totalAdditionalIncome,
    netBalance: roundCurrency(totalFees - totalExpenses + totalAdditionalIncome),
  };
}

export async function listEntries({ userId, search, clientName, property, workType, page, pageSize, sortBy, sortDir }) {
  const where = { userId, isDeleted: false };
  if (search) {
    where.OR = [
      { clientName: { contains: search, mode: 'insensitive' } },
      { property: { contains: search, mode: 'insensitive' } },
      { workDescription: { contains: search, mode: 'insensitive' } },
      { fees: { some: { receivedBy: { contains: search, mode: 'insensitive' } } } },
    ];
  }
  if (clientName) where.clientName = { contains: clientName, mode: 'insensitive' };
  if (property) where.property = { contains: property, mode: 'insensitive' };
  if (workType) where.workDescription = { contains: workType, mode: 'insensitive' };

  const validSortFields = ['createdAt', 'clientName', 'property', 'startDate', 'updatedAt'];
  const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const orderBy = { [actualSortBy]: sortDir };

  const [total, entries] = await prisma.$transaction([
    prisma.verabillEntry.count({ where }),
    prisma.verabillEntry.findMany({
      where,
      include: entryInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    entries: entries.map(serializeEntry),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getEntry({ userId, id }) {
  const entry = await prisma.verabillEntry.findFirst({
    where: { id, userId, isDeleted: false },
    include: entryInclude,
  });
  return entry ? serializeEntry(entry) : null;
}

export async function createEntry({ userId, data }) {
  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.verabillEntry.create({
      data: {
        userId,
        clientName: data.clientName,
        property: data.property,
        workDescription: data.workDescription,
        remarks: data.remarks || '',
        startDate: data.startDate !== undefined ? data.startDate : null,
        additionalIncome: data.additionalIncome,
        incomeDescription: data.incomeDescription || '',
        originalExcelData: data.originalExcelData || undefined,
      },
    });
    if (data.fees && data.fees.length) {
      await tx.verabillFee.createMany({
        data: data.fees.map((f) => ({
          entryId: created.id,
          amount: f.amount,
          receivedBy: f.receivedBy || '',
          transactionDate: f.transactionDate || null,
          description: f.description || '',
        })),
      });
    }
    if (data.expenses && data.expenses.length) {
      await tx.verabillExpense.createMany({
        data: data.expenses.map((e) => ({
          entryId: created.id,
          amount: e.amount,
          expensePerson: e.expensePerson || '',
          expenseDate: e.expenseDate || null,
          description: e.description || '',
        })),
      });
    }
    return tx.verabillEntry.findUnique({ where: { id: created.id }, include: entryInclude });
  });
  return serializeEntry(entry);
}

export async function updateEntry({ userId, id, data }) {
  const existing = await prisma.verabillEntry.findFirst({ where: { id, userId, isDeleted: false } });
  if (!existing) return null;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.verabillEntry.update({
      where: { id },
      data: {
        ...(data.clientName !== undefined ? { clientName: data.clientName } : {}),
        ...(data.property !== undefined ? { property: data.property } : {}),
        ...(data.workDescription !== undefined ? { workDescription: data.workDescription } : {}),
        ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
        ...(data.incomeDescription !== undefined ? { incomeDescription: data.incomeDescription } : {}),
        ...(data.additionalIncome !== undefined ? { additionalIncome: data.additionalIncome } : {}),
        ...(data.originalExcelData !== undefined ? { originalExcelData: data.originalExcelData } : {}),
      },
    });

    if (data.fees !== undefined) {
      await tx.verabillFee.deleteMany({ where: { entryId: id } });
      if (data.fees.length) {
        await tx.verabillFee.createMany({
          data: data.fees.map((f) => ({
            entryId: id,
            amount: f.amount,
            receivedBy: f.receivedBy || '',
            transactionDate: f.transactionDate || null,
            description: f.description || '',
          })),
        });
      }
    }
    if (data.expenses !== undefined) {
      await tx.verabillExpense.deleteMany({ where: { entryId: id } });
      if (data.expenses.length) {
        await tx.verabillExpense.createMany({
          data: data.expenses.map((e) => ({
            entryId: id,
            amount: e.amount,
            expensePerson: e.expensePerson || '',
            expenseDate: e.expenseDate || null,
            description: e.description || '',
          })),
        });
      }
    }

    return tx.verabillEntry.findUnique({ where: { id }, include: entryInclude });
  });
  return serializeEntry(updated);
}

export async function deleteEntry({ userId, id }) {
  const existing = await prisma.verabillEntry.findFirst({ where: { id, userId, isDeleted: false } });
  if (!existing) return false;
  await prisma.$transaction(async (tx) => {
    await tx.verabillEntry.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    await tx.verabillFee.updateMany({ where: { entryId: id }, data: {} }).catch(() => {});
  });
  return true;
}

export async function importEntries({ userId, records }) {
  const results = { total: records.length, imported: 0, skipped: 0, failed: 0, needsReview: 0, errors: [] };
  for (const r of records) {
    try {
      // idempotency: skip if same clientName+property exists
      const existing = await prisma.verabillEntry.findFirst({
        where: { userId, clientName: r.clientName, property: r.property || '', isDeleted: false },
      });
      if (existing) {
        results.skipped += 1;
        continue;
      }
      const fees = (r.fees || []).map((f) => ({
        amount: f.amount,
        receivedBy: f.receivedBy || '',
        transactionDate: null,
        description: f.description || '',
      }));
      const expenses = (r.expenses || []).map((e) => ({
        amount: e.amount,
        expensePerson: e.expensePerson || '',
        expenseDate: null,
        description: e.description || '',
      }));
      await prisma.verabillEntry.create({
        data: {
          userId,
          clientName: r.clientName,
          property: r.property || '',
          workDescription: r.workDescription || '',
          remarks: r.remarks || '',
          additionalIncome: r.additionalIncome ?? null,
          incomeDescription: r.incomeDescription || '',
          originalExcelData: r.originalExcelData || null,
          fees: { create: fees },
          expenses: { create: expenses },
        },
      });
      results.imported += 1;
      if (r.needsReview) results.needsReview += 1;
    } catch (err) {
      results.failed += 1;
      results.errors.push({ clientName: r.clientName, reason: err.message });
    }
  }
  return results;
}
