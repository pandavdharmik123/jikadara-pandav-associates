import { rgb } from 'pdf-lib';
import { buildPdf, downloadPdf, printPdf } from './panPdfExport';
import { buildPropertyTaxOverlays } from './propertyTaxOverlay';
import {
  PROPERTY_TAX_FORM_PAGES,
  PROPERTY_TAX_PAGE,
  PROPERTY_TAX_TEMPLATE_URL,
} from '../constants/propertyTaxLayout';

const NILKANTH_URL = '/nilkanth.ttf';
const GHANSHYAM_URL = '/Ghanshyam.ttf';

let fontPromise = null;
let ghanshyamPromise = null;

function loadFont(url, label, reset) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load the ${label} font (${response.status}).`);
      }
      return response.arrayBuffer();
    })
    .catch((error) => {
      reset();
      throw error;
    });
}

/** Fetch the Nilkanth TrueType file once and keep it in memory. */
export function loadPropertyTaxFont() {
  if (!fontPromise) {
    fontPromise = loadFont(NILKANTH_URL, 'Nilkanth', () => {
      fontPromise = null;
    });
  }
  return fontPromise;
}

/** Fetch the Ghanshyam TrueType file once and keep it in memory. */
export function loadPropertyTaxGhanshyamFont() {
  if (!ghanshyamPromise) {
    ghanshyamPromise = loadFont(GHANSHYAM_URL, 'Ghanshyam', () => {
      ghanshyamPromise = null;
    });
  }
  return ghanshyamPromise;
}

async function loadPropertyTaxFonts() {
  const [fontBytes, ghanshyam] = await Promise.all([
    loadPropertyTaxFont(),
    loadPropertyTaxGhanshyamFont(),
  ]);
  return { fontBytes, extraFonts: { ghanshyam } };
}

async function buildPropertyTaxPdf(data, options = {}) {
  const { fontBytes, extraFonts } = await loadPropertyTaxFonts();
  return buildPdf(data, {
    templateUrl: PROPERTY_TAX_TEMPLATE_URL,
    maxPages: options.maxPages ?? PROPERTY_TAX_FORM_PAGES,
    buildOverlays: buildPropertyTaxOverlays,
    formPages: PROPERTY_TAX_FORM_PAGES,
    pageSize: PROPERTY_TAX_PAGE,
    fontBytes,
    extraFonts,
    inkColor: rgb(0, 0, 0),
  });
}

export async function downloadPropertyTaxPdf(data, options = {}) {
  const { fontBytes, extraFonts } = await loadPropertyTaxFonts();
  return downloadPdf(data, {
    ...options,
    templateUrl: PROPERTY_TAX_TEMPLATE_URL,
    maxPages: options.maxPages ?? PROPERTY_TAX_FORM_PAGES,
    buildOverlays: buildPropertyTaxOverlays,
    formPages: PROPERTY_TAX_FORM_PAGES,
    pageSize: PROPERTY_TAX_PAGE,
    fontBytes,
    extraFonts,
    inkColor: rgb(0, 0, 0),
    filePrefix: 'Property-Tax-Name-Transfer',
  });
}

export async function printPropertyTaxPdf(data, options = {}) {
  const { fontBytes, extraFonts } = await loadPropertyTaxFonts();
  return printPdf(data, {
    ...options,
    templateUrl: PROPERTY_TAX_TEMPLATE_URL,
    maxPages: options.maxPages ?? PROPERTY_TAX_FORM_PAGES,
    buildOverlays: buildPropertyTaxOverlays,
    formPages: PROPERTY_TAX_FORM_PAGES,
    pageSize: PROPERTY_TAX_PAGE,
    fontBytes,
    extraFonts,
    inkColor: rgb(0, 0, 0),
    filePrefix: 'Property-Tax-Name-Transfer',
  });
}

export { buildPropertyTaxPdf };
