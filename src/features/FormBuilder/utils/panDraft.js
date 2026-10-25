import { createPanData } from '../constants/panData';

export const PAN_DRAFT_KEY = 'jikadara:pan-form-93:draft:v1';
export const CORRECTION_DRAFT_KEY = 'jikadara:pan-correction:draft:v1';
export const MARRIAGE_DRAFT_KEY = 'jikadara:marriage-registration:draft:v1';

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
export function savePanDraft(data, key = PAN_DRAFT_KEY) {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt, data }));
  } catch {
    return null;
  }
  return savedAt;
}

export function readPanDraft(key = PAN_DRAFT_KEY, createData = createPanData) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return { savedAt: parsed.savedAt || null, data: mergeDefaults(createData(), parsed.data) };
  } catch {
    return null;
  }
}

export function clearPanDraft(key = PAN_DRAFT_KEY) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage may be unavailable – nothing to clear */
  }
}
