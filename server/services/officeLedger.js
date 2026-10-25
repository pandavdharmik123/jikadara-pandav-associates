import prisma from '../lib/prisma.js';
import { OfficeLedgerValidationError } from '../lib/officeLedgerValidation.js';

const entrySelect = {
  id: true,
  entryType: true,
  entryDate: true,
  expenseType: true,
  details: true,
  amount: true,
  createdAt: true,
};

const splitUserSelect = {
  id: true,
  name: true,
  createdAt: true,
};

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function serializeEntry(entry) {
  return {
    ...entry,
    amount: roundCurrency(entry.amount),
  };
}

function buildWhere({ userId, fyStart, fyEnd, startDate, endDate, entryType, search }) {
  const where = {
    userId,
    isDeleted: false,
    entryDate: {
      gte: startDate || fyStart,
      lte: endDate || fyEnd,
    },
  };

  if (entryType) {
    where.entryType = entryType;
  }

  if (search) {
    where.details = { contains: search, mode: 'insensitive' };
  }

  return where;
}

function totalsFromGroups(groups) {
  const totals = {
    INCOME: { totalAmount: 0, recordCount: 0 },
    EXPENSE: { totalAmount: 0, recordCount: 0 },
  };

  for (const group of groups) {
    totals[group.entryType] = {
      totalAmount: roundCurrency(group._sum.amount),
      recordCount: group._count._all,
    };
  }

  return totals;
}

/**
 * Split an amount in paise so the shares always add back to the exact total.
 * The first users receive the remaining paise.
 */
function allocateSplit(total, count) {
  if (count <= 0) return [];

  const totalPaise = Math.round(Number(total || 0) * 100);
  if (totalPaise <= 0) return Array.from({ length: count }, () => 0);

  const base = Math.floor(totalPaise / count);
  let remainder = totalPaise % count;

  return Array.from({ length: count }, () => {
    const paise = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return paise / 100;
  });
}

export async function listOfficeLedgerEntries({
  userId,
  fyStart,
  fyEnd,
  startDate,
  endDate,
  entryType,
  search,
}) {
  const filteredWhere = buildWhere({
    userId,
    fyStart,
    fyEnd,
    startDate,
    endDate,
    entryType,
    search,
  });

  const rangeStart = startDate || fyStart;
  const rangeEnd = endDate || fyEnd;

  const periodWhere = {
    userId,
    isDeleted: false,
    entryDate: { gte: rangeStart, lte: rangeEnd },
  };

  // Balances are carried forward from every earlier entry, including earlier
  // financial years. Search and entry-type filters only affect the table.
  const openingWhere = {
    userId,
    isDeleted: false,
    entryDate: { lt: rangeStart },
  };

  const [entries, filteredGroups, periodGroups, openingGroups, splitUsers] =
    await prisma.$transaction([
      prisma.officeLedgerEntry.findMany({
        where: filteredWhere,
        select: entrySelect,
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.officeLedgerEntry.groupBy({
        by: ['entryType'],
        where: filteredWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.officeLedgerEntry.groupBy({
        by: ['entryType'],
        where: periodWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.officeLedgerEntry.groupBy({
        by: ['entryType'],
        where: openingWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.officeSplitUser.findMany({
        where: { userId },
        select: splitUserSelect,
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
      }),
    ]);

  const filteredTotals = totalsFromGroups(filteredGroups);
  const periodTotals = totalsFromGroups(periodGroups);
  const openingTotals = totalsFromGroups(openingGroups);

  const openingBalance = roundCurrency(
    openingTotals.INCOME.totalAmount - openingTotals.EXPENSE.totalAmount
  );
  const periodNet = roundCurrency(
    periodTotals.INCOME.totalAmount - periodTotals.EXPENSE.totalAmount
  );
  const closingBalance = roundCurrency(openingBalance + periodNet);
  const shortfall = Math.max(
    0,
    roundCurrency(periodTotals.EXPENSE.totalAmount - periodTotals.INCOME.totalAmount)
  );
  const splitAmounts = allocateSplit(shortfall, splitUsers.length);

  return {
    entries: entries.map(serializeEntry),
    summary: {
      incomeTotal: filteredTotals.INCOME.totalAmount,
      expenseTotal: filteredTotals.EXPENSE.totalAmount,
      netAmount: roundCurrency(
        filteredTotals.INCOME.totalAmount - filteredTotals.EXPENSE.totalAmount
      ),
      incomeCount: filteredTotals.INCOME.recordCount,
      expenseCount: filteredTotals.EXPENSE.recordCount,
      recordCount:
        filteredTotals.INCOME.recordCount + filteredTotals.EXPENSE.recordCount,
    },
    balance: {
      openingBalance,
      periodIncome: periodTotals.INCOME.totalAmount,
      periodExpense: periodTotals.EXPENSE.totalAmount,
      periodNet,
      periodIncomeCount: periodTotals.INCOME.recordCount,
      periodExpenseCount: periodTotals.EXPENSE.recordCount,
      closingBalance,
      shortfall,
    },
    splitUsers: splitUsers.map((user, index) => ({
      ...user,
      splitAmount: splitAmounts[index] || 0,
    })),
  };
}

export async function getOfficeLedgerEntry({ userId, id, fyStart, fyEnd }) {
  const entry = await prisma.officeLedgerEntry.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
      entryDate: { gte: fyStart, lte: fyEnd },
    },
    select: entrySelect,
  });

  return entry ? serializeEntry(entry) : null;
}

export async function createOfficeLedgerEntry({ userId, data }) {
  const entry = await prisma.officeLedgerEntry.create({
    data: {
      userId,
      ...data,
    },
    select: entrySelect,
  });

  return serializeEntry(entry);
}

export async function updateOfficeLedgerEntry({ userId, id, fyStart, fyEnd, data }) {
  const result = await prisma.officeLedgerEntry.updateMany({
    where: {
      id,
      userId,
      isDeleted: false,
      entryDate: { gte: fyStart, lte: fyEnd },
    },
    data,
  });

  if (result.count === 0) return null;

  return getOfficeLedgerEntry({ userId, id, fyStart, fyEnd });
}

export async function deleteOfficeLedgerEntry({ userId, id, fyStart, fyEnd }) {
  const result = await prisma.officeLedgerEntry.updateMany({
    where: {
      id,
      userId,
      isDeleted: false,
      entryDate: { gte: fyStart, lte: fyEnd },
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return result.count > 0;
}

export async function listOfficeSplitUsers({ userId }) {
  return prisma.officeSplitUser.findMany({
    where: { userId },
    select: splitUserSelect,
    orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
  });
}

export async function createOfficeSplitUser({ userId, name }) {
  const existing = await prisma.officeSplitUser.findFirst({
    where: {
      userId,
      name: { equals: name, mode: 'insensitive' },
    },
    select: { id: true },
  });

  if (existing) {
    throw new OfficeLedgerValidationError(
      'A split user with this name already exists'
    );
  }

  return prisma.officeSplitUser.create({
    data: { userId, name },
    select: splitUserSelect,
  });
}

export async function deleteOfficeSplitUser({ userId, id }) {
  const result = await prisma.officeSplitUser.deleteMany({
    where: { id, userId },
  });

  return result.count > 0;
}
