/**
 * Document Image Filters & Adjustment Engine
 * Professional client-side Canvas processing for scanned documents, certificates, and legal deeds.
 */

export const FILTER_PRESETS = [
  {
    id: 'original',
    name: 'Original',
    desc: 'Unfiltered source',
    defaults: { brightness: 0, contrast: 0, sharpness: 0, saturation: 0, exposure: 0 }
  },
  {
    id: 'auto-enhance',
    name: 'Auto Enhance',
    desc: 'Balanced clarity & contrast',
    defaults: { brightness: 8, contrast: 18, sharpness: 20, saturation: 5, exposure: 5 }
  },
  {
    id: 'magic-color',
    name: 'Magic Color',
    desc: 'Whitens paper & boosts ink',
    defaults: { brightness: 12, contrast: 28, sharpness: 25, saturation: 22, exposure: 8 }
  },
  {
    id: 'light',
    name: 'Light',
    desc: 'Lifts shadows & brightens',
    defaults: { brightness: 26, contrast: 10, sharpness: 10, saturation: 0, exposure: 20 }
  },
  {
    id: 'dark',
    name: 'Dark',
    desc: 'Deepens faint ink & text',
    defaults: { brightness: -14, contrast: 26, sharpness: 20, saturation: 0, exposure: -10 }
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    desc: 'Clean monochrome tones',
    defaults: { brightness: 5, contrast: 16, sharpness: 15, saturation: -100, exposure: 0 }
  },
  {
    id: 'black-white',
    name: 'Black & White',
    desc: 'Crisp binary text separation',
    defaults: { brightness: 10, contrast: 60, sharpness: 30, saturation: -100, exposure: 5 }
  },
  {
    id: 'document',
    name: 'Document',
    desc: 'Optimized for legal deeds',
    defaults: { brightness: 14, contrast: 35, sharpness: 30, saturation: -100, exposure: 8 }
  },
  {
    id: 'clear-scan',
    name: 'Clear Scan',
    desc: 'Removes paper tint & noise',
    defaults: { brightness: 20, contrast: 42, sharpness: 35, saturation: -100, exposure: 12 }
  },
  {
    id: 'sharpen',
    name: 'Sharpen',
    desc: 'High edge definition',
    defaults: { brightness: 0, contrast: 12, sharpness: 55, saturation: 0, exposure: 0 }
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    desc: 'Maximum text visibility',
    defaults: { brightness: 4, contrast: 50, sharpness: 15, saturation: 0, exposure: 0 }
  },
  {
    id: 'low-contrast',
    name: 'Low Contrast',
    desc: 'Softens harsh shadows',
    defaults: { brightness: 0, contrast: -25, sharpness: 0, saturation: -10, exposure: 0 }
  }
];

// In-memory cache for rendered thumbnails to maintain high performance
const thumbnailCache = new Map();

/**
 * 3x3 Convolution filter for unsharp masking (sharpening).
 */
function applySharpenConvolution(data, width, height, amount) {
  if (amount <= 0) return;
  const strength = Math.min(amount / 100, 1.0) * 1.5;
  const buff = new Uint8ClampedArray(data);

  // Kernel: [ 0, -s, 0, -s, 1 + 4s, -s, 0, -s, 0 ]
  const center = 1 + 4 * strength;
  const edge = -strength;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = buff[((y - 1) * width + x) * 4 + c];
        const bottom = buff[((y + 1) * width + x) * 4 + c];
        const left = buff[(y * width + (x - 1)) * 4 + c];
        const right = buff[(y * width + (x + 1)) * 4 + c];
        const mid = buff[idx + c];

        const val = mid * center + (top + bottom + left + right) * edge;
        data[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
}

/**
 * Fast pixel-level processing on Canvas ImageData.
 */
export function processImageData(imageData, filterId, adjustments = {}) {
  const { data, width, height } = imageData;
  const preset = FILTER_PRESETS.find((p) => p.id === filterId) || FILTER_PRESETS[0];
  const defaults = preset.defaults || {};

  // Merge preset defaults with user manual adjustments
  const bVal = (defaults.brightness || 0) + (adjustments.brightness || 0);
  const cVal = (defaults.contrast || 0) + (adjustments.contrast || 0);
  const sVal = (defaults.sharpness || 0) + (adjustments.sharpness || 0);
  const satVal = (defaults.saturation || 0) + (adjustments.saturation || 0);
  const expVal = (defaults.exposure || 0) + (adjustments.exposure || 0);

  // Calculate contrast factor: [-100, 100] -> [0.2, 3.0]
  const contrastFactor = Math.max(0.1, (259 * (cVal + 255)) / (255 * (259 - cVal)));
  // Calculate brightness offset
  const brightnessOffset = bVal * 1.2 + expVal * 1.0;
  // Saturation factor: [-100, 100] -> [0.0, 2.0]
  const satFactor = Math.max(0, 1 + satVal / 100);

  const isBw = filterId === 'black-white';
  const isDoc = filterId === 'document';
  const isClear = filterId === 'clear-scan';
  const isMagic = filterId === 'magic-color';

  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Exposure & Brightness
    if (brightnessOffset !== 0) {
      r += brightnessOffset;
      g += brightnessOffset;
      b += brightnessOffset;
    }

    // 2. Contrast
    if (cVal !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // 3. Grayscale conversion (Luminance weights)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Saturation adjustment
    if (satFactor !== 1.0) {
      r = gray + (r - gray) * satFactor;
      g = gray + (g - gray) * satFactor;
      b = gray + (b - gray) * satFactor;
    }

    // 4. Document / Clear Scan: Clean background & boost text
    if (isDoc || isClear) {
      // Whiten off-white paper (pixels > 195 get pushed toward pure white 255)
      let lum = gray;
      if (lum > 185) {
        lum = 185 + (lum - 185) * 1.8;
      } else if (lum < 140) {
        // Deepen text
        lum = lum * 0.85;
      }
      r = lum;
      g = lum;
      b = lum;
    } else if (isBw) {
      // High-contrast binary text threshold with smooth edge preservation
      const threshold = 160 + (bVal * 0.5);
      const val = gray < threshold ? Math.max(0, gray * 0.4) : 255;
      r = val;
      g = val;
      b = val;
    } else if (isMagic) {
      // Whiten paper while preserving colored stamps and blue/purple ink
      if (gray > 200) {
        r = Math.min(255, r * 1.08);
        g = Math.min(255, g * 1.08);
        b = Math.min(255, b * 1.08);
      } else if (gray < 130) {
        r = r * 0.9;
        g = g * 0.9;
        b = b * 0.9;
      }
    }

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }

  // 5. Sharpening via convolution
  if (sVal > 0) {
    applySharpenConvolution(data, width, height, sVal);
  }

  return imageData;
}

/**
 * Applies a filter to an image data URL and returns the filtered data URL.
 */
export function generateFilteredDataUrl(sourceDataUrl, filterId = 'original', adjustments = {}) {
  return new Promise((resolve) => {
    if (!sourceDataUrl) {
      resolve('');
      return;
    }

    // If completely original with no adjustments, return source immediately
    const isOriginal = filterId === 'original' &&
      !adjustments.brightness &&
      !adjustments.contrast &&
      !adjustments.sharpness &&
      !adjustments.saturation &&
      !adjustments.exposure;

    if (isOriginal) {
      resolve(sourceDataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, w, h);
      processImageData(imgData, filterId, adjustments);
      ctx.putImageData(imgData, 0, 0);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}

/**
 * Generates a lightweight (~140px) thumbnail for the filter selection cards.
 */
export function generateFilterThumbnail(sourceDataUrl, filterId) {
  const cacheKey = `${sourceDataUrl.slice(0, 50)}_${filterId}`;
  if (thumbnailCache.has(cacheKey)) {
    return Promise.resolve(thumbnailCache.get(cacheKey));
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetW = 120;
      const scale = targetW / img.naturalWidth;
      const targetH = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      processImageData(imgData, filterId, {});
      ctx.putImageData(imgData, 0, 0);

      const thumbUri = canvas.toDataURL('image/jpeg', 0.85);
      thumbnailCache.set(cacheKey, thumbUri);
      resolve(thumbUri);
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}

/**
 * Executes the full document rendering pipeline:
 * Source Image -> Rotate -> Crop -> Filter & Adjustments -> Output DataURL
 */
export function renderPipelineDataUrl({
  sourceUri,
  rotation = 0,
  crop = null,
  filterId = 'original',
  adjustments = {},
  scaleFactor = 1.0
}) {
  return new Promise((resolve) => {
    if (!sourceUri) {
      resolve('');
      return;
    }

    const normAngle = ((rotation % 360) + 360) % 360;
    const isOriginalFilter =
      (!filterId || filterId === 'original') &&
      !adjustments.brightness &&
      !adjustments.contrast &&
      !adjustments.sharpness &&
      !adjustments.saturation &&
      !adjustments.exposure;
    const isNoCrop = !crop || (crop.x <= 0 && crop.y <= 0 && crop.width >= 0.999 && crop.height >= 0.999);
    const isNoTransform = normAngle === 0 && isNoCrop && isOriginalFilter && scaleFactor === 1.0;

    if (isNoTransform) {
      resolve(sourceUri);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const isSideways = normAngle === 90 || normAngle === 270;
      const rotW = isSideways ? srcH : srcW;
      const rotH = isSideways ? srcW : srcH;

      // 1. Intermediate Rotated Canvas
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = rotW;
      rotCanvas.height = rotH;
      const rotCtx = rotCanvas.getContext('2d');

      if (normAngle === 90) {
        rotCtx.translate(srcH, 0);
        rotCtx.rotate((90 * Math.PI) / 180);
      } else if (normAngle === 180) {
        rotCtx.translate(srcW, srcH);
        rotCtx.rotate((180 * Math.PI) / 180);
      } else if (normAngle === 270) {
        rotCtx.translate(0, srcW);
        rotCtx.rotate((270 * Math.PI) / 180);
      }
      rotCtx.drawImage(img, 0, 0);

      // 2. Crop from rotated canvas
      let sx = 0, sy = 0, sw = rotW, sh = rotH;
      if (crop) {
        sx = Math.max(0, Math.floor(crop.x * rotW));
        sy = Math.max(0, Math.floor(crop.y * rotH));
        sw = Math.min(rotW - sx, Math.floor(crop.width * rotW));
        sh = Math.min(rotH - sy, Math.floor(crop.height * rotH));
      }

      if (sw <= 0 || sh <= 0) {
        resolve(sourceUri);
        return;
      }

      const outW = Math.round(sw * scaleFactor);
      const outH = Math.round(sh * scaleFactor);

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = outW;
      finalCanvas.height = outH;
      const ctx = finalCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(rotCanvas, sx, sy, sw, sh, 0, 0, outW, outH);

      // 3. Apply Filter and Adjustments
      if (!isOriginalFilter) {
        const imgData = ctx.getImageData(0, 0, outW, outH);
        processImageData(imgData, filterId, adjustments);
        ctx.putImageData(imgData, 0, 0);
      }

      resolve(finalCanvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(sourceUri);
    img.src = sourceUri;
  });
}

