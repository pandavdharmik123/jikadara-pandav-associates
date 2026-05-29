const CONSONANT_KEYS = {
  ક: 'k', ખ: 'K', ગ: 'g', ઘ: 'G', ઙ: '|', ચ: 'c', છ: 'C', જ: 'j', ઝ: 'z', ઞ: 'Z',
  ટ: 'T', ઠ: 'q', ડ: 'D', ઢ: 'Q', ણ: 'N', ત: 't', થ: 'Y', દ: 'd', ધ: 'F', ન: 'n',
  પ: 'p', ફ: 'f', બ: 'b', ભ: 'B', મ: 'm', ય: 'y', ર: 'r', લ: 'l', ળ: 'L', વ: 'v',
  શ: 'S', ષ: 'P', સ: 's', હ: 'h', ક્ષ: 'x', જ્ઞ: 'X',
};

const INDEPENDENT_VOWEL_KEYS = {
  અ: 'a', આ: 'A', ઇ: 'e', ઈ: 'E', ઉ: 'o', ઊ: 'O', ઋ: 'R', એ: 'a[', ઐ: 'a]', ઓ: 'ai[', ઔ: 'ai]', ઍ: 'a`', ઑ: 'ai`',
};

const MATRA_KEYS = {
  '\u0abe': 'i', // ા
  '\u0abf': '(', // િ
  '\u0ac0': ')', // ી
  '\u0ac1': 'u', // ુ (fallback)
  '\u0ac2': 'U', // ૂ (fallback)
  '\u0ac3': 'R', // ૃ
  '\u0ac5': '`', // ૅ
  '\u0ac7': '[', // ે
  '\u0ac8': ']', // ૈ
  '\u0ac9': 'i`', // ૉ
  '\u0acb': 'i[', // ો
  '\u0acc': 'i]', // ૌ
  '\u0a81': 'M', // ઁ
  '\u0a82': '>', // ં
  '\u0a83': '#', // ઃ
};

const CONJUNCTS = {
  'ઠ્ઠ': 'Î', // \u0aa0\u0acd\u0aa0
  'દ્ર': 'W', // \u0aa6\u0acd\u0ab0
  'ન્': 'º', // \u0aa8\u0acd
  'શ્ર': '~',
  'હ્ય': 'H',
  'હ્મ': 'M',
  'દ્વ': 'o',
  'શ્વ': 'V',
  'દ્ધ': 'w',
  'ત્ર': 'Ò',
  'ક્ષ': 'x',
  'જ્ઞ': 'X',
};

// Map values back to their original characters to construct regex correctly
const REPH = '<';
const VIRAMA = '\u0acd';

function convert(gujaratiUnicode) {
  if (!gujaratiUnicode) return '';
  let s = gujaratiUnicode.normalize('NFC');
  
  // 1. Substitute Conjuncts first
  for (const [conj, rep] of Object.entries(CONJUNCTS)) {
    s = s.split(conj).join(rep);
  }
  
  // Now iterate and convert to keys
  let out = '';
  for (let i = 0; i < s.length; ) {
    const ch = s[i];

    if (CONJUNCTS[ch] || Object.values(CONJUNCTS).includes(ch)) {
      out += ch; i += 1; continue;
    }

    if (ch === VIRAMA) { out += '`'; i += 1; continue; }
    if (INDEPENDENT_VOWEL_KEYS[ch]) { out += INDEPENDENT_VOWEL_KEYS[ch]; i += 1; continue; }
    if (CONSONANT_KEYS[ch]) { out += CONSONANT_KEYS[ch]; i += 1; continue; }
    if (MATRA_KEYS[ch]) { out += MATRA_KEYS[ch]; i += 1; continue; }
    out += ch;
    i += 1;
  }
  
  // Post-process the converted Latin string to handle Reph and Short I
  // In our translated string:
  // ર્ is `r`` -> wait, no! 'ર' + '્' -> 'r' + '`'. We want it to be '<' (Reph).
  // Let's replace `r`` with `<` BEFORE reordering!
  out = out.replace(/r`/g, '<');
  
  // Now we need to move `(` (short i) to the start of its syllable
  // A syllable is: (Consonant/Conjunct) + (Matras)* + (Reph)?
  // We want to move `(` to BEFORE the Consonant.
  // Consonants are roughly: [a-zA-Z\|ºÎW~HMoVwÒ] (any letter that isn't a matra)
  // Let's just use a naive approach: any contiguous block of non-matras
  // Actually, standard regex for `(Consonant)(<)?(\()` -> `((Consonant)(<)?`
  // Wait, in `Fi(m<k`: `m` is consonant, `<` is reph, `(` is matra.
  // Originally it translates to `F` `i` `<` `m` `(`.
  // We want `Fi` + `(` + `m` + `<`.
  // Wait, `r`+`\`` translates to `<`. So `ધાર્મિક` -> `F` `i` `<` `m` `(`.
  // If we have `<` (reph) followed by `m` (consonant) followed by `(` (matra),
  // `<` `m` `(` -> `(` `m` `<`.
  // Let's write a regex for: Reph `<` + Consonant `[a-zA-Z\|ºÎW~HMoVwÒ]` + Matra `\(`
  // Wait, what if there's no Reph? `m` `(` -> `(` `m`.
  
  // Step A: move `<` (Reph) to AFTER the consonant and its matras.
  // So `<` followed by a consonant (and optional matras EXCEPT `(`) -> consonant + matras + `<`.
  // Wait, `(` should be moved to BEFORE the consonant!
  // Let's do `(` first.
  // Any consonant + `(` -> `(` + consonant.
  out = out.replace(/([a-zA-Z\|ºÎW~HMoVwÒ])\(/g, '($1');
  
  // If there's a Reph `<` before the `(`, it should become `( < consonant` ? No, `( consonant <`.
  // Let's look at `<` + `(` + consonant -> `(` + consonant + `<`.
  out = out.replace(/<\(([a-zA-Z\|ºÎW~HMoVwÒ])/g, '($1<');
  
  // If `<` + consonant -> consonant + `<`.
  out = out.replace(/<([a-zA-Z\|ºÎW~HMoVwÒ])/g, '$1<');
  
  return out;
}

console.log("ધાર્મિક:", convert("ધાર્મિક")); // Fi(m<k
console.log("ચન્દ્રેશ:", convert("ચન્દ્રેશ")); // cºW[S
console.log("ચંદ્રેશ:", convert("ચંદ્રેશ")); // c>W[S
console.log("વિઠ્ઠલ:", convert("વિઠ્ઠલ")); // (vÎl
