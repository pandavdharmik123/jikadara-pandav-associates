import { CORRECTION_FORM_PAGES, CORRECTION_PAGE } from '../constants/correctionPanLayout';
import { buildCorrectionPanOverlays } from './correctionPanOverlay';
import { buildPdf, downloadPdf, printPdf } from './panPdfExport';

export const CORRECTION_TEMPLATE_URL = '/forms/pan-correction-form.pdf';

const baseOptions = {
  templateUrl: CORRECTION_TEMPLATE_URL,
  buildOverlays: buildCorrectionPanOverlays,
  formPages: CORRECTION_FORM_PAGES,
  pageSize: CORRECTION_PAGE,
  filePrefix: 'PAN-Correction',
};

export const buildCorrectionPdf = (data, options = {}) =>
  buildPdf(data, { ...baseOptions, ...options });

export const downloadCorrectionPdf = (data, options = {}) =>
  downloadPdf(data, { ...baseOptions, ...options });

export const printCorrectionPdf = (data, options = {}) =>
  printPdf(data, { ...baseOptions, ...options });
