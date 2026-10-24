import path from 'node:path';
import { isValidTimeZone } from './time.js';

const SERVER_ROOT = path.resolve(import.meta.dirname, '../..');

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

function asBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return TRUTHY.has(String(value).trim().toLowerCase());
}

function asInt(value, fallback, { min = 0 } = {}) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

function asList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeId(id) {
  return String(id)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
}

function envValue(env, keys) {
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

/**
 * Resolve one Google Drive account from env vars.
 *
 * Single-account (legacy, simplest):
 *   GOOGLE_DRIVE_ACCOUNT_EMAIL / GOOGLE_DRIVE_REFRESH_TOKEN
 *
 * Multi-account:
 *   GOOGLE_DRIVE_ACCOUNTS=primary,office
 *   GOOGLE_DRIVE_PRIMARY_EMAIL / GOOGLE_DRIVE_PRIMARY_REFRESH_TOKEN
 *   GOOGLE_DRIVE_OFFICE_EMAIL  / GOOGLE_DRIVE_OFFICE_REFRESH_TOKEN
 *
 * OAuth client id/secret can be shared via GOOGLE_DRIVE_CLIENT_ID/SECRET or
 * overridden per account with GOOGLE_DRIVE_<ID>_CLIENT_ID/SECRET.
 */
function resolveAccount(env, id, shared) {
  const isDefault = id === 'default';
  const prefix = isDefault ? 'GOOGLE_DRIVE' : `GOOGLE_DRIVE_${normalizeId(id)}`;

  const account = {
    id,
    envPrefix: prefix,
    email: envValue(env, [`${prefix}_ACCOUNT_EMAIL`, `${prefix}_EMAIL`]).toLowerCase(),
    clientId: envValue(env, [`${prefix}_CLIENT_ID`]) || shared.clientId,
    clientSecret: envValue(env, [`${prefix}_CLIENT_SECRET`]) || shared.clientSecret,
    refreshToken: envValue(env, [`${prefix}_REFRESH_TOKEN`]),
    folderId: envValue(env, [`${prefix}_BACKUP_FOLDER_ID`, `${prefix}_FOLDER_ID`]),
  };

  account.missing = [];
  if (!account.email) account.missing.push(`${prefix}_EMAIL`);
  if (!account.clientId) account.missing.push('GOOGLE_DRIVE_CLIENT_ID');
  if (!account.clientSecret) account.missing.push('GOOGLE_DRIVE_CLIENT_SECRET');
  if (!account.refreshToken) account.missing.push(`${prefix}_REFRESH_TOKEN`);
  account.configured = account.missing.length === 0;

  return account;
}

export function loadBackupConfig(env = process.env) {
  const projectName = env.PROJECT_NAME?.trim() || 'advocate-management';

  const shared = {
    clientId: envValue(env, ['GOOGLE_DRIVE_CLIENT_ID']),
    clientSecret: envValue(env, ['GOOGLE_DRIVE_CLIENT_SECRET']),
    refreshToken: envValue(env, ['GOOGLE_DRIVE_REFRESH_TOKEN']),
  };

  let accountIds = asList(env.GOOGLE_DRIVE_ACCOUNTS);
  if (accountIds.length === 0) {
    // Backwards compatible single-account mode.
    if (shared.refreshToken || env.GOOGLE_DRIVE_ACCOUNT_EMAIL) {
      accountIds = ['default'];
    }
  }
  // De-duplicate while preserving order.
  accountIds = [...new Set(accountIds)];

  const accounts = accountIds.map((id) => resolveAccount(env, id, shared));

  const requestedTargets = asList(env.GOOGLE_DRIVE_BACKUP_ACCOUNTS);
  const targetAccounts =
    requestedTargets.length > 0
      ? accounts.filter((account) => requestedTargets.includes(account.id))
      : accounts;

  const timezoneRaw = env.DB_BACKUP_TIMEZONE?.trim() || 'Asia/Kolkata';
  const timezone = isValidTimeZone(timezoneRaw) ? timezoneRaw : 'Asia/Kolkata';

  const format = String(env.DB_BACKUP_FORMAT || 'custom').trim().toLowerCase();
  const tempDirRaw = env.DB_BACKUP_TEMP_DIR?.trim() || './backups/tmp';

  const warnings = [];
  if (!isValidTimeZone(timezoneRaw)) {
    warnings.push(`DB_BACKUP_TIMEZONE="${timezoneRaw}" is invalid; using Asia/Kolkata.`);
  }
  if (format !== 'custom' && format !== 'plain') {
    warnings.push(`DB_BACKUP_FORMAT="${format}" is invalid; using custom.`);
  }
  if (requestedTargets.length > 0 && targetAccounts.length === 0) {
    warnings.push('GOOGLE_DRIVE_BACKUP_ACCOUNTS does not match any configured account id.');
  }
  if (env.DB_BACKUP_ENCRYPTION_KEY && env.DB_BACKUP_ENCRYPTION_KEY.length < 16) {
    warnings.push('DB_BACKUP_ENCRYPTION_KEY should be at least 16 characters (32+ recommended).');
  }

  const config = {
    enabled: asBool(env.GOOGLE_DRIVE_BACKUP_ENABLED, false),
    projectName,
    rootFolderName: env.GOOGLE_DRIVE_ROOT_FOLDER_NAME?.trim() || 'DB Backups',
    accounts,
    targetAccounts,
    oauthConfigured: Boolean(shared.clientId && shared.clientSecret),
    schedule: env.DB_BACKUP_SCHEDULE?.trim() || '0 2 * * *',
    scheduleEnabled: asBool(env.DB_BACKUP_SCHEDULE_ENABLED, true),
    timezone,
    format: format === 'plain' ? 'plain' : 'custom',
    tempDir: path.isAbsolute(tempDirRaw) ? tempDirRaw : path.resolve(SERVER_ROOT, tempDirRaw),
    pgDumpPath: env.PG_DUMP_PATH?.trim() || 'pg_dump',
    maxFileMb: asInt(env.DB_BACKUP_MAX_FILE_MB, 500, { min: 1 }),
    minFreeMb: asInt(env.DB_BACKUP_MIN_FREE_MB, 1024, { min: 0 }),
    retention: {
      daily: asInt(env.DB_BACKUP_KEEP_DAILY, 30, { min: 0 }),
      weekly: asInt(env.DB_BACKUP_KEEP_WEEKLY, 12, { min: 0 }),
      monthly: asInt(env.DB_BACKUP_KEEP_MONTHLY, 12, { min: 0 }),
    },
    encryptionKey: env.DB_BACKUP_ENCRYPTION_KEY || '',
    alertEmail: env.BACKUP_ALERT_EMAIL || env.EMAIL_FROM || env.BREVO_SENDER_EMAIL || '',
    alertOnSuccess: asBool(env.DB_BACKUP_ALERT_ON_SUCCESS, false),
    warnings,
  };

  config.missing = collectMissing(config);
  config.configured = config.missing.length === 0;
  config.maxFileBytes = config.maxFileMb * 1024 * 1024;
  config.minFreeBytes = config.minFreeMb * 1024 * 1024;

  return config;
}

function collectMissing(config) {
  const missing = new Set();

  if (!config.oauthConfigured) {
    missing.add('GOOGLE_DRIVE_CLIENT_ID');
    missing.add('GOOGLE_DRIVE_CLIENT_SECRET');
  }

  if (config.accounts.length === 0) {
    missing.add('GOOGLE_DRIVE_ACCOUNTS=primary,office (or GOOGLE_DRIVE_ACCOUNT_EMAIL + GOOGLE_DRIVE_REFRESH_TOKEN)');
  }

  for (const account of config.accounts) {
    for (const key of account.missing) missing.add(key);
  }

  if (config.accounts.length > 0 && config.targetAccounts.length === 0) {
    missing.add('GOOGLE_DRIVE_BACKUP_ACCOUNTS (no matching account)');
  }

  return [...missing];
}

export function selectAccounts(config, accountIds = []) {
  const ids = Array.isArray(accountIds) ? accountIds.filter(Boolean) : [];
  if (ids.length === 0) return config.targetAccounts;
  return config.targetAccounts.filter((account) => ids.includes(account.id));
}

export function assertBackupConfigured(config, accounts = config.targetAccounts) {
  if (config.missing.length > 0) {
    throw new Error(
      `Google Drive backup is not configured. Missing: ${config.missing.join(', ')}. ` +
        'Run `npm run backup:auth` to generate a refresh token, then add the values to server/.env.'
    );
  }

  if (accounts.length === 0) {
    throw new Error('No Google Drive account selected for backup.');
  }

  const incomplete = accounts.find((account) => !account.configured);
  if (incomplete) {
    throw new Error(
      `Google Drive account "${incomplete.id}" is incomplete. Missing: ${incomplete.missing.join(', ')}.`
    );
  }
}

export function describeBackupConfig(config = loadBackupConfig()) {
  return {
    enabled: config.enabled,
    configured: config.configured,
    oauthConfigured: config.oauthConfigured,
    projectName: config.projectName,
    rootFolderName: config.rootFolderName,
    schedule: config.schedule,
    scheduleEnabled: config.scheduleEnabled,
    timezone: config.timezone,
    format: config.format,
    maxFileMb: config.maxFileMb,
    minFreeMb: config.minFreeMb,
    retention: config.retention,
    encryptionEnabled: Boolean(config.encryptionKey),
    missing: config.missing,
    warnings: config.warnings,
    accounts: config.accounts.map((account) => ({
      id: account.id,
      email: account.email,
      configured: account.configured,
      folderId: account.folderId || null,
      missing: account.missing,
    })),
  };
}

export { SERVER_ROOT };
