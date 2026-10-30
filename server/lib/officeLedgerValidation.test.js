import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OfficeLedgerValidationError,
  parseEntryPayload,
  parseFinancialYearRange,
  parseListFilters,
} from './officeLedgerValidation.js';

const FY_START = '2025-10-22';
const FY_END = '2026-11-08';
const FY_QUERY = { fyStartDate: FY_START, fyEndDate: FY_END };

function expectValidationError(fn, message) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof OfficeLedgerValidationError);
    if (message) assert.match(error.message, message);
    return true;
  });
}

test('financial year range is parsed as IST day boundaries', () => {
  const fy = parseFinancialYearRange(FY_START, FY_END);
  assert.equal(fy.start.toISOString(), '2025-10-21T18:30:00.000Z');
  assert.equal(fy.end.toISOString(), '2026-11-08T18:29:59.999Z');
});

test('a month fully inside the financial year is queried as a full month', () => {
  const filters = parseListFilters({ ...FY_QUERY, month: '11', year: '2025' });
  assert.equal(filters.startDate.toISOString(), '2025-10-31T18:30:00.000Z');
  assert.equal(filters.endDate.toISOString(), '2025-11-30T18:29:59.999Z');
});

test('the first partial month is clipped to the financial year start', () => {
  const filters = parseListFilters({ ...FY_QUERY, month: '10', year: '2025' });
  assert.equal(filters.startDate.toISOString(), '2025-10-21T18:30:00.000Z');
  assert.equal(filters.endDate.toISOString(), '2025-10-31T18:29:59.999Z');
});

test('the last partial month is clipped to the financial year end', () => {
  const filters = parseListFilters({ ...FY_QUERY, month: '11', year: '2026' });
  assert.equal(filters.startDate.toISOString(), '2026-10-31T18:30:00.000Z');
  assert.equal(filters.endDate.toISOString(), '2026-11-08T18:29:59.999Z');
});

test('months completely outside the financial year are rejected', () => {
  expectValidationError(
    () => parseListFilters({ ...FY_QUERY, month: '9', year: '2025' }),
    /Month must be within/
  );
  expectValidationError(
    () => parseListFilters({ ...FY_QUERY, month: '12', year: '2026' }),
    /Month must be within/
  );
});

test('month and year must be supplied together', () => {
  expectValidationError(
    () => parseListFilters({ ...FY_QUERY, month: '10' }),
    /Both month and year/
  );
  expectValidationError(
    () => parseListFilters({ ...FY_QUERY, year: '2025' }),
    /Both month and year/
  );
});

test('custom date ranges must stay inside the financial year', () => {
  const filters = parseListFilters({
    ...FY_QUERY,
    startDate: FY_START,
    endDate: '2025-10-31',
  });
  assert.equal(filters.startDate.toISOString(), '2025-10-21T18:30:00.000Z');
  assert.equal(filters.endDate.toISOString(), '2025-10-31T18:29:59.999Z');

  expectValidationError(
    () =>
      parseListFilters({
        ...FY_QUERY,
        startDate: '2025-10-21',
        endDate: '2025-10-31',
      }),
    /Date range must be within/
  );
});

test('entry dates use IST boundaries and reject dates outside the financial year', () => {
  const base = {
    entryType: 'INCOME',
    details: 'Client payment',
    amount: 1500,
  };

  const first = parseEntryPayload(
    { ...base, entryDate: FY_START },
    { fy: parseFinancialYearRange(FY_START, FY_END) }
  );
  assert.equal(first.entryDate.toISOString(), '2025-10-21T18:30:00.000Z');

  const last = parseEntryPayload(
    { ...base, entryDate: FY_END },
    { fy: parseFinancialYearRange(FY_START, FY_END) }
  );
  assert.equal(last.entryDate.toISOString(), '2026-11-07T18:30:00.000Z');

  const fy = parseFinancialYearRange(FY_START, FY_END);
  expectValidationError(
    () =>
      parseEntryPayload(
        { ...base, entryDate: '2025-10-21' },
        { fy }
      ),
    /Entry date must be within/
  );
  expectValidationError(
    () =>
      parseEntryPayload(
        { ...base, entryDate: '2026-11-09' },
        { fy }
      ),
    /Entry date must be within/
  );
});

test('income entries clear the expense type; expense entries require one', () => {
  const fy = parseFinancialYearRange(FY_START, FY_END);
  const common = {
    entryDate: '2025-11-01',
    details: 'Test entry',
    amount: 10,
  };

  const income = parseEntryPayload(
    { ...common, entryType: 'INCOME', expenseType: 'ઓફિસ ભાડું' },
    { fy }
  );
  assert.equal(income.expenseType, null);

  expectValidationError(
    () => parseEntryPayload({ ...common, entryType: 'EXPENSE' }, { fy }),
    /Expense type is required/
  );

  const expense = parseEntryPayload(
    { ...common, entryType: 'EXPENSE', expenseType: 'ઓફિસ ભાડું' },
    { fy }
  );
  assert.equal(expense.expenseType, 'ઓફિસ ભાડું');
});

test('amounts must be positive and are rounded to paise', () => {
  const fy = parseFinancialYearRange(FY_START, FY_END);
  const base = {
    entryType: 'INCOME',
    entryDate: '2025-11-01',
    details: 'Test entry',
  };

  expectValidationError(
    () => parseEntryPayload({ ...base, amount: 0 }, { fy }),
    /Amount must be greater than 0/
  );
  expectValidationError(
    () => parseEntryPayload({ ...base, amount: -5 }, { fy }),
    /Amount must be greater than 0/
  );

  const parsed = parseEntryPayload({ ...base, amount: 123.456 }, { fy });
  assert.equal(parsed.amount, 123.46);
});

test('details are required and length-limited', () => {
  const fy = parseFinancialYearRange(FY_START, FY_END);
  const base = {
    entryType: 'INCOME',
    entryDate: '2025-11-01',
    amount: 10,
  };

  expectValidationError(
    () => parseEntryPayload({ ...base, details: '   ' }, { fy }),
    /Details are required/
  );
  expectValidationError(
    () => parseEntryPayload({ ...base, details: 'x'.repeat(501) }, { fy }),
    /cannot be longer than 500/
  );
});
