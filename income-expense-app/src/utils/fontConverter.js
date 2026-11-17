// Unicode Gujarati → Gopika-style legacy bytes (custom Latin-1 / extended chars), e.g. કેમ → "fu{".
// For Harikrishna-template ASCII keystrokes (કેમ → "k[m", fontconverter-style), use convertUnicodeToGhanshyamLegacy in harikrishnaTemplate.js (re-exported from ghanshyamLegacy.js).

const MAPPING_TABLE = [
  "ૐ", "H",
  "ઈં", "#",
  "ઇં", "$",
  "ઉં", "ô",
  "ઊં", "Ÿ",
  "અ", "y",
  "આ", "yt",
  "ઇ", "R",
  "ઈ", "E",
  "ઉ", "W",
  "ઊ", "Q",
  "ઋ", "É",
  "ઝ્ર", "C",
  "ઌ", "Ý",
  "એ", "yu",
  "ઐ", "yi",
  "ઓ", "ytu",
  "ઔ", "yti",
  "ઍ", "yì",
  "ઑ", "ytì",
  "સ્ત્ર્", "MºtT",
  "સ્ત્ર", "Mºt",
  "ક્ષ્", "ûtT",
  "ત્ર્", "ºtT",
  "જ્ઞ્", "¿tT",
  "ક્ષ", "ût",
  "ત્ર", "ºt",
  "જ્ઞ", "¿t",
  "ટ્રુ", "x›",
  "ટ્રૂ", "x‰",
  "ટ્ર", "xÙ",
  "ડ્રુ", "z›",
  "ડ્રૂ", "z‰",
  "ડ્ર", "zÙ",
  "જ્રુ", "@w",
  "જ્રૂ", "@q",
  "જ્રા", "@t",
  "જ્ર", "@",
  "સ્ર્", "²tT",
  "સ્ર", "²t",
  "પ્ર", "«",
  "દ્ર", "ÿ",
  "શ્ર્વ", "©Tð",
  "શ્ર", "©",
  "ક્ર", "¢",
  "ફ્ર", "£",
  "હ્ર", "´",
  "્ર", "ú",
  "ક્ન", "õ™",
  "ટ્ટ", "è",
  "ટ્ઠ", "a",
  "ડ્ડ", "œ",
  "ત્ન", "J",
  "દૃ", "á",
  "ઢ્ઢ", "ë",
  " ", " ",
  "ડ્ઢ", "D",
  "હ્ન", "ö",
  "હྱ્", "ÌtT",
  "હ્ય", "Ìt",
  "શ્ન", "§",
  "ઙ્ક", "Ñ",
  "ઙ્ખ", "Ö",
  "ઙ્ગ", "Ü",
  "ઙ્ઘ", "d",
  "હ્ણ", "nTý",
  "હ્મ", "ñ",
  "હ્વ", "b",
  "દ્ઘ", "j",
  "દ્બ", "m",
  "દ્ભ", "K",
  "દ્મ", "È",
  "દ્વ", "î",
  "ઠ્ઠ", "ê",
  "દ્ગ", "N",
  "દ્ધ", "Ø",
  "ન્ન્", "ÒtT",
  "ન્ન", "Òt",
  "પ્ત", "ó",
  "પ્ન", "¡",
  "જી", "S",
  "જા", "ò",
  "ત્ત્", "¥tT",
  "ત્ત", "¥t",
  "ષ્ટ", "ü",
  "ષ્ઠ", "c",
  "શ્ચ", "ù",
  "શ્વ", "ï",
  "સ્ન્", "M™T",
  "સ્ન", "M™",
  "દ્દ", "Æ",
  "હૃ", "Ó",
  "ક્ક", "¬",
  "દ્ય", "ã",
  "ક્", "õ",
  "ખ્", "Ï",
  "ગ્", "ø",
  "ઘ્", "Î",
  "ઝ઼", "Í|",
  "ચ્", "å",
  "જ્", "ß",
  "ઞ્", "Å",
  "ણ્", "Û",
  "ત્", "í",
  "થ્", "Ú",
  "ધ્", "æ",
  "ન્", "L",
  "પ્", "Ã",
  "ફ્", "^",
  "બ્", "ç",
  "ભ્", "Ç",
  "મ્", "B",
  "ય્", "G",
  "લ્", "Õ",
  "વ્", "Ô",
  "શ્", "~",
  "સ્", "M",
  "ષ્", "»",
  "હ્", "nT",
  "ળ્", "é",
  "ણુ", "ýw",
  "ણૂ", "ýq",
  "ફુ", "Vw",
  "ફૂ", "Vq",
  "રુ", "Á",
  "રૂ", "Y",
  "ફ઼", "V|",
  "ક", "f",
  "ખ", "¾",
  "ગ", "„",
  "ઘ", "½",
  "ઙ", "Ê",
  "ચ", "[",
  "છ", "A",
  "જ", "s",
  "ઝ્", "ÍT",
  "ઝ", "Í",
  "ઞ", "Åt",
  "ટ", "x",
  "ઠ", "X",
  "ડ", "z",
  "ઢ", "Z",
  "ણ", "ý",
  "ત", "‚",
  "થ", "Út",
  "દ", "Œ",
  "ધ", "Ä",
  "ન", "™",
  "પ", "…",
  "ફ", "V",
  "બ", "ƒ",
  "ભ", "¼",
  "મ", "{",
  "ય", "Þ",
  "ર", "h",
  "લ", "÷",
  "વ", "ð",
  "શ", "þ",
  "ષ", "»t",
  "સ", "Ë",
  "હ", "n",
  "ળ", "¤",
  "઼", "|",
  "ૅં", "ìk",
  "ા", "t",
  "ૅ", "ì",
  "ૉ", "tì",
  "ીં", "ª",
  "ી", "e",
  "ુ", "w",
  "ૂ", "q",
  "ૃ", "]",
  "ે", "u",
  "ૈ", "i",
  "ો", "tu",
  "ૌ", "ti",
  "ઁ", "P",
  "ં", "k",
  "ઃ", ":",
  "ઽ", "à",
  "્", "T",
  "ëm", "ëm",
  "।", ">",
  "‘", "‘",
  "’", "’",
  "૦", "0",
  "૧", "1",
  "૨", "2",
  "૩", "3",
  "૪", "4",
  "૫", "5",
  "૬", "6",
  "૭", "7",
  "૮", "8",
  "૯", "9"
];

export function convertUnicodeToNilkanth(inputText) {
  if (!inputText) return "";

  let text = inputText;

  // Reorder conjunct/vowels and special symbols
  text = text.replace(/ત્ર્/g, "ºtT");
  text = text.replace(/શ્ર્/g, "©T");
  text = text.replace(/ર્/g, "hT");
  text = text.replace(/ºtT/g, "ત્ર્");
  text = text.replace(/©T/g, "શ્ર્");

  // Adjust position of short-i matra (િ)
  text = text.replace(/િં/g, "®");
  text = text.replace(/િ/g, "r");
  text = text.replace(/ર્િ/g, "Š");

  // Move "r" (િ) before consonant groups
  text = text.replace(
    /([કખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલવશષસહળ દ્ર દ્]*)([ક્ દ્ર દ્ ખ્ ગ્ ઘ્ ઝ઼ ચ્ જ્ ઞ્ ણ્ ત્ થ્ ધ્ ન્ પ્ ફ્ બ્ ભ્ મ્ ય્ લ્ વ્ શ્ સ્ ષ્ હ્ ળ્])([કખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલવશષસહળ])([r])/g,
    "$4$1$2$3"
  );
  text = text.replace(/([કખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલવશષસહળ])([r])/g, "$2$1");
  text = text.replace(/([કખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલવશષસહળ])([®])/g, "$2$1");
  text = text.replace(/([કખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલવશષસહળ])(્)([®])/g, "$3$1$2");

  // Reroute reph "hT" to the proper position and change to "o"
  text = text.replace(/hTr/g, "rhT");
  text = text.replace(/hT([કખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલવશષસહળ])([્])/g, "$1$2o");
  text = text.replace(/hT([કખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલવશષસહળ])([ાીુૂૃેૈોૌંઁૅૉ઼]*)/g, "$1$2o");

  // Handle reph with specific vowel additions
  text = text.replace(/ીંhT/g, "`");
  text = text.replace(/ીhT/g, "hTe");
  text = text.replace(/ંhT/g, "hTk");

  // Halanta followed by punctuation or spaces
  text = text.replace(/[્]([ \,\;\.।\n\-\:])/g, "T$1");

  // Special suffix for specific characters
  text = text.replace(/([કછટઢફ])્ય/g, "$1â");

  // Apply symbol map replacements
  for (let i = 0; i < MAPPING_TABLE.length; i += 2) {
    const fromVal = MAPPING_TABLE[i];
    const toVal = MAPPING_TABLE[i + 1];
    
    // Global replacement using split/join to avoid RegExp escaping issues
    text = text.split(fromVal).join(toVal);
  }

  // Final reph adjustment
  text = text.replace(/rÿ/g, "ÿr");

  return text;
}
