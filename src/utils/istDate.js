import dayjs from 'dayjs';

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
  return date ? dayjs(date).format('DD/MM/YYYY') : '-';
}

/**
 * Today's calendar date in IST, independent of the browser's timezone.
 */
export function getISTToday() {
  return dayjs(toISTDateString(new Date()));
}

export function getFinancialYearRange(financialYear) {
  if (!financialYear?.startDate || !financialYear?.endDate) return null;

  const startDate = toISTDateString(financialYear.startDate);
  const endDate = toISTDateString(financialYear.endDate);

  if (!startDate || !endDate || startDate > endDate) return null;

  return {
    startDate,
    endDate,
    label: financialYear.name || `FY ${startDate} to ${endDate}`,
  };
}
