import { PROPERTY_TAX_LAYOUT } from '../constants/propertyTaxLayout';
import { fitGhanshyamText, fitGhanshyamBlock } from '../constants/propertyTaxFont';
import { normalizePropertyTaxMobile } from '../constants/propertyTaxData';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';

const GHANSHYAM_FONT = "'Ghanshyam', sans-serif";
const MOBILE_PREFIX = convertUnicodeToGhanshyamLegacy('મો.');

/** DD/MM/YYYY from the ISO value used by the date picker. */
export function formatPropertyTaxDate(iso) {
  const [year = '', month = '', day = ''] = String(iso || '').split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function pushCenteredText(ops, page, box, value, options = {}) {
  const text = String(value || '').trim();
  if (!text) return;
  const size = fitGhanshyamText(
    text,
    box.w - 6,
    options.maxSize ?? 12.5,
    options.minSize ?? 6.5
  );
  ops.push({
    type: 'text',
    page,
    text,
    x: box.x,
    y: box.top,
    w: box.w,
    h: box.h,
    size,
    align: 'center',
    fontFamily: GHANSHYAM_FONT,
  });
}

function pushLeftText(ops, page, box, value, options = {}) {
  const text = String(value || '').trim();
  if (!text) return;
  const size = fitGhanshyamText(
    text,
    box.w - 6,
    options.maxSize ?? 12.5,
    options.minSize ?? 6.5
  );
  ops.push({
    type: 'text',
    page,
    text,
    x: box.x,
    y: box.top,
    w: box.w,
    h: box.h,
    size,
    align: 'left',
    fontFamily: GHANSHYAM_FONT,
  });
}

function pushRightText(ops, page, box, value, options = {}) {
  const text = String(value || '').trim();
  if (!text) return;
  const size = fitGhanshyamText(
    text,
    box.w - 6,
    options.maxSize ?? 12.5,
    options.minSize ?? 6.5
  );
  ops.push({
    type: 'text',
    page,
    text,
    x: box.x,
    y: box.top,
    w: box.w,
    h: box.h,
    size,
    align: 'right',
    fontFamily: options.fontFamily || GHANSHYAM_FONT,
  });
}

function pushBlock(ops, page, box, value, options = {}) {
  const text = String(value || '').trim();
  if (!text) return;
  const { lines, size, lineHeight } = fitGhanshyamBlock(text, box.w, box.h, {
    maxSize: options.maxSize ?? 12.5,
    minSize: options.minSize ?? 7,
    lineHeightFactor: 1.18,
    paddingX: 6,
    paddingY: 4,
  });
  ops.push({
    type: 'block',
    page,
    lines,
    x: box.x,
    y: box.top,
    w: box.w,
    h: box.h,
    size,
    lineHeight,
    align: 'center',
    fontFamily: GHANSHYAM_FONT,
  });
}

/**
 * Build the drawable operations for the completed property-tax notice.
 * Page 2 is the corporation's office-use page and deliberately stays blank.
 */
export function buildPropertyTaxOverlays(data) {
  const ops = [];
  const page = PROPERTY_TAX_LAYOUT.page1;
  const booking = data?.booking || {};
  const owner = data?.owner || {};
  const transferee = data?.transferee || {};
  const numbers = data?.numbers || {};
  const boundaries = data?.boundaries || {};

  /* ---------------- Top property identifiers ---------------- */
  pushCenteredText(ops, 1, page.header.wardNo, booking.wardNo, { maxSize: 12 });
  pushCenteredText(ops, 1, page.header.locationNo, booking.locationNo, { maxSize: 12 });
  pushCenteredText(ops, 1, page.header.ownerNo, booking.ownerNo, { maxSize: 12 });
  pushCenteredText(ops, 1, page.header.occupierNo, booking.occupierNo, { maxSize: 12 });

  /* ---------------- Applicant mobile above the S.M.C. reference ---------------- */
  const mobile = normalizePropertyTaxMobile(data?.mobile);
  if (mobile) {
    pushRightText(ops, 1, page.mobile, `${MOBILE_PREFIX} ${mobile}`, {
      maxSize: 14,
      minSize: 10,
      fontFamily: GHANSHYAM_FONT,
    });
  }

  /* ---------------- “હું અમો … શ્રી / શ્રીમતી / કું” line ---------------- */
  pushCenteredText(
    ops,
    1,
    page.applicantName,
    data?.applicantName || transferee.name,
    { maxSize: 12.5, minSize: 6 }
  );

  /* ---------------- Numbered table ---------------- */
  pushBlock(
    ops,
    1,
    page.table.row1,
    [owner.name, owner.address].filter(Boolean).join('\n'),
    { maxSize: 12.5, minSize: 7 }
  );
  pushBlock(
    ops,
    1,
    page.table.row2,
    [transferee.name, transferee.address].filter(Boolean).join('\n'),
    { maxSize: 12.5, minSize: 7 }
  );
  pushBlock(ops, 1, page.table.row3, data?.division, { maxSize: 12.5, minSize: 7 });
  pushCenteredText(ops, 1, page.table.row4.ward, numbers.wardNo);
  pushCenteredText(ops, 1, page.table.row4.survey, numbers.surveyNo);
  pushCenteredText(ops, 1, page.table.row4.rs, numbers.rsNo);
  pushCenteredText(ops, 1, page.table.row5, data?.area, { maxSize: 12, minSize: 6.5 });
  pushCenteredText(ops, 1, page.table.row6.east, boundaries.east, { maxSize: 12, minSize: 6 });
  pushCenteredText(ops, 1, page.table.row6.west, boundaries.west, { maxSize: 12, minSize: 6 });
  pushCenteredText(ops, 1, page.table.row6.north, boundaries.north, { maxSize: 12, minSize: 6 });
  pushCenteredText(ops, 1, page.table.row6.south, boundaries.south, { maxSize: 12, minSize: 6 });
  pushBlock(ops, 1, page.table.row7, data?.documents, { maxSize: 12, minSize: 7 });

  /* ---------------- Date at the foot of page 1 ---------------- */
  const date = formatPropertyTaxDate(data?.date);
  if (date) {
    ops.push({
      type: 'rect',
      page: 1,
      x: page.datePatch.x,
      y: page.datePatch.top,
      w: page.datePatch.w,
      h: page.datePatch.h,
      fill: '#ffffff',
    });
    pushLeftText(ops, 1, page.date, date, { maxSize: 12.5, minSize: 7 });
  }

  return ops;
}
