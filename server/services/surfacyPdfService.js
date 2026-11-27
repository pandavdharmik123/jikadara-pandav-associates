import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const CANDIDATE_SOFFICE_PATHS = [
  'soffice',
  'libreoffice',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/usr/bin/soffice',
  '/usr/bin/libreoffice',
  '/usr/local/bin/soffice',
];

async function findLibreOfficeBinary() {
  for (const candidate of CANDIDATE_SOFFICE_PATHS) {
    try {
      if (candidate.startsWith('/')) {
        await fs.access(candidate);
        return candidate;
      }
      const { stdout } = await execFileAsync('which', [candidate]);
      const resolved = stdout.trim();
      if (resolved) return resolved;
    } catch {
      // Try next candidate
    }
  }
  return null;
}

export class PdfConverterUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PdfConverterUnavailableError';
    this.code = 'PDF_CONVERTER_UNAVAILABLE';
  }
}

/**
 * Convert a finalized DOCX Buffer to PDF using LibreOffice headless so the PDF
 * matches the exact DOCX page layout, margins, fonts, tables, and page breaks.
 */
export async function convertDocxBufferToPdf(docxBuffer, baseName = 'surfacy-filing') {
  const soffice = await findLibreOfficeBinary();
  if (!soffice) {
    throw new PdfConverterUnavailableError(
      'LibreOffice (soffice) is not installed on the server. Install LibreOffice to enable server-side DOCX-to-PDF conversion, or use the Preview Print / Save as PDF button.'
    );
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'surfacy-pdf-'));
  const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'surfacy-filing';
  const docxPath = path.join(tmpDir, `${safeName}.docx`);
  const pdfPath = path.join(tmpDir, `${safeName}.pdf`);

  try {
    await fs.writeFile(docxPath, docxBuffer);
    await execFileAsync(
      soffice,
      ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', tmpDir, docxPath],
      { timeout: 60000 }
    );
    const pdfBuffer = await fs.readFile(pdfPath);
    return pdfBuffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function isPdfConverterAvailable() {
  return Boolean(await findLibreOfficeBinary());
}
