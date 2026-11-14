import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convert a date or ISO timestamp to the calendar date seen in IST.
 * Keeping all API dates as YYYY-MM-DD avoids UTC/IST off-by-one errors.
 */
export function toISTDateString(value) {
  if (!value) return '';
  if (typeof value === 'string' && DATE_ONLY_RE.test(value)) return value;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatISTDate(value) {
  const date = toISTDateString(value);
  return date ? dayjs(date).format('DD/MM/YYYY') : '—';
}

export function formatDisplayDate(value) {
  const date = toISTDateString(value);
  return date ? dayjs(date).format('DD MMM YYYY') : '—';
}

export function formatWeekdayDate(value) {
  const date = toISTDateString(value);
  return date ? dayjs(date).format('ddd, DD MMM YYYY') : '—';
}

/** Today's calendar date in IST, independent of the browser's timezone. */
export function getISTToday() {
  return dayjs(toISTDateString(new Date()));
}

export function getFinancialYearRange(financialYear) {
  if (!financialYear?.startDate || !financialYear?.endDate) return null;

  const startDate = toISTDateString(financialYear.startDate);
  const endDate = toISTDateString(financialYear.endDate);

  if (!startDate || !endDate || startDate > endDate) return null;

  return {
    id: financialYear.id,
    startDate,
    endDate,
    label: financialYear.name || `FY ${startDate} to ${endDate}`,
  };
}

export function fyContainsDate(fyRange, dateValue) {
  if (!fyRange || !dateValue) return false;
  const date = toISTDateString(dateValue);
  return date >= fyRange.startDate && date <= fyRange.endDate;
}

function clampToFy(start, end, fyRange) {
  if (!start || !end) return null;

  let rangeStart = start;
  let rangeEnd = end;

  if (fyRange) {
    if (rangeStart < fyRange.startDate) rangeStart = fyRange.startDate;
    if (rangeEnd > fyRange.endDate) rangeEnd = fyRange.endDate;
  }

  if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return null;
  return { startDate: rangeStart, endDate: rangeEnd };
}

/**
 * Date presets shared by the dashboard and transaction history.
 * Every range is clamped to the selected financial year, matching the
 * existing Office Reports API which rejects dates outside the FY.
 */
export function getPresetRange(preset, fyRange, customRange = null) {
  const today = getISTToday();

  switch (preset) {
    case 'TODAY':
      return clampToFy(today.format('YYYY-MM-DD'), today.format('YYYY-MM-DD'), fyRange);
    case 'YESTERDAY': {
      const day = today.subtract(1, 'day');
      return clampToFy(day.format('YYYY-MM-DD'), day.format('YYYY-MM-DD'), fyRange);
    }
    case 'THIS_WEEK': {
      const start = today.startOf('isoWeek');
      return clampToFy(start.format('YYYY-MM-DD'), today.format('YYYY-MM-DD'), fyRange);
    }
    case 'THIS_MONTH': {
      const start = today.startOf('month');
      const end = today.endOf('month');
      return clampToFy(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'), fyRange);
    }
    case 'PREV_MONTH': {
      const base = today.subtract(1, 'month');
      return clampToFy(
        base.startOf('month').format('YYYY-MM-DD'),
        base.endOf('month').format('YYYY-MM-DD'),
        fyRange
      );
    }
    case 'CUSTOM':
      return customRange?.startDate && customRange?.endDate
        ? clampToFy(customRange.startDate, customRange.endDate, fyRange)
        : null;
    case 'THIS_FY':
    case 'ALL':
    default:
      return fyRange ? { startDate: fyRange.startDate, endDate: fyRange.endDate } : null;
  }
}

export function getCurrentMonthRange(fyRange) {
  const today = getISTToday();
  return clampToFy(
    today.startOf('month').format('YYYY-MM-DD'),
    today.endOf('month').format('YYYY-MM-DD'),
    fyRange
  );
}

export function isDateInRange(dateValue, range) {
  if (!range) return true;
  const date = toISTDateString(dateValue);
  if (!date) return false;
  return date >= range.startDate && date <= range.endDate;
}

export function isDateInMonth(dateValue, reference = getISTToday()) {
  const date = toISTDateString(dateValue);
  if (!date) return false;
  const d = dayjs(date);
  return d.year() === reference.year() && d.month() === reference.month();
}

export { dayjs };
