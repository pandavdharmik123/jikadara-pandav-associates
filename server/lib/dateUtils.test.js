import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startOfDayIST,
  endOfDayIST,
  startOfMonthIST,
  endOfMonthIST,
  toISTDateParts,
  toISTDateString,
} from './dateUtils.js';

test('startOfDayIST correctly resolves ISO UTC timestamps to IST start of day', () => {
  // 13 August 2026 IST starts at 2026-08-12T18:30:00.000Z
  const isoUtcMidnight = '2026-08-12T18:30:00.000Z';
  const startOfDay = startOfDayIST(isoUtcMidnight);
  assert.equal(startOfDay.toISOString(), '2026-08-12T18:30:00.000Z');

  // Plain YYYY-MM-DD
  const plainYmd = '2026-08-13';
  const startOfDayFromYmd = startOfDayIST(plainYmd);
  assert.equal(startOfDayFromYmd.toISOString(), '2026-08-12T18:30:00.000Z');
});

test('endOfDayIST correctly resolves ISO UTC timestamps and YYYY-MM-DD to IST end of day', () => {
  const plainYmd = '2026-11-30';
  const endOfDay = endOfDayIST(plainYmd);
  // 23:59:59.999 IST on 2026-11-30 is 18:29:59.999 UTC on 2026-11-30
  assert.equal(endOfDay.toISOString(), '2026-11-30T18:29:59.999Z');
});

test('toISTDateParts and toISTDateString correctly convert UTC Date to IST calendar date', () => {
  const d = new Date('2026-08-12T18:30:00.000Z');
  const parts = toISTDateParts(d);
  assert.deepEqual(parts, { year: 2026, month: 8, day: 13 });
  assert.equal(toISTDateString(d), '2026-08-13');
});
