const VIRAMA = '\u0acd';

const REVERSE_CONSONANTS = {
  'k': 'ક', 'K': 'ખ', 'g': 'ગ', 'G': 'ઘ', '|': 'ઙ', 'c': 'ચ', 'C': 'છ', 'j': 'જ', 'z': 'ઝ', 'Z': 'ઞ',
  'T': 'ટ', 'q': 'ઠ', 'D': 'ડ', 'Q': 'ઢ', 'N': 'ણ', 't': 'ત', 'Y': 'થ', 'd': 'દ', 'F': 'ધ', 'n': 'ન',
  'p': 'પ', 'f': 'ફ', 'b': 'બ', 'B': 'ભ', 'm': 'મ', 'y': 'ય', 'r': 'ર', 'l': 'લ', 'L': 'ળ', 'v': 'વ',
  'S': 'શ', 'P': 'ષ', 's': 'સ', 'h': 'હ', 'x': 'ક્ષ', 'X': 'જ્ઞ',
};

const REVERSE_INDEPENDENT_VOWELS = {
  'ai[': 'ઓ', 'ai]': 'ઔ', 'ai`': 'ઑ', 'a[': 'એ', 'a]': 'ઐ', 'a`': 'ઍ', 'ai': 'આ',
  'a': 'અ', 'e': 'ઇ', 'E': 'ઈ', 'u': 'ઉ', 'O': 'ઊ', 'Z': 'ઋ',
};

const REVERSE_MATRAS = {
  'i[': '\u0acb', // ો
  'i]': '\u0acc', // ૌ
  'i`': '\u0ac9', // ૉ
  'i': '\u0abe',  // ા
  '(': '\u0abf',  // િ
  ')': '\u0ac0',  // ી
  '&': '\u0ac1',  // ુ
  '*': '\u0ac2',  // ૂ
  'Z': '\u0ac3',  // ૃ
  '`': '\u0ac5',  // ૅ
  '[': '\u0ac7',  // ે
  ']': '\u0ac8',  // ૈ
  'M': '\u0a81',  // ઁ
  '>': '\u0a82',  // ં
  ':': '\u0a83',  // ઃ
};

const REVERSE_DIGITS = {
  '{': '(', '}': ')',
  '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
  '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯',
};

const REVERSE_CONJUNCTS = {
  '$': 'રૂ',
  'J': 'જી',
  'Î': 'ઠ્ઠ',
  'W': 'દ્ર',
  '~': 'શ્ર',
  'H': 'હ્ય',
  'M': 'હ્મ',
  'o': 'દ્વ',
  'V': 'શ્વ',
  'w': 'દ્ધ', // mapping conflict in original w -> દ્ધ or દ્ય. We'll favor દ્ધ.
  'Ò': 'ત્ર',
  '#i': 'ત્રા', // Since Ò replaces ત્ર, #i was historically replacing something else or mapped directly. We'll handle it.
  'Ê': 'ક્ક',
  'Ë': 'દ્ગ',
  'Ì': 'જ્જ',
  'Í': 'ટ્ટ',
  'Ï': 'ડ્ડ',
  'Ð': 'ઢ્ઢ',
  'Ñ': 'દ્દ',
  'Ö': 'ષ્ટ',
  '×': 'ષ્ઠ',
  'Ø': 'ટ્ર',
  'T^': 'ટ્ર', // Fallback replacement in forward logic
  'Ù': 'ડ્ર',
  'Ú': 'ઢ્ર',
  'Ý': 'હ્ર',
  'Þ': 'હ્ન',
  'ß': 'હ્લ',
  'à': 'સ્ત્ર',
  'â': 'શ્ન',
  'ã': 'હૃ',
  'å': 'ખ્ર',
  '\\': '\u0acd\u0ab0', // reph
  '±': 'ક્',
  '²': 'ખ્',
  '³': 'ગ્',
  '´': 'ઘ્',
  'µ': 'ચ્',
  '¶': 'જ્',
  '·': 'ણ્',
  'R': 'ત્',
  '¹': 'થ્',
  'º': 'ન્', // mapping conflict for º -> ધ્ and ન્. Favoring ન્ due to frequency.
  '¼': 'પ્',
  'f`': 'ફ્',
  '¾': 'બ્',
  '¿': 'ભ્',
  'À': 'મ્',
  'Á': 'ય્',
  'Ã': 'લ્',
  'Ä': 'વ્',
  'Æ': 'શ્',
  'O': 'ષ્',
  'A': 'સ્',
  'Ç': 'ળ્'
};

const REPH_CHAR = '<';

export function convertHarikrishnaTemplateToUnicode(legacyText) {
  if (!legacyText) return '';

  let s = legacyText;
  
  // Create a combined sorted list of all multi-character and single-character keys to replace
  // from longest to shortest to avoid partial replacements.
  // Wait, directly mapping strings character by character is safer because some matras reuse letters like 'i', 'a'
  
  let out = '';
  for (let i = 0; i < s.length;) {
    // Check 3-char matches
    let match3 = s.slice(i, i + 3);
    if (REVERSE_INDEPENDENT_VOWELS[match3]) {
      out += REVERSE_INDEPENDENT_VOWELS[match3];
      i += 3; continue;
    }

    // Check 2-char matches
    let match2 = s.slice(i, i + 2);
    if (REVERSE_INDEPENDENT_VOWELS[match2]) {
      out += REVERSE_INDEPENDENT_VOWELS[match2];
      i += 2; continue;
    }
    if (REVERSE_MATRAS[match2]) {
      out += REVERSE_MATRAS[match2];
      i += 2; continue;
    }
    if (REVERSE_CONJUNCTS[match2]) {
      out += REVERSE_CONJUNCTS[match2];
      i += 2; continue;
    }

    // Check 1-char matches
    let ch = s[i];
    
    if (ch === REPH_CHAR) {
      // Reph will be moved positionally later
      out += '\u0ab0\u0acd'; 
      i += 1; continue;
    }

    if (REVERSE_CONJUNCTS[ch]) {
      out += REVERSE_CONJUNCTS[ch];
      i += 1; continue;
    }

    if (ch === '`') {
      // Wait, '`' can be Virama or part of matra/vowel.
      // If it hasn't been matched by a 2-char matra, it's either a standalone matra (ૅ) or Virama.
      // In original: if (ch === VIRAMA) out += '`'.
      // But MATRA_KEYS['\u0ac5'] = '`'. So '`' -> \u0ac5 or \u0acd. We'll default to \u0acd (Virama) 
      // if it follows a consonant, but \u0ac5 is 'ૅ' which is used less often standalone than Virama.
      // Wait, actually, let's map '`' to VIRAMA \u0acd for now. 
      out += VIRAMA;
      i += 1; continue;
    }

    if (REVERSE_DIGITS[ch]) {
      out += REVERSE_DIGITS[ch];
      i += 1; continue;
    }

    if (REVERSE_INDEPENDENT_VOWELS[ch]) {
      out += REVERSE_INDEPENDENT_VOWELS[ch];
      i += 1; continue;
    }

    if (REVERSE_CONSONANTS[ch]) {
      out += REVERSE_CONSONANTS[ch];
      i += 1; continue;
    }

    if (REVERSE_MATRAS[ch]) {
      out += REVERSE_MATRAS[ch];
      i += 1; continue;
    }

    // Unmapped character
    out += ch;
    i += 1;
  }

  // Now perform positional corrections.
  // In Harikrishna template, short-i '(' -> '\u0abf' was originally typed BEFORE the consonant cluster.
  // In Unicode, it must be placed AFTER the consonant cluster.
  // We need to move '\u0abf' from before the consonant cluster to after it.
  
  const fullConsonant = '[\\u0a95-\\u0ab9\\u0a85-\\u0a94]';
  const virama = '\\u0acd';
  const clusterRegex = new RegExp('\\u0abf((' + fullConsonant + virama + ')*' + fullConsonant + ')', 'g');
  out = out.replace(clusterRegex, '$1\u0abf');

  // Reph mapping: Originally, reph `\u0ab0\u0acd` was typed AFTER the base consonant and its matras.
  // In Unicode, reph `\u0ab0\u0acd` MUST appear BEFORE the consonant cluster.
  // So we match `(ConsonantCluster)(Matras)(\u0ab0\u0acd)` and replace with `\u0ab0\u0acd(ConsonantCluster)(Matras)`.
  const matras = '[\\u0abe-\\u0acc\\u0a81-\\u0a83]*';
  const consWithMatraRegex = new RegExp('((' + fullConsonant + virama + ')*' + fullConsonant + ')' + '(' + matras + ')\\u0ab0\\u0acd', 'g');
  out = out.replace(consWithMatraRegex, '\u0ab0\u0acd$1$2');

  return out.normalize('NFC');
}
