import { convertHarikrishnaTemplateToUnicode } from '../../../utils/reverseHarikrishnaTemplate.js';

const HAS_GUJARATI_UNICODE = /[\u0A80-\u0AFF]/;

/**
 * Ensures the given text is in Gujarati Unicode.
 * If it is already Gujarati Unicode, returns it directly.
 * If it is legacy Harikrishna / Ghanshyam keystrokes (e.g. "aiN>dBie pi>Dv"),
 * converts it to Gujarati Unicode (e.g. "આણંદભાઇ પાંડવ").
 */
export function ensureUnicode(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Already contains Gujarati Unicode characters
  if (HAS_GUJARATI_UNICODE.test(trimmed)) {
    return trimmed;
  }

  // Pure digits, punctuation, or placeholder dots
  if (/^[0-9\s.,\-_/:()]+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const converted = convertHarikrishnaTemplateToUnicode(trimmed);
    return converted.trim() || trimmed;
  } catch (err) {
    console.warn('Unicode conversion error for text:', text, err);
    return trimmed;
  }
}
