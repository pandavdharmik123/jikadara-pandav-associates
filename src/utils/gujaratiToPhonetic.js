const PHONETIC_CONSONANTS = {
  'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng', 'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'ny',
  'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n', 'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
  'પ': 'p', 'ફ': 'f', 'બ': 'b', 'ભ': 'bh', 'મ': 'm', 'ય': 'y', 'ર': 'r', 'લ': 'l', 'ળ': 'l', 'વ': 'v',
  'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h', 'ક્ષ': 'ksh', 'જ્ઞ': 'gn'
};

const PHONETIC_INDEPENDENT_VOWELS = {
  'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo', 'ઋ': 'ru',
  'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au', 'ઍ': 'a', 'ઑ': 'o'
};

const PHONETIC_MATRAS = {
  '\u0abe': 'a',  // ા
  '\u0abf': 'i',  // િ
  '\u0ac0': 'ee', // ી
  '\u0ac1': 'u',  // ુ
  '\u0ac2': 'oo', // ૂ
  '\u0ac3': 'ru', // ૃ
  '\u0ac5': 'a',  // ૅ
  '\u0ac7': 'e',  // ે
  '\u0ac8': 'ai', // ૈ
  '\u0ac9': 'o',  // ૉ
  '\u0acb': 'o',  // ો
  '\u0acc': 'au', // ૌ
  '\u0a81': 'n',  // ઁ (anusvara)
  '\u0a82': 'n',  // ં (anusvara)
  '\u0a83': 'h'   // ઃ (visarga)
};

const VIRAMA = '\u0acd';

export function convertUnicodeToPhonetic(unicodeText) {
  if (!unicodeText) return '';

  let out = '';
  let i = 0;
  while (i < unicodeText.length) {
    let ch = unicodeText[i];
    
    // Check if it's a consonant
    if (PHONETIC_CONSONANTS[ch]) {
      out += PHONETIC_CONSONANTS[ch];
      
      // Look ahead to see if it's followed by a matra, virama, or another character
      let nextCh = unicodeText[i + 1];
      
      if (nextCh === VIRAMA) {
        // It's a half consonant, don't add the implicit 'a'
        i += 2; // Skip consonant and virama
      } else if (PHONETIC_MATRAS[nextCh]) {
        // It's followed by a matra, the matra will be added in the next iteration
        // Actually, we can just process it in the next loop iteration, so do nothing here.
        i++;
      } else {
        // Implicit 'a' for full consonant
        // However, at the end of a word, 'a' is often dropped in Gujarati transliteration
        // Let's check if it's the end of the word or string
        let isEndOfWord = (i === unicodeText.length - 1) || /\s|[.,!?]/.test(nextCh);
        if (!isEndOfWord) {
          out += 'a';
        }
        i++;
      }
    } else if (PHONETIC_INDEPENDENT_VOWELS[ch]) {
      out += PHONETIC_INDEPENDENT_VOWELS[ch];
      i++;
    } else if (PHONETIC_MATRAS[ch]) {
      out += PHONETIC_MATRAS[ch];
      i++;
    } else {
      out += ch;
      i++;
    }
  }

  return out;
}
