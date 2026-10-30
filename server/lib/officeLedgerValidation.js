import { startOfDayIST, endOfDayIST, startOfMonthIST, endOfMonthIST } from './dateUtils.js';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 9999999999.99;
const MAX_EXPENSE_TYPE_LENGTH = 120;
const ENTRY_TYPES = new Set(['INCOME', 'EXPENSE']);

export class OfficeLedgerValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OfficeLedgerValidationError';
    this.status = 400;
  }
}

function fail(message) {
  throw new OfficeLedgerValidationError(message);
}

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDateOnly(value, label = 'Date') {
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value.trim())) {
    fail(`${label} must be a valid date in YYYY-MM-DD format`);
  }

  const datePart = value.trim();
  const [year, month, day] = datePart.split('-').map(Number);

  if (!isValidDateParts(year, month, day)) {
    fail(`${label} must be a valid calendar date`);
  }

  return datePart;
}

export function parseFinancialYearRange(fyStartDate, fyEndDate) {
  if (!fyStartDate || !fyEndDate) {
    fail('A financial year is required. Select a financial year first.');
  }

  const startDate = parseDateOnly(fyStartDate, 'Financial year start date');
  const endDate = parseDateOnly(fyEndDate, 'Financial year end date');

  if (startDate > endDate) {
    fail('Financial year start date cannot be after its end date');
  }

  return {
    startDate,
    endDate,
    start: startOfDayIST(startDate),
    end: endOfDayIST(endDate),
  };
}

function parseInteger(value, { fallback, min, max, label }) {
  if (value === undefined || value === null || value === '') return fallback;

  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    fail(`${label} is invalid`);
  }
  return number;
}

function parseOptionalText(value, label, maxLength) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') fail(`${label} must be text`);

  const text = value.trim();
  if (text.length > maxLength) {
    fail(`${label} cannot be longer than ${maxLength} characters`);
  }
  return text;
}

function parseEntryType(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) fail('Entry type is required');
    return undefined;
  }

  const entryType = String(value).trim().toUpperCase();
  if (!ENTRY_TYPES.has(entryType)) {
    fail('Entry type must be INCOME or EXPENSE');
  }
  return entryType;
}

export function parseListFilters(query = {}) {
  const fy = parseFinancialYearRange(query.fyStartDate, query.fyEndDate);

  const hasStartDate = query.startDate !== undefined && query.startDate !== '';
  const hasEndDate = query.endDate !== undefined && query.endDate !== '';
  const hasMonth = query.month !== undefined && query.month !== '';
  const hasYear = query.year !== undefined && query.year !== '';

  if ((hasStartDate || hasEndDate) && (hasMonth || hasYear)) {
    fail('Use either a custom date range or a month filter, not both');
  }

  let rangeStart = null;
  let rangeEnd = null;

  if (hasStartDate || hasEndDate) {
    if (!hasStartDate || !hasEndDate) {
      fail('Both start date and end date are required');
    }

    const startDate = parseDateOnly(query.startDate, 'Start date');
    const endDate = parseDateOnly(query.endDate, 'End date');

    if (startDate > endDate) {
      fail('Start date cannot be after end date');
    }

    if (startDate < fy.startDate || endDate > fy.endDate) {
      fail('Date range must be within the selected financial year');
    }

    rangeStart = startOfDayIST(startDate);
    rangeEnd = endOfDayIST(endDate);
  }

  if (hasMonth || hasYear) {
    if (!hasMonth || !hasYear) {
      fail('Both month and year are required');
    }

    const month = parseInteger(query.month, { fallback: null, min: 1, max: 12, label: 'Month' });
    const year = parseInteger(query.year, { fallback: null, min: 1900, max: 2200, label: 'Year' });

    const monthText = String(month).padStart(2, '0');
    const monthStartDate = `${year}-${monthText}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthEndDate = `${year}-${monthText}-${String(lastDay).padStart(2, '0')}`;

    // A financial year can start or end in the middle of a month (for example,
    // 22 Oct 2025 → 08 Nov 2026). In that case the first/last month is still a
    // valid selection, but only the part that overlaps the financial year
    // should be queried.
    if (monthEndDate < fy.startDate || monthStartDate > fy.endDate) {
      fail('Month must be within the selected financial year');
    }

    const monthStart = startOfMonthIST(year, month);
    const monthEnd = endOfMonthIST(year, month);

    rangeStart = monthStart < fy.start ? fy.start : monthStart;
    rangeEnd = monthEnd > fy.end ? fy.end : monthEnd;
  }

  const entryType = parseEntryType(query.entryType);
  const search = parseOptionalText(query.search, 'Search', 200);

  return {
    fyStart: fy.start,
    fyEnd: fy.end,
    startDate: rangeStart,
    endDate: rangeEnd,
    entryType,
    search: search || undefined,
  };
}

export function parseSplitUserName(value) {
  const name = parseOptionalText(value, 'Split user name', 80);
  if (!name) fail('Split user name is required');
  return name;
}

export function parseEntryPayload(body = {}, { partial = false, fy } = {}) {
  const data = {};
  const has = (key) => body[key] !== undefined && body[key] !== null;

  if (!partial || has('entryType')) {
    data.entryType = parseEntryType(body.entryType, { required: true });
  }

  const expenseTypeProvided = has('expenseType');

  if (!partial || expenseTypeProvided || data.entryType) {
    if (data.entryType === 'INCOME') {
      // Income entries never carry an expense type.
      data.expenseType = null;
    } else {
      const expenseType = parseOptionalText(
        body.expenseType,
        'Expense type',
        MAX_EXPENSE_TYPE_LENGTH
      );
      if (!expenseType) fail('Expense type is required');
      data.expenseType = expenseType;
    }
  }

  if (!partial || has('details')) {
    const details = parseOptionalText(body.details, 'Details', 500);
    if (!details) fail('Details are required');
    data.details = details;
  }

  if (!partial || has('amount')) {
    if (body.amount === undefined || body.amount === null || body.amount === '') {
      fail('Amount is required');
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      fail('Amount must be greater than 0');
    }
    if (amount > MAX_AMOUNT) {
      fail('Amount is too large');
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount <= 0) {
      fail('Amount must be at least 0.01');
    }

    data.amount = roundedAmount;
  }

  if (!partial || has('entryDate')) {
    const entryDate = parseDateOnly(body.entryDate, 'Entry date');

    if (fy && (entryDate < fy.startDate || entryDate > fy.endDate)) {
      fail('Entry date must be within the selected financial year');
    }

    data.entryDate = startOfDayIST(entryDate);
  }

  if (partial && Object.keys(data).length === 0) {
    fail('No ledger fields were provided to update');
  }

  return data;
}
