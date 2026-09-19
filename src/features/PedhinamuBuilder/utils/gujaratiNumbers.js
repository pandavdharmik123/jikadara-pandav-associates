const guDigits = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];

const guWords = [
  "શૂન્ય", "એક", "બે", "ત્રણ", "ચાર", "પાંચ", "છ", "સાત", "આઠ", "નવ",
  "દસ", "અગિયાર", "બાર", "તેર", "ચૌદ", "પંદર", "સોળ", "સત્તર", "અઢાર", "ઓગણીસ",
  "વીસ", "એકવીસ", "બાવીસ", "તેવીસ", "ચોવીસ", "પચીસ", "છવીસ", "સત્તાવીસ", "અઠ્ઠાવીસ", "ઓગણત્રીસ",
  "ત્રીસ", "એકત્રીસ", "બત્રીસ", "તેત્રીસ", "ચોત્રીસ", "પાંત્રીસ", "છત્રીસ", "સાડત્રીસ", "આડત્રીસ", "ઓગણચાલીસ",
  "ચાલીસ", "એકતાલીસ", "બેતાલીસ", "તેતાલીસ", "ચુંમાલીસ", "પિસ્તાલીસ", "છેતાલીસ", "સુડતાલીસ", "અડસઠ", "ઓગણપચાસ", "પચાસ"
];

/**
 * Convert standard integer or digit string to Gujarati digits
 * e.g. 8 -> "૮", 2026 -> "૨૦૨૬"
 */
export function toGujaratiNumber(num) {
  if (num === null || num === undefined || num === '') return '';
  return String(num).replace(/[0-9]/g, (d) => guDigits[parseInt(d, 10)]);
}

/**
 * Convert integer to Gujarati word
 * e.g. 8 -> "આઠ"
 */
export function toGujaratiWords(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 0) return '';
  if (n < guWords.length) return guWords[n];
  return toGujaratiNumber(n);
}

/**
 * Compute total alive heirs from Pedhinamu tree
 */
export function calculateAliveHeirs(tree) {
  if (!tree) return { count: 0, gujaratiDigits: '૦', gujaratiWords: 'શૂન્ય' };

  let count = 0;

  // 1. Recursive rootNode support
  if (tree.rootNode) {
    function countNode(node, isRoot = false) {
      if (!isRoot && node && !node.deceased) {
        count += 1;
      }
      for (const child of node.children || []) {
        countNode(child, false);
      }
    }
    countNode(tree.rootNode, true);

    return {
      count,
      gujaratiDigits: toGujaratiNumber(count),
      gujaratiWords: toGujaratiWords(count)
    };
  }

  // 2. Fallback legacy spouses support
  if (Array.isArray(tree.spouses)) {
    tree.spouses.forEach((spouse) => {
      if (!spouse.isDeceased) {
        count += 1;
      }
      if (Array.isArray(spouse.children)) {
        spouse.children.forEach((child) => {
          if (!child.isDeceased) {
            count += 1;
          }
        });
      }
    });
  }

  return {
    count,
    gujaratiDigits: toGujaratiNumber(count),
    gujaratiWords: toGujaratiWords(count)
  };
}
