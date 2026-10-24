/**
 * Time and filename helpers for backup retention.
 *
 * Backup names embed the timestamp in the configured timezone:
 *   advocate-management_2026-10-20_02-00-00.dump[.enc]
 *
 * Retention groups by local calendar day/week/month, which is what a human
 * expects ("keep Sunday's backup", "keep the 1st of each month").
 */

export function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function partsInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  // Some ICU versions return hour "24" at midnight.
  if (parts.hour === '24') parts.hour = '00';

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

const pad = (value) => String(value).padStart(2, '0');

export function formatTimestamp(date = new Date(), timeZone = 'Asia/Kolkata') {
  const p = partsInTimeZone(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}_${pad(p.hour)}-${pad(p.minute)}-${pad(p.second)}`;
}

export function localDateKey(date, timeZone) {
  const p = partsInTimeZone(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function monthKey(dateKey) {
  return dateKey.slice(0, 7);
}

/** Week key using Sunday as the first day of the week. */
export function weekKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

export function dayKeyToUtcMillis(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`).getTime();
}

/**
 * Return the local date key for a Drive file. Prefers the backup timestamp
 * embedded in the filename because it was written in the backup timezone;
 * falls back to Drive's createdTime.
 */
const FILE_TS_RE = /_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/;

export function backupDateKey(file, timeZone) {
  const parsed = backupTimestamp(file, timeZone);
  return parsed?.dateKey || null;
}

/**
 * Parse a backup's creation time. The filename timestamp is authoritative
 * because it was written in the backup timezone; Drive's createdTime is the
 * fallback. Returns null for files that are not recognisable backups.
 */
export function backupTimestamp(file, timeZone) {
  const name = file.name || '';
  const match = name.match(FILE_TS_RE);

  if (match) {
    const [, year, month, day, hour, minute, second] = match.map(Number);
    return {
      dateKey: `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`,
      sortKey: Date.UTC(year, month - 1, day, hour, minute, second),
      source: 'filename',
    };
  }

  const iso = file.appProperties?.createdAt || file.createdTime;
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return {
        dateKey: localDateKey(date, timeZone),
        sortKey: date.getTime(),
        source: 'createdTime',
      };
    }
  }

  return null;
}

export function slugify(value) {
  return String(value || 'database')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'database';
}
