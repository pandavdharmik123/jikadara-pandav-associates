import { PDFDocument, StandardFonts, rgb, LineCapStyle } from 'pdf-lib';
import { PAN_FORM_PAGES, PAN_PAGE } from '../constants/panLayout';
import { buildPanOverlays } from './panOverlay';

export const PAN_TEMPLATE_URL = '/forms/pan-form-93.pdf';

const INK = rgb(0.07, 0.09, 0.15);

let templatePromise = null;

/** Fetch the original blank PDF once and keep it in memory. */
function loadTemplate(url = PAN_TEMPLATE_URL) {
  if (!templatePromise) {
    templatePromise = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Could not load the PAN template (${response.status}).`);
      return response.arrayBuffer();
    });
  }
  return templatePromise;
}

async function embedImage(pdfDoc, src, cache) {
  if (cache.has(src)) return cache.get(src);
  let image = null;
  try {
    if (src.startsWith('data:image/png')) image = await pdfDoc.embedPng(src);
    else if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) image = await pdfDoc.embedJpg(src);
  } catch {
    image = null;
  }
  cache.set(src, image);
  return image;
}

/**
 * Fill the original PDF and return its bytes. The template is never rebuilt:
 * values are drawn on top of the untouched document, so the printed content
 * stays exactly as supplied.
 *
 * Only the pages visible in the preview are exported (`maxPages`, default: the
 * two fillable form pages). Every attached document image appends one more
 * page with the image at the size / position chosen on the preview.
 */
export async function buildPanPdf(data, { templateUrl = PAN_TEMPLATE_URL, maxPages = PAN_FORM_PAGES } = {}) {
  const template = await loadTemplate(templateUrl);
  const pdfDoc = await PDFDocument.load(template, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const opCache = new Map();

  // Drop the note / guideline pages that are not part of the preview.
  const templatePages = pdfDoc.getPageCount();
  const keep = Number.isFinite(maxPages) ? Math.min(Math.max(maxPages, 1), templatePages) : templatePages;
  for (let index = templatePages - 1; index >= keep; index -= 1) pdfDoc.removePage(index);

  // One extra page per attached document.
  const documents = (data.documents || []).filter((doc) => doc && doc.src);
  documents.forEach(() => pdfDoc.addPage([PAN_PAGE.width, PAN_PAGE.height]));

  const pages = pdfDoc.getPages();

  const ops = buildPanOverlays(data);

  for (const op of ops) {
    // Attachments always follow the kept form pages, whatever `maxPages` is.
    const pageIndex =
      op.kind === 'document' ? keep + (op.page - PAN_FORM_PAGES) - 1 : op.page - 1;
    const page = pages[pageIndex];
    if (!page) continue;
    const pageHeight = page.getHeight();

    if (op.type === 'char') {
      const width = font.widthOfTextAtSize(op.ch, op.size);
      const baselineTop = op.y + op.h / 2 + op.size * 0.36;
      page.drawText(op.ch, {
        x: op.x + (op.w - width) / 2,
        y: pageHeight - baselineTop,
        size: op.size,
        font,
        color: INK,
      });
    } else if (op.type === 'text') {
      const baselineTop = op.y + op.h / 2 + op.size * 0.36;
      page.drawText(op.text, {
        x: op.x + 1.8,
        y: pageHeight - baselineTop,
        size: op.size,
        font,
        color: INK,
        maxWidth: Math.max(op.w - 3, 4),
      });
    } else if (op.type === 'tick') {
      const point = (fx, fy) => ({
        x: op.x + op.w * fx,
        y: pageHeight - (op.y + op.h * fy),
      });
      const a = point(0.22, 0.54);
      const b = point(0.44, 0.79);
      const c = point(0.83, 0.24);
      page.drawLine({ start: a, end: b, thickness: 1.5, color: INK, lineCap: LineCapStyle.Round });
      page.drawLine({ start: b, end: c, thickness: 1.5, color: INK, lineCap: LineCapStyle.Round });
    } else if (op.type === 'image') {
      const image = await embedImage(pdfDoc, op.src, opCache);
      if (image) {
        if (op.kind === 'document') {
          // Documents use the exact box chosen on the preview (free width / height).
          page.drawImage(image, {
            x: op.x,
            y: pageHeight - (op.y + op.h),
            width: op.w,
            height: op.h,
          });
        } else {
          const scale = Math.min(op.w / image.width, op.h / image.height);
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;
          page.drawImage(image, {
            x: op.x + (op.w - drawWidth) / 2,
            y: pageHeight - (op.y + (op.h + drawHeight) / 2),
            width: drawWidth,
            height: drawHeight,
          });
        }
      }
    }
  }

  const bytes = await pdfDoc.save();
  return bytes;
}

const safeName = (value) => String(value || '').replace(/[^a-z0-9]+/gi, '').slice(0, 30);

export async function downloadPanPdf(data, options = {}) {
  const bytes = await buildPanPdf(data, options);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PAN-Application${data?.lastName ? `-${safeName(data.lastName)}` : ''}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  return blob;
}

/**
 * Open the completed PDF in a new tab and ask the browser to print it. If the
 * popup is blocked the caller can fall back to downloading the file.
 */
export async function printPanPdf(data, options = {}) {
  const bytes = await buildPanPdf(data, options);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // Pop-ups blocked – hand the completed file to the user instead.
    URL.revokeObjectURL(url);
    await downloadPanPdf(data, options);
    return 'downloaded';
  }
  win.opener = null;

  // The built-in PDF viewer needs a moment before it can be printed.
  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch {
      /* the browser PDF viewer still lets the user print manually */
    }
  };
  win.addEventListener('load', () => window.setTimeout(triggerPrint, 500), { once: true });
  window.setTimeout(triggerPrint, 2500);
  window.setTimeout(() => URL.revokeObjectURL(url), 300000);
  return blob;
}
