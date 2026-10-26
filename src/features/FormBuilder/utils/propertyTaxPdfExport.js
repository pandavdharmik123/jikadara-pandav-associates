import { rgb } from 'pdf-lib';
import { buildPdf, downloadPdf, printPdf } from './panPdfExport';
import { buildPropertyTaxOverlays } from './propertyTaxOverlay';
import {
  PROPERTY_TAX_FORM_PAGES,
  PROPERTY_TAX_PAGE,
  PROPERTY_TAX_TEMPLATE_URL,
} from '../constants/propertyTaxLayout';

const NILKANTH_URL = '/nilkanth.ttf';

let fontPromise = null;

/** Fetch the Nilkanth TrueType file once and keep it in memory. */
export function loadPropertyTaxFont() {
  if (!fontPromise) {
    fontPromise = fetch(NILKANTH_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load the Nilkanth font (${response.status}).`);
        }
        return response.arrayBuffer();
      })
      .catch((error) => {
        fontPromise = null;
        throw error;
      });
  }
  return fontPromise;
}

async function buildPropertyTaxPdf(data, options = {}) {
  const fontBytes = await loadPropertyTaxFont();
  return buildPdf(data, {
    templateUrl: PROPERTY_TAX_TEMPLATE_URL,
    maxPages: options.maxPages ?? PROPERTY_TAX_FORM_PAGES,
    buildOverlays: buildPropertyTaxOverlays,
    formPages: PROPERTY_TAX_FORM_PAGES,
    pageSize: PROPERTY_TAX_PAGE,
    fontBytes,
    inkColor: rgb(0, 0, 0),
  });
}

export async function downloadPropertyTaxPdf(data, options = {}) {
  const fontBytes = await loadPropertyTaxFont();
  return downloadPdf(data, {
    ...options,
    templateUrl: PROPERTY_TAX_TEMPLATE_URL,
    maxPages: options.maxPages ?? PROPERTY_TAX_FORM_PAGES,
    buildOverlays: buildPropertyTaxOverlays,
    formPages: PROPERTY_TAX_FORM_PAGES,
    pageSize: PROPERTY_TAX_PAGE,
    fontBytes,
    inkColor: rgb(0, 0, 0),
    filePrefix: 'Property-Tax-Name-Transfer',
  });
}

export async function printPropertyTaxPdf(data, options = {}) {
  const fontBytes = await loadPropertyTaxFont();
  return printPdf(data, {
    ...options,
    templateUrl: PROPERTY_TAX_TEMPLATE_URL,
    maxPages: options.maxPages ?? PROPERTY_TAX_FORM_PAGES,
    buildOverlays: buildPropertyTaxOverlays,
    formPages: PROPERTY_TAX_FORM_PAGES,
    pageSize: PROPERTY_TAX_PAGE,
    fontBytes,
    inkColor: rgb(0, 0, 0),
    filePrefix: 'Property-Tax-Name-Transfer',
  });
}

export { buildPropertyTaxPdf };
