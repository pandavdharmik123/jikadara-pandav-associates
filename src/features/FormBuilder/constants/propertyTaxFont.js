/**
 * Nilkanth advance widths (units / 1000 em) for printable ASCII.
 *
 * The property-tax template uses the legacy Gujarati encoding, so every
 * printable value is still ASCII on the wire. Keeping the widths here (instead
 * of asking the browser for them) means the live preview and the pdf-lib
 * export wrap the exact same way.
 */
const NILKANTH_WIDTHS = [
  280, 307, 316, 309, 445, 726, 10, 316, 219, 219, 10, 457, 307, 317, 250, 298,
  457, 457, 457, 457, 457, 457, 457, 457, 457, 457, 260, 307, 10, 457, 6, 452,
  592, 380, 676, 589, 466, 497, 552, 558, 674, 229, 689, 619, 635, 656, 648, 249,
  465, 461, 304, 608, 438, 704, 699, 464, 618, 552, 10, 10, 10, 10, 10, 367,
  10, 742, 638, 567, 435, 497, 535, 602, 510, 219, 588, 525, 549, 506, 574, 601,
  465, 489, 473, 577, 535, 516, 504, 552, 640, 552, 570, 380, 10, 380, 651,
];

const DEFAULT_WIDTH = 500;

/** Width of a legacy-encoded string at `size` points. */
export function measureNilkanthText(text, size) {
  let total = 0;
  for (const ch of String(text || '')) {
    const code = ch.charCodeAt(0);
    total += code >= 32 && code <= 126 ? NILKANTH_WIDTHS[code - 32] : DEFAULT_WIDTH;
  }
  return (total / 1000) * size;
}

/** Largest size between `minSize` and `maxSize` that keeps a single line fitting. */
export function fitNilkanthText(text, maxWidth, maxSize = 12.5, minSize = 6.5) {
  let size = maxSize;
  while (size > minSize && measureNilkanthText(text, size) > maxWidth) size -= 0.1;
  return Math.max(minSize, Math.round(size * 10) / 10);
}

/**
 * Greedy word wrap with a character fallback for long unbroken words.
 * Explicit newlines are preserved as empty lines.
 */
export function wrapNilkanthText(text, maxWidth, size) {
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
      if (measureNilkanthText(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line) {
        lines.push(line);
        line = '';
      }

      if (measureNilkanthText(word, size) <= maxWidth) {
        line = word;
        continue;
      }

      let piece = '';
      for (const ch of word) {
        if (piece && measureNilkanthText(piece + ch, size) > maxWidth) {
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
export function fitNilkanthBlock(
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
    lines = wrapNilkanthText(text, width, size);
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
