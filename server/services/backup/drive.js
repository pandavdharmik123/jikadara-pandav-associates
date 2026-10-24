import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { OAuth2Client } from 'google-auth-library';
import { md5File } from './hash.js';

export const DRIVE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/drive.file',
];

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const USERINFO_API = 'https://www.googleapis.com/oauth2/v3/userinfo';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const clientCache = new Map();
const folderCache = new Map();
const quotaCache = new Map();
const QUOTA_TTL_MS = 60 * 1000;

const clientKey = (account) => `${account.clientId}:${account.refreshToken}`;

export function createOAuthClient(account, redirectUri) {
  const client = new OAuth2Client({
    clientId: account.clientId,
    clientSecret: account.clientSecret,
    redirectUri,
  });
  client.setCredentials({ refresh_token: account.refreshToken });
  return client;
}

async function getAccessToken(account) {
  const key = clientKey(account);
  let client = clientCache.get(key);
  if (!client) {
    client = createOAuthClient(account);
    clientCache.set(key, client);
  }

  const { token } = await client.getAccessToken();
  if (!token) {
    throw new Error(
      `Could not obtain a Google access token for ${account.email || account.id}. ` +
        'The refresh token may have been revoked or expired — run `npm run backup:auth` again.'
    );
  }
  return token;
}

async function authorizedFetch(account, url, options = {}) {
  const doFetch = async () => {
    const token = await getAccessToken(account);
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  let response = await doFetch();

  // Google refresh tokens can be revoked server-side; drop the cached client
  // and retry once with a fresh token.
  if (response.status === 401) {
    clientCache.delete(clientKey(account));
    response = await doFetch();
  }

  return response;
}

async function responseError(response, context) {
  const text = await response.text().catch(() => '');
  let detail = text;
  try {
    const parsed = JSON.parse(text);
    detail = parsed?.error?.message || parsed?.error_description || text;
  } catch {
    // keep raw text
  }
  return new Error(`${context} failed (HTTP ${response.status}): ${detail || response.statusText}`);
}

function fieldsParam(fields) {
  return new URLSearchParams({ fields }).toString();
}

function escapeQuery(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Confirm which Google account the refresh token belongs to. */
export async function getAccountIdentity(account) {
  const response = await authorizedFetch(account, USERINFO_API);
  if (!response.ok) throw await responseError(response, 'Google user lookup');

  const data = await response.json();
  const email = (data.email || '').toLowerCase();

  if (!email) {
    throw new Error('Google did not return an email address for this token.');
  }

  if (account.email && email !== account.email.toLowerCase()) {
    const emailKey = account.envPrefix
      ? `${account.envPrefix}_EMAIL`
      : 'GOOGLE_DRIVE_ACCOUNT_EMAIL';
    throw new Error(
      `Google Drive account mismatch: token belongs to ${email}, but ` +
        `${emailKey} is ${account.email}. ` +
        'Refusing to upload to the wrong Drive. Re-run `npm run backup:auth` for the correct account.'
    );
  }

  return { email, name: data.name || '' };
}

/**
 * Drive quota. Returns null when the scope does not expose it; the upload then
 * relies on Google's own quota error, which is handled by the caller.
 */
export async function getStorageQuota(account) {
  const cacheKey = clientKey(account);
  const cached = quotaCache.get(cacheKey);
  if (cached && Date.now() - cached.at < QUOTA_TTL_MS) return cached.value;

  try {
    const response = await authorizedFetch(
      account,
      `${DRIVE_API}/about?${fieldsParam('storageQuota(limit,usage,usageInDrive)')}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.storageQuota) return null;
    const value = {
      limit: Number(data.storageQuota.limit || 0),
      usage: Number(data.storageQuota.usage || 0),
      usageInDrive: Number(data.storageQuota.usageInDrive || 0),
      free: Math.max(0, Number(data.storageQuota.limit || 0) - Number(data.storageQuota.usage || 0)),
    };
    quotaCache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

async function findFolder(account, name, parentId) {
  const q =
    `name = '${escapeQuery(name)}' and ` +
    `mimeType = '${FOLDER_MIME}' and ` +
    `'${escapeQuery(parentId)}' in parents and trashed = false`;

  const url = `${DRIVE_API}/files?${new URLSearchParams({
    q,
    spaces: 'drive',
    fields: 'files(id,name,webViewLink)',
    pageSize: '10',
  }).toString()}`;

  const response = await authorizedFetch(account, url);
  if (!response.ok) throw await responseError(response, 'Google Drive folder lookup');

  const data = await response.json();
  return data.files?.[0] || null;
}

async function createFolder(account, name, parentId) {
  const response = await authorizedFetch(
    account,
    `${DRIVE_API}/files?${fieldsParam('id,name,webViewLink')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
    }
  );

  if (!response.ok) throw await responseError(response, 'Google Drive folder creation');
  return response.json();
}

async function getFolderById(account, folderId) {
  const response = await authorizedFetch(
    account,
    `${DRIVE_API}/files/${encodeURIComponent(folderId)}?${fieldsParam('id,name,mimeType,trashed,webViewLink')}`
  );

  if (response.status === 404) {
    throw new Error(
      `Google Drive folder ${folderId} was not found or is not accessible by this app. ` +
        'With the drive.file scope the app can only access folders it created itself.'
    );
  }
  if (!response.ok) throw await responseError(response, 'Google Drive folder lookup');

  const folder = await response.json();
  if (folder.mimeType !== FOLDER_MIME) {
    throw new Error(`Google Drive id ${folderId} is not a folder.`);
  }
  if (folder.trashed) {
    throw new Error(`Google Drive folder ${folderId} is in the trash.`);
  }
  return folder;
}

/**
 * Resolve (and create if needed) the folder where backups live:
 *   My Drive / <rootFolderName> / <projectName>
 */
export async function ensureBackupFolder(account, config) {
  if (account.folderId) {
    return getFolderById(account, account.folderId);
  }

  const cacheKey = `${account.email || account.id}:${config.rootFolderName}:${config.projectName}`;
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey);

  let root = await findFolder(account, config.rootFolderName, 'root');
  if (!root) {
    root = await createFolder(account, config.rootFolderName, 'root');
  }

  let project = await findFolder(account, config.projectName, root.id);
  if (!project) {
    project = await createFolder(account, config.projectName, root.id);
  }

  folderCache.set(cacheKey, project);
  return project;
}

function sanitizeProperties(properties = {}) {
  const result = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value === null) continue;
    const cleanKey = String(key).slice(0, 118);
    result[cleanKey] = String(value).slice(0, 118);
  }
  return result;
}

/**
 * Resumable upload. Streams from disk so large dumps do not sit in memory.
 */
export async function uploadBackup(account, folderId, filePath, metadata = {}) {
  const stat = await fs.stat(filePath);
  const mimeType = 'application/octet-stream';
  const md5 = await md5File(filePath);

  const body = {
    name: metadata.name,
    parents: [folderId],
    appProperties: sanitizeProperties(metadata.appProperties),
  };

  const initResponse = await authorizedFetch(
    account,
    `${UPLOAD_API}/files?${new URLSearchParams({
      uploadType: 'resumable',
      fields: 'id,name,size,md5Checksum,webViewLink,createdTime,appProperties',
    }).toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(stat.size),
      },
      body: JSON.stringify(body),
    }
  );

  if (!initResponse.ok) throw await responseError(initResponse, 'Google Drive upload init');

  const uploadUrl = initResponse.headers.get('location');
  if (!uploadUrl) throw new Error('Google Drive did not return an upload URL.');

  const token = await getAccessToken(account);
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': mimeType,
      'Content-Length': String(stat.size),
    },
    body: createReadStream(filePath),
    duplex: 'half',
    signal: AbortSignal.timeout(30 * 60 * 1000),
  });

  if (!uploadResponse.ok) throw await responseError(uploadResponse, 'Google Drive upload');

  const uploaded = await uploadResponse.json();

  if (Number(uploaded.size) !== stat.size) {
    await deleteFile(account, uploaded.id).catch(() => {});
    throw new Error(
      `Google Drive upload size mismatch (local ${stat.size}, remote ${uploaded.size}). ` +
        'Deleted the incomplete remote file.'
    );
  }

  if (uploaded.md5Checksum && uploaded.md5Checksum !== md5) {
    await deleteFile(account, uploaded.id).catch(() => {});
    throw new Error('Google Drive checksum mismatch after upload. Deleted the remote file.');
  }

  quotaCache.delete(clientKey(account));

  return {
    id: uploaded.id,
    name: uploaded.name,
    size: Number(uploaded.size),
    md5Checksum: uploaded.md5Checksum,
    webViewLink: uploaded.webViewLink,
    createdTime: uploaded.createdTime,
  };
}

export async function listBackups(account, folderId) {
  const files = [];
  let pageToken;

  do {
    const params = new URLSearchParams({
      q: `'${escapeQuery(folderId)}' in parents and trashed = false`,
      spaces: 'drive',
      orderBy: 'createdTime desc',
      pageSize: '1000',
      fields:
        'nextPageToken,files(id,name,size,createdTime,modifiedTime,md5Checksum,webViewLink,appProperties)',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await authorizedFetch(account, `${DRIVE_API}/files?${params.toString()}`);
    if (!response.ok) throw await responseError(response, 'Google Drive file listing');

    const data = await response.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

export async function getFile(account, fileId) {
  const response = await authorizedFetch(
    account,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?${fieldsParam(
      'id,name,size,createdTime,webViewLink,md5Checksum,appProperties'
    )}`
  );

  if (!response.ok) throw await responseError(response, 'Google Drive file lookup');
  return response.json();
}

/** Permanent delete. Trashing would keep consuming the 15 GB quota. */
export async function deleteFile(account, fileId) {
  const response = await authorizedFetch(
    account,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}`,
    { method: 'DELETE' }
  );

  if (response.status === 404) return { deleted: true, alreadyMissing: true };
  if (!response.ok) throw await responseError(response, 'Google Drive file delete');
  quotaCache.delete(clientKey(account));
  return { deleted: true, alreadyMissing: false };
}

export async function downloadFile(account, fileId, destinationPath) {
  const response = await authorizedFetch(
    account,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`,
    { signal: AbortSignal.timeout(30 * 60 * 1000) }
  );

  if (!response.ok) throw await responseError(response, 'Google Drive download');
  if (!response.body) throw new Error('Google Drive returned an empty download.');

  await pipeline(Readable.fromWeb(response.body), createWriteStream(destinationPath, { mode: 0o600 }));
  return destinationPath;
}

export function folderLink(folderId) {
  return folderId ? `https://drive.google.com/drive/folders/${folderId}` : null;
}
