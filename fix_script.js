const fs = require('fs');

const CONJUNCTS = {
  // Half consonants
  'ક્': '\\u00ac', // 00AC
  'ખ્': '\\u00ad', // 00AD
  'ગ્': '\\u00ae', // 00AE
  'ઘ્': '\\u00af', // 00AF
  'ચ્': '\\u00b0', // 00B0
  'જ્': '\\u00b1', // 00B1
  'ણ્': '\\u00b2', // 00B2
  'ત્': '\\u00b3', // 00B3
  'થ્': '\\u00b4', // 00B4
  'ન્': '\\u00b5', // 00B5
  'પ્': '\\u00b6', // 00B6
  'ફ્': '\\u00b7', // 00B7
  'બ્': '\\u00b8', // 00B8
  'ભ્': '\\u00b9', // 00B9
  'મ્': '\\u00ba', // 00BA
  'ય્': '\\u00bb', // 00BB
  'લ્': '\\u00bc', // 00BC
  'વ્': '\\u00bd', // 00BD
  'શ્': '\\u00be', // 00BE
  'ષ્': '\\u00bf', // 00BF
  'સ્': '\\u00c0', // 00C0

  // Conjuncts Row 6
  'દ્વ': '\\u00c1', // 00C1
  'શ્વ': '\\u00c2', // 00C2
  'દ્ધ': '\\u00c3', // 00C3
  'જ્જ': '\\u00c4', // 00C4
  'ક્ક': '\\u00c5', // 00C5
  'ષ્ટ': '\\u00c6', // 00C6
  'ષ્ઠ': '\\u00c7', // 00C7

  // Conjuncts Row 7
  'ટ્ટ': '\\u00c8', // 00C8
  'ઠ્ઠ': '\\u00c9', // 00C9
  'ડ્ડ': '\\u00ca', // 00CA
  'ઢ્ઢ': '\\u00cb', // 00CB
  'દ્દ': '\\u00cc', // 00CC
  'જ્ઞ': '\\u00cd', // 00CD
  'ક્ષ': '\\u00ce', // 00CE
  'શ્ર': '\\u00cf', // 00CF
  'હ્ય': '\\u00d0', // 00D0
  'હ્મ': '\\u00d1', // 00D1
  'દ્ય': '\\u00d2', // 00D2
  'ટ્ર': '\\u00d3', // 00D3
  'ડ્ર': '\\u00d4', // 00D4
  'ઢ્ર': '\\u00d5', // 00D5
  'દ્ર': '\\u00d6', // 00D6
  'હ્ર': '\\u00d8', // 00D8
  'હ્ન': '\\u00d9', // 00D9
  'હ્લ': '\\u00da', // 00DA
  'સ્ત્ર': '\\u00db', // 00DB
  'શ્ન': '\\u00dd', // 00DD
  'હૃ': '\\u00de', // 00DE
  'ત્ર': '\\u00df', // 00DF
  'ખ્ર': '\\u00e0', // 00E0
  
  // general reph below (્ર)
  '\\u0acd\\u0ab0': '^',
};

let conjunctString = '{\n';
for (const [key, value] of Object.entries(CONJUNCTS)) {
  conjunctString += `  '${key}': '${value}',\n`;
}
conjunctString += '}';

// Now update harikrishnaTemplate.js
let content = fs.readFileSync('src/utils/harikrishnaTemplate.js', 'utf8');

// Replace CONJUNCTS object completely
content = content.replace(/const CONJUNCTS = \{[\s\S]*?\};/, `const CONJUNCTS = ${conjunctString};`);

// Also update the regex to include all characters from \u00ac to \u00e0
const regexStr = '([\\\\u0a95-\\\\u0ab9xX\\\\u00ac-\\\\u00e0])';
content = content.replace(/const consRegex = '.*';/, `const consRegex = '${regexStr}';`);
content = content.replace(/const clusterRegex = '\(\(\?\:\[.*\]\\\\u0acd\)\*\[.*\]\)';/, `const clusterRegex = '((?:[\\\\u0a95-\\\\u0ab9xX\\\\u00ac-\\\\u00e0]\\\\u0acd)*[\\\\u0a95-\\\\u0ab9xX\\\\u00ac-\\\\u00e0])';`);

fs.writeFileSync('src/utils/harikrishnaTemplate.js', content, 'utf8');
