/** Surat Municipal Corporation property-tax name-transfer form (S.M.C. P. No.81). */
export const PROPERTY_TAX_PAGE = { width: 612.36, height: 1006.44 };
export const PROPERTY_TAX_FORM_PAGES = 2;
export const PROPERTY_TAX_TEMPLATE_URL = '/forms/property-tax-name-transfer.pdf';

/**
 * Overlay boxes in PDF points, measured from the top-left corner of the
 * template. The preview and the pdf-lib exporter both use these coordinates.
 */
export const PROPERTY_TAX_LAYOUT = {
  page1: {
    header: {
      wardNo: { x: 95.66, top: 168.26, w: 87.75, h: 20.76 },
      locationNo: { x: 183.89, top: 168.26, w: 131.18, h: 20.76 },
      ownerNo: { x: 315.55, top: 168.26, w: 98.9, h: 20.76 },
      occupierNo: { x: 414.94, top: 168.26, w: 113.54, h: 20.76 },
    },
    // Optional applicant mobile number, printed above the S.M.C. reference on
    // the top-right edge of page 1. The S.M.C. line occupies top 51.86–61.80.
    mobile: { x: 430, top: 34, w: 122.12, h: 16 },
    applicantName: { x: 358.87, top: 343, w: 181.25, h: 15.5 },
    table: {
      row1: { x: 323.59, top: 487.97, w: 227.93, h: 49.34 },
      row2: { x: 323.59, top: 537.79, w: 227.93, h: 52.56 },
      row3: { x: 323.59, top: 590.83, w: 227.93, h: 45.12 },
      row4: {
        ward: { x: 323.59, top: 652, w: 227.93, h: 16.5 },
        survey: { x: 323.59, top: 668.1, w: 227.93, h: 16.5 },
        rs: { x: 323.59, top: 684.2, w: 227.93, h: 16.5 },
      },
      row5: { x: 323.59, top: 701.26, w: 227.93, h: 32.52 },
      row6: {
        east: { x: 323.59, top: 738.2, w: 227.93, h: 16.5 },
        west: { x: 323.59, top: 754.3, w: 227.93, h: 16.5 },
        north: { x: 323.59, top: 770.4, w: 227.93, h: 16.5 },
        south: { x: 323.59, top: 786.5, w: 227.93, h: 16.5 },
      },
      row7: { x: 323.59, top: 807.94, w: 227.93, h: 51.48 },
    },
    // The template prints two small dashes here; a white patch hides them
    // before the completed date is drawn in their place.
    datePatch: { x: 126, top: 936, w: 238, h: 20 },
    date: { x: 126, top: 938.5, w: 238, h: 17 },
  },
};
