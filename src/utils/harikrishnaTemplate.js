/**
 * Unicode Gujarati → legacy keystrokes for the Harikrishna font family
 * (Harikrishna, Nilkanth, Ghanshyam, Yogi, etc. — same keyboard template per anirdesh.com).
 *
 * It maps Gujarati Unicode to phonetic-style ASCII like:
 * "ધાર્મિક" → Fi(m<k
 */

const VIRAMA = '\u0acd';

const CONSONANT_KEYS = {
  ક: 'k', ખ: 'K', ગ: 'g', ઘ: 'G', ઙ: '|', ચ: 'c', છ: 'C', જ: 'j', ઝ: 'z', ઞ: 'Z',
  ટ: 'T', ઠ: 'q', ડ: 'D', ઢ: 'Q', ણ: 'N', ત: 't', થ: 'Y', દ: 'd', ધ: 'F', ન: 'n',
  પ: 'p', ફ: 'f', બ: 'b', ભ: 'B', મ: 'm', ય: 'y', ર: 'r', લ: 'l', ળ: 'L', વ: 'v',
  શ: 'S', ષ: 'P', સ: 's', હ: 'h', ક્ષ: 'x', જ્ઞ: 'X',
};

const INDEPENDENT_VOWEL_KEYS = {
  અ: 'a', આ: 'ai', ઇ: 'e', ઈ: 'E', ઉ: 'u', ઊ: 'O', ઋ: 'Z',
  એ: 'a[', ઐ: 'a]', ઓ: 'ai[', ઔ: 'ai]', ઍ: 'a`', ઑ: 'ai`',
};

const MATRA_KEYS = {
  '\u0abe': 'i', // ા
  '\u0abf': '(', // િ
  '\u0ac0': ')', // ી
  '\u0ac1': '&', // ુ (short-u)
  '\u0ac2': '*', // ૂ (long-u)
  '\u0ac3': 'Z', // ૃ
  '\u0ac5': '`', // ૅ
  '\u0ac7': '[', // ે
  '\u0ac8': ']', // ૈ
  '\u0ac9': 'i`', // ૉ
  '\u0acb': 'i[', // ો
  '\u0acc': 'i]', // ૌ
  '\u0a81': 'M', // ઁ
  '\u0a82': '>', // ં
  '\u0a83': ':', // ઃ
};

const DIGIT_KEYS = {
  '(': '{', ')': '}',
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
  '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9',
};

const CONJUNCTS = {
  'રૂ': '$',
  'જી': 'J',
  'ઠ્ઠ': 'Î', // \u00ce
  'દ્ર': 'W',
  'શ્ર': '~',
  'ક્ષ': 'x',
  'જ્ઞ': 'X',
  'હ્ય': 'H',
  'હ્મ': 'M',
  'દ્વ': 'o',
  'શ્વ': 'V',
  'દ્ધ': 'w',
  'ત્ર': 'Ò', // \u00d2
  'ક્ક': 'Ê', // \u00ca
  'દ્ગ': 'Ë', // \u00cb
  'જ્જ': 'Ì', // \u00cc
  'ટ્ટ': 'Í', // \u00cd
  'ડ્ડ': 'Ï', // \u00cf
  'ઢ્ઢ': 'Ð', // \u00d0
  'દ્દ': 'Ñ', // \u00d1
  'દ્ય': 'w',
  'ષ્ટ': 'Ö', // \u00d6
  'ષ્ઠ': '×', // \u00d7
  'ટ્ર': 'Ø', // \u00d8
  'ડ્ર': 'Ù', // \u00d9
  'ઢ્ર': 'Ú', // \u00da
  'હ્ર': 'Ý', // \u00dd
  'હ્ન': 'Þ', // \u00de
  'હ્લ': 'ß', // \u00df
  'સ્ત્ર': 'à', // \u00e0
  'શ્ન': 'â', // \u00e2
  'હૃ': 'ã', // \u00e3
  'ખ્ર': 'å', // \u00e5
  // general reph below (્ર) -> \
  '\u0acd\u0ab0': '\\',
  // Half consonants (Table 3)
  'ક્': '±', // 177 \u00b1
  'ખ્': '²', // 178 \u00b2
  'ગ્': '³', // 179 \u00b3
  'ઘ્': '´', // 180 \u00b4
  'ચ્': 'µ', // 181 \u00b5
  'જ્': '¶', // 182 \u00b6
  'ણ્': '·', // 183 \u00b7
  'ત્': 'R', // Half ta
  'થ્': '¹', // 185 \u00b9
  'ધ્': 'º', // 186 \u00ba
  'ન્': 'º', // 187 \u00bb
  'પ્': '¼', // 188 \u00bc
  'ફ્': 'f`', // 189 \u00bd
  'બ્': '¾', // 190 \u00be
  'ભ્': '¿', // 191 \u00bf
  'મ્': 'À', // 192 \u00c0
  'ય્': 'Á', // 193 \u00c1
  'લ્': 'Ã', // 194 \u00c2
  'વ્': 'Ä', // 195 \u00c3
  'શ્': 'Æ', // 196 \u00c4
  'ષ્': 'O', // 197 \u00c5
  'સ્': 'A', // 198 \u00c6
  'ળ્': 'Ç'  // 199 \u00c7
};

const REPH_CHAR = '<';

function reorderAndSubstitute(text) {
  let s = text.normalize('NFC');

  // 1. Substitute complex conjuncts first
  for (const [conj, rep] of Object.entries(CONJUNCTS)) {
    s = s.split(conj).join(rep);
  }

  // Define consonant regex groups
  const fullConsonant = '[\\u0a95-\\u0ab9xXÎW~HMoVwÒÊËÌÍÏÐÑÖ×ØÙÚÝÞßàâãå\\$]';
  const halfConsonant = '(?:[\\u00b1-\\u00c7AOR]|f\\`)';
  const clusterPiece = '(?:' + fullConsonant + '\\u0acd|' + halfConsonant + ')';

  // A complete cluster is zero or more clusterPieces followed by a final full consonant
  const consRegex = '(' + clusterPiece + '*' + fullConsonant + ')';
  const matraRegex = '([\\u0abe-\\u0acc\\u0a81-\\u0a83]*)';

  // 2. Move Reph (\u0ab0\u0acd) AFTER the base consonant and its matras
  let rephRegex = new RegExp('\\u0ab0\\u0acd' + consRegex + matraRegex, 'g');
  s = s.replace(rephRegex, '$1$2' + REPH_CHAR);

  // 3. Move Short I (\u0abf) BEFORE the entire consonant cluster
  const clusterRegex = '(' + clusterPiece + '*' + fullConsonant + ')';
  let shortIRegex = new RegExp(clusterRegex + '\\u0abf', 'g');
  s = s.replace(shortIRegex, '\u0abf$1');

  return s;
}

export function convertUnicodeToHarikrishnaTemplate(gujaratiUnicode) {
  if (!gujaratiUnicode) return '';

  let s = reorderAndSubstitute(gujaratiUnicode);
  let out = '';

  for (let i = 0; i < s.length;) {
    const ch = s[i];

    if (ch === REPH_CHAR) {
      out += REPH_CHAR; i += 1; continue;
    }

    // Check if it's already one of our substituted latin placeholders
    if (Object.values(CONJUNCTS).includes(ch)) {
      if (ch === 'Ø') {
        out += 'T^';
      } else if (ch === 'Ò') {
        out += '#i';
      } else {
        out += ch;
      }
      i += 1; continue;
    }

    if (ch === VIRAMA) {
      out += '`'; i += 1; continue;
    }

    if (DIGIT_KEYS[ch]) {
      out += DIGIT_KEYS[ch]; i += 1; continue;
    }

    if (INDEPENDENT_VOWEL_KEYS[ch]) {
      out += INDEPENDENT_VOWEL_KEYS[ch]; i += 1; continue;
    }

    if (CONSONANT_KEYS[ch]) {
      out += CONSONANT_KEYS[ch]; i += 1; continue;
    }

    if (MATRA_KEYS[ch]) {
      out += MATRA_KEYS[ch]; i += 1; continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

export function convertUnicodeToGhanshyamLegacy(gujaratiUnicode) {
  return convertUnicodeToHarikrishnaTemplate(gujaratiUnicode);
}
