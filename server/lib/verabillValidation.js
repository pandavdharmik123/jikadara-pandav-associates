import { startOfDayIST } from './dateUtils.js';

const MAX_AMOUNT = 9999999999.99;
const MAX_TEXT = 500;
const MAX_SHORT = 200;

export class VerabillValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VerabillValidationError';
    this.status = 400;
  }
}

function fail(message) {
  throw new VerabillValidationError(message);
}

function parseText(value, label, maxLength, required = false) {
  if (value === undefined || value === null) {
    if (required) fail(`${label} is required`);
    return '';
  }
  if (typeof value !== 'string') fail(`${label} must be text`);
  const text = value.trim();
  if (text.length > maxLength) fail(`${label} cannot be longer than ${maxLength} characters`);
  if (required && !text) fail(`${label} is required`);
  return text;
}

function parseOptionalDate(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    fail(`${label} must be a valid date in YYYY-MM-DD format`);
  }
  const datePart = value.trim();
  const [y, m, d] = datePart.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    fail(`${label} must be a valid calendar date`);
  }
  return startOfDayIST(datePart);
}

function parseAmount(value, label, required = true) {
  if (value === undefined || value === null || value === '') {
    if (required) fail(`${label} is required`);
    return null;
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    fail(`${label} must be a non-negative number`);
  }
  if (amount === 0 && required) {
    // allow zero? requirement: amounts positive for transactions; entry additional income can be 0/null
  }
  if (amount > MAX_AMOUNT) fail(`${label} is too large`);
  const rounded = Math.round(amount * 100) / 100;
  return rounded;
}

function parseFee(item, index) {
  if (!item || typeof item !== 'object') fail(`Fee #${index + 1} is invalid`);
  const amount = parseAmount(item.amount, `Fee #${index + 1} amount`, true);
  if (amount === null || amount <= 0) fail(`Fee #${index + 1} amount must be greater than 0`);
  return {
    amount,
    receivedBy: parseText(item.receivedBy, `Fee #${index + 1} received by`, 120),
    transactionDate: parseOptionalDate(item.transactionDate, `Fee #${index + 1} date`),
    description: parseText(item.description, `Fee #${index + 1} description`, MAX_TEXT),
  };
}

function parseExpense(item, index) {
  if (!item || typeof item !== 'object') fail(`Expense #${index + 1} is invalid`);
  const amount = parseAmount(item.amount, `Expense #${index + 1} amount`, true);
  if (amount === null || amount <= 0) fail(`Expense #${index + 1} amount must be greater than 0`);
  return {
    amount,
    expensePerson: parseText(item.expensePerson, `Expense #${index + 1} person`, 120),
    expenseDate: parseOptionalDate(item.expenseDate, `Expense #${index + 1} date`),
    description: parseText(item.description, `Expense #${index + 1} description`, MAX_TEXT),
  };
}

export function parseEntryPayload(body = {}, { partial = false } = {}) {
  const data = {};
  const has = (key) => body[key] !== undefined && body[key] !== null;

  if (!partial || has('clientName')) {
    data.clientName = parseText(body.clientName, 'Client name', MAX_SHORT, true);
  }
  if (!partial || has('property')) {
    data.property = parseText(body.property, 'Property', MAX_SHORT, true);
  }
  if (!partial || has('workDescription')) {
    data.workDescription = parseText(body.workDescription, 'Work description', MAX_TEXT, true);
  }
  if (!partial || has('remarks')) {
    data.remarks = parseText(body.remarks, 'Remarks', MAX_TEXT);
  }
  if (!partial || body.startDate !== undefined || body.workDate !== undefined) {
    data.startDate = parseOptionalDate(body.startDate ?? body.workDate, 'Start date');
  }
  if (!partial || has('incomeDescription')) {
    data.incomeDescription = parseText(body.incomeDescription, 'Income description', MAX_TEXT);
  }
  if (!partial || has('additionalIncome')) {
    if (body.additionalIncome === undefined || body.additionalIncome === null || body.additionalIncome === '') {
      data.additionalIncome = null;
    } else {
      const v = parseAmount(body.additionalIncome, 'Additional income', false);
      data.additionalIncome = v === null ? null : v;
    }
  }

  if (!partial || has('fees')) {
    if (!Array.isArray(body.fees)) {
      if (body.fees === undefined || body.fees === null) {
        data.fees = [];
      } else {
        fail('Fees must be an array');
      }
    } else {
      data.fees = body.fees.map(parseFee);
    }
  }

  if (!partial || has('expenses')) {
    if (!Array.isArray(body.expenses)) {
      if (body.expenses === undefined || body.expenses === null) {
        data.expenses = [];
      } else {
        fail('Expenses must be an array');
      }
    } else {
      data.expenses = body.expenses.map(parseExpense);
    }
  }

  if (partial && Object.keys(data).length === 0) {
    fail('No fields were provided to update');
  }

  return data;
}

export function parseListFilters(query = {}) {
  const search = parseText(query.search, 'Search', MAX_SHORT);
  const clientName = parseText(query.clientName, 'Client name', MAX_SHORT);
  const property = parseText(query.property, 'Property', MAX_SHORT);
  const workType = parseText(query.workType, 'Work type', MAX_SHORT);

  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10) || 20));

  const sortBy = ['clientName', 'property', 'createdAt', 'updatedAt'].includes(query.sortBy)
    ? query.sortBy : 'createdAt';
  const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';

  return { search, clientName, property, workType, page, pageSize, sortBy, sortDir };
}

export function parseImportPayload(body = {}) {
  if (!Array.isArray(body.records)) fail('records must be an array');
  return body.records;
}
