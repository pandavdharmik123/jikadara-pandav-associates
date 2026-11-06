/**
 * Date utility helpers for IST (Asia/Kolkata, UTC+5:30) timezone handling.
 *
 * WHY: PostgreSQL/Supabase stores all timestamps in UTC. When a user in IST picks
 * "1 July 2026", the frontend sends "2026-07-01". We must interpret that as
 * 2026-07-01T00:00:00+05:30 (start of day IST) and 2026-07-01T23:59:59+05:30
 * (end of day IST) for range queries — otherwise UTC midnight comparisons will
 * cause dates to appear in the wrong month.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms

/**
 * Given a date string like "2026-07-01" or a full ISO string,
 * returns the start of that day in IST as a UTC Date object.
 * e.g. "2026-07-01" → 2026-06-30T18:30:00.000Z
 */
export function startOfDayIST(dateInput) {
  if (!dateInput) return null;
  const parsed = parseYMD(dateInput);
  if (!parsed) return null;
  const [year, month, day] = parsed;
  // Midnight IST = UTC - 5h30m
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS);
}

/**
 * Given a date string like "2026-07-01" or a full ISO string or Date,
 * returns the end of that day in IST as a UTC Date object.
 * e.g. "2026-07-01" → 2026-07-01T18:29:59.999Z
 */
export function endOfDayIST(dateInput) {
  if (!dateInput) return null;
  const parsed = parseYMD(dateInput);
  if (!parsed) return null;
  const [year, month, day] = parsed;
  // 23:59:59.999 IST = UTC - 5h30m + 24h - 1ms
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS);
}

/**
 * Returns the start of a given month (1-indexed) in IST as a UTC Date object.
 * e.g. year=2026, month=7 → 2026-06-30T18:30:00.000Z
 */
export function startOfMonthIST(year, month) {
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - IST_OFFSET_MS);
}

/**
 * Returns the end of a given month (1-indexed) in IST as a UTC Date object.
 * e.g. year=2026, month=7 → 2026-07-31T18:29:59.999Z
 */
export function endOfMonthIST(year, month) {
  // Day 0 of next month = last day of current month
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999) - IST_OFFSET_MS);
}

/**
 * Converts a UTC Date (from DB) to its IST year/month/day.
 * Useful for grouping tasks by the month the user sees.
 */
export function toISTDateParts(date) {
  if (!date) return null;
  const dObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dObj.getTime())) return null;
  const istMs = dObj.getTime() + IST_OFFSET_MS;
  const d = new Date(istMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1, // 1-indexed
    day: d.getUTCDate(),
  };
}

export function toISTDateString(date) {
  if (!date) return null;
  const parts = toISTDateParts(date);
  if (!parts) return null;
  const { year, month, day } = parts;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}


// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Parses a date string or Date object to [year, month, day].
 * Handles Date objects, "YYYY-MM-DD", and full ISO strings "2026-07-01T18:30:00.000Z".
 * Returns null if the input is not a valid date.
 */
function parseYMD(dateInput) {
  if (!dateInput) return null;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    const parts = toISTDateParts(dateInput);
    return parts ? [parts.year, parts.month, parts.day] : null;
  }

  const s = String(dateInput).trim();
  if (!s) return null;

  // If it's a full ISO timestamp with time or timezone (e.g. "2026-08-12T18:30:00.000Z"),
  // convert to IST parts so UTC 18:30 on Aug 12 maps to Aug 13 in IST
  if (s.includes('T') || s.endsWith('Z')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const parts = toISTDateParts(d);
      return parts ? [parts.year, parts.month, parts.day] : null;
    }
  }

  // Handle standard date-only YYYY-MM-DD strings (e.g. "2026-08-13")
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return [y, m, d];
    }
  }

  // Attempt general Date parse fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const parts = toISTDateParts(d);
    return parts ? [parts.year, parts.month, parts.day] : null;
  }

  return null;
}
