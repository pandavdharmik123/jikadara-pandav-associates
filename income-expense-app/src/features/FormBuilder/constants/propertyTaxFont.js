/**
 * Ghanshyam advance widths (units / 1000 em) for printable ASCII.
 *
 * The property-tax template uses the legacy Gujarati encoding, so every
 * printable value is still ASCII on the wire. Keeping the widths here (instead
 * of asking the browser for them) means the live preview and the pdf-lib
 * export wrap the exact same way.
 */
const GHANSHYAM_WIDTHS = [
  260, 307, 299, 309, 445, 726, 10, 275, 219, 219, 10, 457, 253, 317, 259, 298,
  457, 445, 450, 445, 457, 457, 455, 457, 457, 457, 260, 307, 10, 457, 10, 452,
  592, 400, 675, 589, 466, 497, 580, 590, 684, 229, 689, 619, 635, 656, 645, 249,
  485, 461, 315, 608, 438, 704, 699, 485, 610, 552, 10, 10, 10, 10, 10, 405,
  10, 742, 638, 567, 435, 486, 544, 602, 510, 220, 630, 544, 549, 506, 574, 605,
  460, 489, 405, 582, 534, 516, 483, 552, 645, 552, 570, 380, 10, 380, 651,
];

const DEFAULT_WIDTH = 500;

/** Width of a legacy-encoded string at `size` points. */
export function measureGhanshyamText(text, size) {
  let total = 0;
  for (const ch of String(text || '')) {
    const code = ch.charCodeAt(0);
    total += code >= 32 && code <= 126 ? GHANSHYAM_WIDTHS[code - 32] : DEFAULT_WIDTH;
  }
  return (total / 1000) * size;
}

/** Largest size between `minSize` and `maxSize` that keeps a single line fitting. */
export function fitGhanshyamText(text, maxWidth, maxSize = 12.5, minSize = 6.5) {
  let size = maxSize;
  while (size > minSize && measureGhanshyamText(text, size) > maxWidth) size -= 0.1;
  return Math.max(minSize, Math.round(size * 10) / 10);
}

/**
 * Greedy word wrap with a character fallback for long unbroken words.
 * Explicit newlines are preserved as empty lines.
 */
export function wrapGhanshyamText(text, maxWidth, size) {
  const paragraphs = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const lines = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }

    let line = '';
    for (const word of trimmed.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureGhanshyamText(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line) {
        lines.push(line);
      }

      if (measureGhanshyamText(word, size) <= maxWidth) {
        line = word;
        continue;
      }

      let piece = '';
      for (const ch of word) {
        if (piece && measureGhanshyamText(piece + ch, size) > maxWidth) {
          lines.push(piece);
          piece = '';
        }
        piece += ch;
      }
      line = piece;
    }

    if (line) lines.push(line);
  }

  return lines.length ? lines : [''];
}

/**
 * Pick a font size and line breaks so the whole value fits inside a table cell.
 * The returned `lineHeight` is also used by the preview, so the visual block is
 * identical on screen and in the exported PDF.
 */
export function fitGhanshyamBlock(
  text,
  boxWidth,
  boxHeight,
  { maxSize = 12.5, minSize = 7, lineHeightFactor = 1.18, paddingX = 6, paddingY = 4 } = {}
) {
  const width = Math.max(10, boxWidth - paddingX * 2);
  const height = Math.max(10, boxHeight - paddingY * 2);

  let size = maxSize;
  let lines = [];
  let lineHeight = size * lineHeightFactor;

  while (size >= minSize) {
    lines = wrapGhanshyamText(text, width, size);
    lineHeight = size * lineHeightFactor;
    if (lines.length * lineHeight <= height) break;
    size -= 0.25;
  }

  return {
    lines,
    size: Math.max(minSize, Math.round(size * 100) / 100),
    lineHeight,
  };
}
