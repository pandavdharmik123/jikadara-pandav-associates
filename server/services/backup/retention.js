import { backupTimestamp, monthKey, weekKey } from './time.js';

/**
 * Decide which Drive backups to keep.
 *
 * Policy:
 *   - keep the newest backup for each of the last N days
 *   - keep the newest backup for each of the last N weeks (Sunday-based)
 *   - keep the newest backup for each of the last N months
 *
 * The sets are unioned, so a Sunday backup also counts as that week's backup.
 * Files without a recognisable timestamp are never deleted.
 */
export function planRetention(files, policy, timeZone) {
  const parsed = files.map((file) => {
    const timestamp = backupTimestamp(file, timeZone);
    if (!timestamp) return { file, parsed: false };
    return {
      file,
      parsed: true,
      dateKey: timestamp.dateKey,
      sortKey: timestamp.sortKey,
      sizeBytes: Number(file.size || 0),
    };
  });

  const valid = parsed
    .filter((entry) => entry.parsed)
    .sort((a, b) => b.sortKey - a.sortKey || String(b.file.name).localeCompare(String(a.file.name)));

  const unknown = parsed.filter((entry) => !entry.parsed).map((entry) => entry.file);

  if (valid.length === 0) {
    return {
      keep: [],
      remove: [],
      unknown,
      keepCount: 0,
      removeCount: 0,
      reclaimBytes: 0,
    };
  }

  const keep = new Map();
  const add = (entry, reason) => {
    const existing = keep.get(entry.file.id);
    if (existing) {
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      return;
    }
    keep.set(entry.file.id, { file: entry.file, reasons: [reason] });
  };

  // Never delete the most recent backup, whatever the policy says.
  add(valid[0], 'newest');

  // One per day.
  const perDay = new Map();
  for (const entry of valid) {
    if (!perDay.has(entry.dateKey)) perDay.set(entry.dateKey, entry);
  }
  [...perDay.values()].slice(0, Math.max(policy.daily, 0)).forEach((entry) => add(entry, 'daily'));

  // One per week.
  const perWeek = new Map();
  for (const entry of valid) {
    const key = weekKey(entry.dateKey);
    if (!perWeek.has(key)) perWeek.set(key, entry);
  }
  [...perWeek.values()].slice(0, Math.max(policy.weekly, 0)).forEach((entry) => add(entry, 'weekly'));

  // One per month.
  const perMonth = new Map();
  for (const entry of valid) {
    const key = monthKey(entry.dateKey);
    if (!perMonth.has(key)) perMonth.set(key, entry);
  }
  [...perMonth.values()]
    .slice(0, Math.max(policy.monthly, 0))
    .forEach((entry) => add(entry, 'monthly'));

  const remove = valid.filter((entry) => !keep.has(entry.file.id));

  return {
    keep: [...keep.values()],
    remove,
    unknown,
    keepCount: keep.size,
    removeCount: remove.length,
    reclaimBytes: remove.reduce((sum, entry) => sum + entry.sizeBytes, 0),
  };
}
