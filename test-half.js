const CONJUNCTS = {
  // Existing conjuncts
  'ઠ્ઠ': 'Î', // \u00ce
  'દ્ર': 'W', 
  'ન્': 'º', // \u00ba (half na)
  'શ્ર': '~',
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
  'દ્ય': 'O', 
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
  // general reph below (્ર) -> ^
  '\u0acd\u0ab0': '^',

  // NEW Half consonants from Image 3
  'ક્': '±', // 177 \u00b1
  'ખ્': '²', // 178 \u00b2
  'ગ્': '³', // 179 \u00b3
  'ઘ્': '´', // 180 \u00b4
  'ચ્': 'µ', // 181 \u00b5
  'જ્': '¶', // 182 \u00b6
  'ણ્': '·', // 183 \u00b7
  'ત્': '¸', // 184 \u00b8
  'થ્': '¹', // 185 \u00b9
  // 'ન્': 'º', // 186 \u00ba (already above)
  'પ્': '»', // 187 \u00bb
  'બ્': '¼', // 188 \u00bc
  // 189 skipped?
  'ભ્': '¾', // 190 \u00be
  'મ્': '¿', // 191 \u00bf
  'ય્': 'À', // 192 \u00c0
  'લ્': 'Á', // 193 \u00c1
  'વ્': 'Â', // 194 \u00c2
  'શ્': 'Ã', // 195 \u00c3
  'ષ્': 'Ä', // 196 \u00c4
  'સ્': 'Å', // 197 \u00c5
};

// ... we will test if we can properly replace "હેલ્લ્લો" with these.
function reorderAndSubstitute(text) {
  let s = text.normalize('NFC');
  for (const [conj, rep] of Object.entries(CONJUNCTS)) {
    s = s.split(conj).join(rep);
  }
  return s;
}

console.log(reorderAndSubstitute("હેલ્લ્લો"));
