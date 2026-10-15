import { toGujaratiNumber, toGujaratiWords } from './gujaratiNumbers';

/**
 * Extract alive heirs from the Pedhinamu tree in natural order
 * Returns array of { srNoGujarati, name, ageGujarati, relationship }
 */
export function extractAliveHeirs(tree) {
  if (!tree) return [];

  const heirs = [];

  if (tree.rootNode) {
    function traverse(node, isRoot = false) {
      if (!isRoot && node) {
        if (!node.deceased) {
          heirs.push({
            id: node.id,
            name: node.name || '',
            age: node.age || '',
            relationship: node.relationship || '',
            gender: node.gender || 'male'
          });
        }
      }
      for (const child of node.children || []) {
        traverse(child, false);
      }
    }
    traverse(tree.rootNode, true);
  } else if (Array.isArray(tree.spouses)) {
    tree.spouses.forEach((spouse) => {
      if (!spouse.deceased) {
        heirs.push({
          id: spouse.id,
          name: spouse.name || '',
          age: spouse.age || '',
          relationship: spouse.relationship || 'પત્ની',
          gender: 'female'
        });
      }
      (spouse.children || []).forEach((child) => {
        if (!child.deceased) {
          heirs.push({
            id: child.id,
            name: child.name || '',
            age: child.age || '',
            relationship: child.relationship || 'પુત્ર',
            gender: child.gender || 'male'
          });
        }
      });
    });
  }

  return heirs.map((h, idx) => ({
    ...h,
    srNo: idx + 1,
    srNoGujarati: toGujaratiNumber(idx + 1),
    ageGujarati: toGujaratiNumber(h.age)
  }));
}

/**
 * Returns formatted counts for heirs
 */
export function getHeirsSummary(heirsList) {
  const count = heirsList.length;
  return {
    count,
    gujaratiDigits: toGujaratiNumber(count),
    gujaratiWords: toGujaratiWords(count),
    combinedText: `${toGujaratiNumber(count)} (${toGujaratiWords(count)})`
  };
}
