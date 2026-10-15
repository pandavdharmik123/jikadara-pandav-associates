import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

const PNG_OPTIONS = {
  backgroundColor: '#ffffff',
  pixelRatio: 3,
  skipFonts: false,
  style: {
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'geometricPrecision'
  },
  filter: (node) => {
    if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
      const href = node.href || '';
      if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
        return false;
      }
    }
    return true;
  }
};

/**
 * Capture an A4 portrait element and return a jsPDF instance
 */
export async function generateA4PortraitPdf(element, title = 'Document') {
  if (!element) throw new Error('Target element not found');

  const pngData = await toPng(element, {
    ...PNG_OPTIONS,
    width: 794,
    height: 1123
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4', // 595.28 x 841.89 pt
    compress: true
  });

  pdf.addImage(pngData, 'PNG', 0, 0, 595.28, 841.89, undefined, 'FAST');
  return pdf;
}

/**
 * Capture Pedhinamu Page 1 & Page 2 (Legal Landscape 14in x 8.5in)
 */
export async function generatePedhinamuPdf(page1El, page2El) {
  if (!page1El || !page2El) throw new Error('Pedhinamu Page elements not found');

  // Ensure images are loaded
  const images = [
    ...Array.from(page1El.querySelectorAll('img')),
    ...Array.from(page2El.querySelectorAll('img'))
  ];
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  const pedhinamuPngOptions = {
    ...PNG_OPTIONS,
    pixelRatio: 4,
    width: 1344,
    height: 816
  };

  const [page1Png, page2Png] = await Promise.all([
    toPng(page1El, pedhinamuPngOptions),
    toPng(page2El, pedhinamuPngOptions)
  ]);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [1008, 612], // Legal Landscape
    compress: true
  });

  pdf.addImage(page1Png, 'PNG', 0, 0, 1008, 612, undefined, 'FAST');
  pdf.addPage([1008, 612], 'landscape');
  pdf.addImage(page2Png, 'PNG', 0, 0, 1008, 612, undefined, 'FAST');

  return pdf;
}

/**
 * Generate and download a complete ZIP package containing:
 * 1. Pedhinamu 2-page PDF
 * 2. Self-Declaration PDF
 * 3. Application (Talati) PDF
 */
export async function downloadAllPedhinamuZip({
  applicantName = 'Pedhinamu',
  page1El,
  page2El,
  selfDeclarationEl,
  applicationEl,
  onProgress
}) {
  const safeName = (applicantName || 'Pedhinamu').replace(/[\\/:*?"<>|]/g, '_');
  const zip = new JSZip();

  // 1. Pedhinamu
  if (onProgress) onProgress('Generating Pedhinamu PDF (1/3)...');
  const pedhinamuPdf = await generatePedhinamuPdf(page1El, page2El);
  const pedhinamuBlob = pedhinamuPdf.output('blob');
  zip.file(`1_${safeName}_Pedhinamu_Tree.pdf`, pedhinamuBlob);

  // 2. Self-Declaration
  if (onProgress) onProgress('Generating Self-Declaration PDF (2/3)...');
  const selfDeclPdf = await generateA4PortraitPdf(selfDeclarationEl, 'Self Declaration');
  const selfDeclBlob = selfDeclPdf.output('blob');
  zip.file(`2_${safeName}_Swa_Ghoshna_Self_Declaration.pdf`, selfDeclBlob);

  // 3. Application
  if (onProgress) onProgress('Generating Application PDF (3/3)...');
  const appPdf = await generateA4PortraitPdf(applicationEl, 'Application');
  const appBlob = appPdf.output('blob');
  zip.file(`3_${safeName}_Arji_Talati_Pedhinamu.pdf`, appBlob);

  // Build ZIP
  if (onProgress) onProgress('Packaging ZIP archive...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // Trigger download
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_Complete_Pedhinamu_Set.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}
