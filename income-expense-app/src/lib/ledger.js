import { isDateInMonth, isDateInRange, toISTDateString } from './date';

export const ENTRY_TYPE = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
};

export const EXPENSE_TYPE_OPTIONS = [
  'પ્રિન્ટર રિફિલિંગ',
  'લાઈટ બિલ',
  'બિલ્ડીંગ મેન્ટેનન્સ',
  'ઓફિસ ભાડું',
  'કામવાળા માસી',
  'સ્ટેશનરી',
  'અન્ય',
];

export function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function summarizeEntries(entries = []) {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const entry of entries) {
    const amount = Number(entry.amount) || 0;
    if (entry.entryType === ENTRY_TYPE.INCOME) {
      income += amount;
      incomeCount += 1;
    } else if (entry.entryType === ENTRY_TYPE.EXPENSE) {
      expense += amount;
      expenseCount += 1;
    }
  }

  return {
    income: roundCurrency(income),
    expense: roundCurrency(expense),
    net: roundCurrency(income - expense),
    incomeCount,
    expenseCount,
    count: incomeCount + expenseCount,
  };
}

export function sortEntriesNewestFirst(entries = []) {
  return [...entries].sort((a, b) => {
    const dateA = toISTDateString(a.entryDate);
    const dateB = toISTDateString(b.entryDate);
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

export function filterEntriesByRange(entries = [], range) {
  if (!range) return entries;
  return entries.filter((entry) => isDateInRange(entry.entryDate, range));
}

export function filterEntriesByType(entries = [], entryType) {
  if (!entryType || entryType === 'ALL') return entries;
  return entries.filter((entry) => entry.entryType === entryType);
}

export function filterEntriesBySearch(entries = [], search) {
  const term = String(search || '').trim().toLowerCase();
  if (!term) return entries;

  return entries.filter((entry) => {
    const haystack = `${entry.details || ''} ${entry.expenseType || ''}`.toLowerCase();
    return haystack.includes(term);
  });
}

export function buildDashboard(entries = [], fyRange) {
  const todaySummary = summarizeEntries(entries.filter((entry) => isDateInRange(entry.entryDate, rangeForToday())));
  const monthSummary = summarizeEntries(entries.filter((entry) => isDateInMonth(entry.entryDate)));
  const fySummary = summarizeEntries(fyRange ? filterEntriesByRange(entries, fyRange) : entries);

  return {
    today: todaySummary,
    month: monthSummary,
    fy: fySummary,
    recent: sortEntriesNewestFirst(entries).slice(0, 5),
  };
}

function rangeForToday() {
  const today = toISTDateString(new Date());
  return { startDate: today, endDate: today };
}
