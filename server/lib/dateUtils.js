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
export function startOfDayIST(dateStr) {
  // Parse just the date portion to avoid any browser/node timezone shifts
  const [year, month, day] = parseYMD(dateStr);
  // Midnight IST = UTC - 5h30m
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS);
}

/**
 * Given a date string like "2026-07-01" or a full ISO string,
 * returns the end of that day in IST as a UTC Date object.
 * e.g. "2026-07-01" → 2026-07-01T18:29:59.999Z
 */
export function endOfDayIST(dateStr) {
  const [year, month, day] = parseYMD(dateStr);
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
  const istMs = new Date(date).getTime() + IST_OFFSET_MS;
  const d = new Date(istMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1, // 1-indexed
    day: d.getUTCDate(),
  };
}

// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Parses a date string to [year, month, day].
 * Handles both "YYYY-MM-DD" and full ISO strings "2026-07-01T18:30:00.000Z".
 */
function parseYMD(dateStr) {
  const s = String(dateStr).trim();
  // Take just the date part before any T
  const datePart = s.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  return [y, m, d];
}
