import { getTransliterateSuggestions } from '@ai4bharat/indic-transliterate';

/** Base URL must match IndicTransliterate default so App.jsx fetch intercept can rewrite to Google Input Tools. */
const XLIT_API_BASE = 'https://xlit-api.ai4bharat.org/tl/';

const LATIN_RUN = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;

/**
 * Replaces contiguous Latin-letter runs with Google transliteration suggestions (Gujarati Unicode).
 * Gujarati text, digits, and punctuation are left unchanged.
 *
 * @param {string} input
 * @param {string} [lang='gu'] Indic language code
 * @returns {Promise<string>}
 */
export async function transliterateLatinRunsToGujarati(input, lang = 'gu') {
  if (!input) return '';

  const matches = [...input.matchAll(LATIN_RUN)];
  if (matches.length === 0) return input;

  const suggestions = await Promise.all(
    matches.map((m) =>
      getTransliterateSuggestions(m[0], XLIT_API_BASE, '', {
        lang,
        showCurrentWordAsLastSuggestion: false,
      })
    )
  );

  let out = '';
  let cursor = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index ?? 0;
    const word = m[0];
    const opts = suggestions[i];
    const chosen = Array.isArray(opts) && opts.length > 0 ? opts[0] : word;

    out += input.slice(cursor, start);
    out += chosen;
    cursor = start + word.length;
  }
  out += input.slice(cursor);
  return out;
}
