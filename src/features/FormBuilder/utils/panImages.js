import { PAN_LAYOUT, PAN_PAGE } from '../constants/panLayout';

/**
 * Uploaded-image handling for Form 93.
 *
 * Signature: printed twice – inside the signature box on page 2 and across the
 * photograph on page 1 – and both copies can be moved / resized on the live
 * preview. A placement only stores the top-left corner and the width
 * (`{ x, y, w }`, PDF points, top-left origin); the height always follows the
 * real aspect ratio of the uploaded image so the signature never stretches.
 *
 * Other documents: every attached image gets its own appended page. Their
 * placement stores both `w` and `h`, so width and height can be changed
 * independently.
 */

export const DEFAULT_SIGNATURE_ASPECT = 3;

/** Smallest width (in points) the signature can be resized to. */
const MIN_WIDTH = 24;

const round2 = (value) => Math.round(value * 100) / 100;

const safeAspect = (aspect) => (aspect > 0.05 ? aspect : DEFAULT_SIGNATURE_ASPECT);

/** Height (points) of a placement, derived from the image aspect ratio. */
export function placementHeight(placement, aspect) {
  if (!placement) return 0;
  return placement.w / safeAspect(aspect);
}

/**
 * Fit a signature (of the given aspect ratio) inside a printed box. Used to
 * derive the initial position when an image is uploaded.
 */
export function fitPlacement(box, aspect, { align = 'center', inset = 5 } = {}) {
  const ratio = safeAspect(aspect);
  const maxW = Math.max(box.w - inset * 2, MIN_WIDTH);
  const maxH = Math.max(box.h - inset * 2, MIN_WIDTH / ratio);
  const w = Math.min(maxW, maxH * ratio);
  const h = w / ratio;
  const x = box.x + (box.w - w) / 2;
  const y = align === 'bottom' ? box.top + box.h - h - inset : box.top + (box.h - h) / 2;
  return { x: round2(x), y: round2(y), w: round2(w) };
}

/**
 * Default placement on page 1 (photograph) and page 2 (signature box).
 * Pass `boxes` when the form has its signature box in a different place.
 */
export function createSignaturePlacements(
  aspect = DEFAULT_SIGNATURE_ASPECT,
  boxes = { page1: PAN_LAYOUT.page1.photoLeft, page2: PAN_LAYOUT.page2.signature }
) {
  return {
    page1: fitPlacement(boxes.page1, aspect, { align: 'bottom' }),
    page2: fitPlacement(boxes.page2, aspect),
  };
}

/** Keep a placement on the page and above the minimum size. */
export function clampPlacement(placement, aspect) {
  const ratio = safeAspect(aspect);
  const maxW = Math.max(MIN_WIDTH, PAN_PAGE.width - 2);
  const w = Math.min(Math.max(placement.w, MIN_WIDTH), maxW);
  const h = w / ratio;
  const x = Math.min(Math.max(placement.x, 0), Math.max(PAN_PAGE.width - w, 0));
  const y = Math.min(Math.max(placement.y, 0), Math.max(PAN_PAGE.height - h, 0));
  return { x: round2(x), y: round2(y), w: round2(w) };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be read.'));
    image.src = src;
  });
}

/**
 * Prepare an uploaded signature: white paper is turned transparent (so the
 * signature can sit over the photograph without hiding it) and the empty
 * margins are cropped away so the image fills its box.
 */
export async function prepareSignatureImage(src, maxSide = 1400) {
  const image = await loadImage(src);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) throw new Error('The image could not be read.');

  const ratio = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * ratio));
  const height = Math.max(1, Math.round(naturalHeight * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);

  const frame = ctx.getImageData(0, 0, width, height);
  const pixels = frame.data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      // Near-white paper becomes transparent.
      if (pixels[i] >= 240 && pixels[i + 1] >= 240 && pixels[i + 2] >= 240) {
        pixels[i + 3] = 0;
        continue;
      }
      if (pixels[i + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(frame, 0, 0);

  // Nothing visible – keep the untouched image so the user can tell what went wrong.
  if (maxX < minX || maxY < minY) {
    return { src: canvas.toDataURL('image/png'), aspect: width / height };
  }

  const pad = Math.round(Math.max(width, height) * 0.015) + 2;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width, maxX + pad + 1) - cropX;
  const cropH = Math.min(height, maxY + pad + 1) - cropY;

  if (cropW < 8 || cropH < 8) {
    return { src: canvas.toDataURL('image/png'), aspect: width / height };
  }

  const output = document.createElement('canvas');
  output.width = cropW;
  output.height = cropH;
  output.getContext('2d').drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return { src: output.toDataURL('image/png'), aspect: cropW / cropH };
}

/* ------------------------------------------------------------------ */
/* Other documents (appended pages)                                    */
/* ------------------------------------------------------------------ */

/**
 * Default placement of an attached document: as large as possible on an A4
 * page with a comfortable margin, keeping the image's own aspect ratio.
 */
export function createDocumentPlacement(aspect, { margin = 36 } = {}) {
  const ratio = aspect > 0.05 ? aspect : 1;
  const maxW = PAN_PAGE.width - margin * 2;
  const maxH = PAN_PAGE.height - margin * 2;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return {
    x: round2((PAN_PAGE.width - w) / 2),
    y: round2((PAN_PAGE.height - h) / 2),
    w: round2(w),
    h: round2(h),
  };
}

/** Keep a document placement on the page, with independent width / height. */
export function clampDocumentPlacement(placement) {
  const width = Math.min(Math.max(placement.w, 30), PAN_PAGE.width);
  const height = Math.min(Math.max(placement.h, 30), PAN_PAGE.height);
  const x = Math.min(Math.max(placement.x, 0), Math.max(PAN_PAGE.width - width, 0));
  const y = Math.min(Math.max(placement.y, 0), Math.max(PAN_PAGE.height - height, 0));
  return { x: round2(x), y: round2(y), w: round2(width), h: round2(height) };
}

/**
 * Downscale an attached document for storage / printing. The image is
 * flattened on white and re-encoded as JPEG so several attachments still fit
 * in the browser's draft storage.
 */
export async function prepareDocumentImage(src, maxSide = 2000) {
  const image = await loadImage(src);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) throw new Error('The image could not be read.');

  const ratio = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * ratio));
  const height = Math.max(1, Math.round(naturalHeight * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return { src: canvas.toDataURL('image/jpeg', 0.9), aspect: width / height, width, height };
}

/* ------------------------------------------------------------------ */
/* Signature clean-up (remove background / lighting)                   */
/* ------------------------------------------------------------------ */

const CLEAN_MAX_SIDE = 1400;
const CLEAN_INK = [17, 24, 39];

/** Odd window size for the local threshold, scaled to the image. */
function sauvolaWindow(width, height) {
  const raw = Math.round(Math.min(width, height) * 0.055);
  const size = Math.max(25, Math.min(101, raw));
  return size % 2 === 0 ? size + 1 : size;
}

/** Summed-area tables used for the local mean / variance. */
function buildIntegralImages(values, width, height) {
  const stride = width + 1;
  const sum = new Float64Array(stride * (height + 1));
  const square = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    let rowSquare = 0;
    for (let x = 0; x < width; x += 1) {
      const value = values[y * width + x];
      rowSum += value;
      rowSquare += value * value;
      const index = (y + 1) * stride + (x + 1);
      sum[index] = sum[index - stride] + rowSum;
      square[index] = square[index - stride] + rowSquare;
    }
  }
  return { sum, square, stride };
}

function areaSum(integral, stride, left, top, right, bottom) {
  const a = top * stride + left;
  const b = top * stride + (right + 1);
  const c = (bottom + 1) * stride + left;
  const d = (bottom + 1) * stride + (right + 1);
  return integral[d] - integral[b] - integral[c] + integral[a];
}

/**
 * Drop paper grain / dust and anything that clearly belongs to the page edge.
 * `alpha` is modified in place: removed pixels are set to 0.
 */
function filterSignatureComponents(alpha, width, height) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const stack = new Int32Array(total);
  const components = [];
  const minArea = Math.max(4, Math.min(40, Math.round(Math.min(width, height) * 0.02)));

  for (let start = 0; start < total; start += 1) {
    if (alpha[start] < 0.24 || visited[start]) continue;
    let top = 0;
    stack[top++] = start;
    visited[start] = 1;
    let area = 0;
    let sumAlpha = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let touchesBorder = false;
    const pixels = [];

    while (top > 0) {
      const index = stack[--top];
      const x = index % width;
      const y = (index - x) / width;
      area += 1;
      sumAlpha += alpha[index];
      pixels.push(index);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;

      for (let oy = -1; oy <= 1; oy += 1) {
        const ny = y + oy;
        if (ny < 0 || ny >= height) continue;
        for (let ox = -1; ox <= 1; ox += 1) {
          if (!ox && !oy) continue;
          const nx = x + ox;
          if (nx < 0 || nx >= width) continue;
          const next = ny * width + nx;
          if (alpha[next] >= 0.24 && !visited[next]) {
            visited[next] = 1;
            stack[top++] = next;
          }
        }
      }
    }

    components.push({ area, mean: sumAlpha / area, pixels, touchesBorder, minX, minY, maxX, maxY });
  }

  // Page edges / table shadows usually touch the border, and paper grain forms
  // faint islands. Only keep components that are large and solid enough, and
  // drop border components when at least one clean inner stroke survived (so a
  // tightly cropped signature is never erased).
  const viable = components.filter((component) => component.area >= minArea && component.mean >= 0.3);
  const hasInner = viable.some((component) => !component.touchesBorder);
  const kept = new Uint8Array(total);
  let ink = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (const component of viable) {
    if (component.touchesBorder && hasInner) continue;
    ink += component.area;
    if (component.minX < minX) minX = component.minX;
    if (component.minY < minY) minY = component.minY;
    if (component.maxX > maxX) maxX = component.maxX;
    if (component.maxY > maxY) maxY = component.maxY;
    for (const index of component.pixels) kept[index] = 1;
  }

  // Keep one pixel of soft anti-aliasing around the chosen strokes, but drop
  // every other faint pixel (paper edges, shadow gradients, dust).
  const keep = new Uint8Array(total);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!kept[y * width + x]) continue;
      for (let oy = -1; oy <= 1; oy += 1) {
        const ny = y + oy;
        if (ny < 0 || ny >= height) continue;
        for (let ox = -1; ox <= 1; ox += 1) {
          const nx = x + ox;
          if (nx < 0 || nx >= width) continue;
          keep[ny * width + nx] = 1;
        }
      }
    }
  }

  return { ink, minX, minY, maxX, maxY, keep };
}

/**
 * Turn an uploaded signature into clean ink: the paper / background and uneven
 * lighting are removed with a Sauvola local threshold, specks and page edges
 * are dropped, and the remaining strokes are recoloured to a dark ink tone on
 * a transparent background.
 *
 * Returns the same shape as `prepareSignatureImage` plus the detected ink area.
 */
export async function cleanSignatureImage(src, { maxSide = CLEAN_MAX_SIDE, ink = CLEAN_INK } = {}) {
  const image = await loadImage(src);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) throw new Error('The image could not be read.');

  const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  const frame = ctx.getImageData(0, 0, width, height);
  const pixels = frame.data;

  // Work on luminance over white so transparent areas count as paper.
  const luminance = new Float32Array(width * height);
  for (let i = 0, p = 0; i < luminance.length; i += 1, p += 4) {
    const alpha = pixels[p + 3] / 255;
    const value = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2];
    luminance[i] = value * alpha + 255 * (1 - alpha);
  }

  const { sum, square, stride } = buildIntegralImages(luminance, width, height);
  const window = sauvolaWindow(width, height);
  const radius = (window - 1) / 2;
  const k = 0.22;
  const alpha = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - radius);
    const bottom = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - radius);
      const right = Math.min(width - 1, x + radius);
      const count = (right - left + 1) * (bottom - top + 1);
      const index = y * width + x;
      const mean = areaSum(sum, stride, left, top, right, bottom) / count;
      const meanSquare = areaSum(square, stride, left, top, right, bottom) / count;
      const deviation = Math.sqrt(Math.max(0, meanSquare - mean * mean));
      // Sauvola: threshold follows the local mean and adapts to shadows.
      const threshold = mean * (1 + k * (deviation / 128 - 1));
      const softness = Math.max(14, threshold * 0.26);
      let value = (threshold - luminance[index]) / softness;
      if (value > 1) value = 1;
      else if (value < 0.07) value = 0;
      alpha[index] = value;
    }
  }

  const detected = filterSignatureComponents(alpha, width, height);
  const coverage = detected.ink / (width * height);
  if (detected.ink === 0 || coverage < 0.00015) {
    throw new Error('No signature strokes were found.');
  }
  if (coverage > 0.7) {
    throw new Error('The image is too dark to separate the signature.');
  }

  const pad = Math.max(4, Math.round(Math.max(detected.maxX - detected.minX + 1, detected.maxY - detected.minY + 1) * 0.02));
  const cropX = Math.max(0, detected.minX - pad);
  const cropY = Math.max(0, detected.minY - pad);
  const cropW = Math.min(width, detected.maxX + pad + 1) - cropX;
  const cropH = Math.min(height, detected.maxY + pad + 1) - cropY;
  if (cropW < 8 || cropH < 8) throw new Error('No signature strokes were found.');

  const output = document.createElement('canvas');
  output.width = cropW;
  output.height = cropH;
  const outputCtx = output.getContext('2d');
  const outputFrame = outputCtx.createImageData(cropW, cropH);
  const outputPixels = outputFrame.data;
  const [inkR, inkG, inkB] = ink;

  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      const index = (cropY + y) * width + (cropX + x);
      if (!detected.keep[index]) continue;
      const value = alpha[index];
      if (value <= 0.02) continue;
      const p = (y * cropW + x) * 4;
      outputPixels[p] = inkR;
      outputPixels[p + 1] = inkG;
      outputPixels[p + 2] = inkB;
      outputPixels[p + 3] = Math.round(Math.min(1, (value - 0.04) / 0.96 * 1.05) * 255);
    }
  }
  outputCtx.putImageData(outputFrame, 0, 0);

  return {
    src: output.toDataURL('image/png'),
    aspect: cropW / cropH,
    width: cropW,
    height: cropH,
    ink: detected.ink,
  };
}
