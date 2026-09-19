import { transliterateLatinRunsToGujarati } from '../../../utils/batchTransliterate.js';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy.js';

const HAS_LATIN = /[a-zA-Z]/;
const HAS_GUJARATI_UNICODE = /[\u0A80-\u0AFF]/;

/**
 * Converts user input (English phonetics like "Kem chho?" or Gujarati Unicode)
 * into Ghanshyam legacy keystrokes (e.g. "k[m Ci[?").
 *
 * Example:
 *   "Kem chho?" -> "k[m Ci[?"
 *   "દિનેશભાઇ" -> "(dn[SBie"
 *   "k[m Ci[?" -> "k[m Ci[?" (already Ghanshyam, preserved)
 */
export async function convertToGhanshyamText(input) {
  if (!input) return '';
  const text = String(input);

  // 1. If it contains Gujarati Unicode characters, directly convert to Ghanshyam legacy
  if (HAS_GUJARATI_UNICODE.test(text)) {
    return convertUnicodeToGhanshyamLegacy(text);
  }

  // 2. If it contains Latin/English letters, transliterate to Gujarati Unicode first
  if (HAS_LATIN.test(text)) {
    let unicode = text;
    try {
      // Direct Google Input Tools API call (fast whole-phrase / word transliteration)
      const googleUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&ime=transliteration_en_gu&num=1&cp=0&cs=0&ie=utf-8&oe=utf-8&app=jsapi`;
      const res = await fetch(googleUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data[0] === 'SUCCESS' && data[1]?.[0]?.[1]?.[0]) {
          unicode = data[1][0][1][0];
        }
      }
    } catch (e) {
      // Direct fetch failed, fallback to transliterateLatinRunsToGujarati
      try {
        unicode = await transliterateLatinRunsToGujarati(text, 'gu');
      } catch (err) {
        console.warn('Transliteration fallback error:', err);
      }
    }

    if (HAS_GUJARATI_UNICODE.test(unicode)) {
      return convertUnicodeToGhanshyamLegacy(unicode);
    }
  }

  return text;
}

