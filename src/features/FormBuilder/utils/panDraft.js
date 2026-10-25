import { createPanData } from '../constants/panData';

const DRAFT_KEY = 'jikadara:pan-form-93:draft:v1';

/** Deep-merge a stored draft over the current defaults (forward compatible). */
function mergeDefaults(base, patch) {
  if (patch === null || patch === undefined) return base;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return patch;
  const result = { ...base };
  Object.keys(patch).forEach((key) => {
    result[key] = mergeDefaults(base[key], patch[key]);
  });
  return result;
}

/**
 * Drafts are kept on this device only (localStorage) – no Aadhaar/PAN data is
 * sent to or stored on the server by this module.
 */
export function savePanDraft(data) {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt, data }));
  } catch {
    return null;
  }
  return savedAt;
}

export function readPanDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return { savedAt: parsed.savedAt || null, data: mergeDefaults(createPanData(), parsed.data) };
  } catch {
    return null;
  }
}

export function clearPanDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage may be unavailable – nothing to clear */
  }
}
