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
  // Reph is ર્ which is \u0ab0\u0acd
};

function reorderAndConvert(text) {
  let s = text.normalize('NFC');
  
  // Replace Conjuncts first
  for (const [conj, rep] of Object.entries(CONJUNCTS)) {
    s = s.split(conj).join(rep);
  }
  
  // Now we have a string with mixed Unicode and some latin chars (our conjunct placeholders)
  // Let's define what a "consonant" is in this mixed string:
  // It's any Gujarati consonant OR one of our placeholder latin chars.
  const consRegex = '([\u0a95-\u0ab9xXÎWº~HMoVwÒ])';
  
  // Reph is \u0ab0\u0acd. It always comes BEFORE the base consonant in Unicode.
  // We want to move Reph to AFTER the consonant and its matras.
  // A matra could be any Gujarati vowel sign \u0abe-\u0acc or anusvara \u0a81-\u0a83.
  const matraRegex = '([\u0abe-\u0acc\u0a81-\u0a83]*)';
  
  // Move Reph AFTER consonant + matras
  // Reph (\u0ab0\u0acd) + Consonant + Matras -> Consonant + Matras + Reph
  let rephRegex = new RegExp('\u0ab0\u0acd' + consRegex + matraRegex, 'g');
  s = s.replace(rephRegex, '$1$2\u0ab0\u0acd');
  
  // Move Short I (\u0abf) BEFORE the consonant (and its conjunct components)
  // In Unicode, Short I comes AFTER the consonant it modifies.
  // Consonant + Matra(s including \u0abf) -> \u0abf + Consonant + (other matras)
  // Actually, just swap Consonant and \u0abf.
  let shortIRegex = new RegExp(consRegex + '\u0abf', 'g');
  s = s.replace(shortIRegex, '\u0abf$1');
  // Wait! What if there are multiple consonants joined by virama? e.g. વિઠ્ઠલ where ઠ્ઠ is Î.
  // We already replaced ઠ્ઠ with Î. So Î + \u0abf -> \u0abf + Î. This works!
  // What about સ્ત્રિ (સ્ + ત્ર + િ)? We replaced ત્ર with Ò. So સ્ + ્ + Ò + િ.
  // We need to move \u0abf to the beginning of the WHOLE cluster!
  // Cluster = (Consonant + Virama)* + Consonant
  const clusterRegex = '((?:[\u0a95-\u0ab9xXÎWº~HMoVwÒ]\u0acd)*[\u0a95-\u0ab9xXÎWº~HMoVwÒ])';
  let shortIClusterRegex = new RegExp(clusterRegex + '\u0abf', 'g');
  s = s.replace(shortIClusterRegex, '\u0abf$1');
  
  return s;
}

const words = ["ધાર્મિક", "ચન્દ્રેશ", "ચંદ્રેશ", "વિઠ્ઠલ"];
words.forEach(w => {
  let reordered = reorderAndConvert(w);
  // Now transliterate
  const MATRAS = {'\u0abe':'i', '\u0abf':'(', '\u0ac0':')', '\u0ac7':'[', '\u0a82':'>'};
  const CONS = {'ધ':'F', 'મ':'m', 'ક':'k', 'ચ':'c', 'શ':'S', 'વ':'v', 'લ':'l'};
  const REPH_KEY = '<';
  
  let out = '';
  for(let i=0; i<reordered.length; i++) {
    let c = reordered[i];
    if (c === '\u0ab0' && reordered[i+1] === '\u0acd') { out += REPH_KEY; i++; }
    else if (MATRAS[c]) out += MATRAS[c];
    else if (CONS[c]) out += CONS[c];
    else out += c; // fallback (like Î, º, W)
  }
  console.log(w, "->", out);
});
