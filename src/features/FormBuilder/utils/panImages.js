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

/** Default placement on page 1 (photograph) and page 2 (signature box). */
export function createSignaturePlacements(aspect = DEFAULT_SIGNATURE_ASPECT) {
  return {
    page1: fitPlacement(PAN_LAYOUT.page1.photoLeft, aspect, { align: 'bottom' }),
    page2: fitPlacement(PAN_LAYOUT.page2.signature, aspect),
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
