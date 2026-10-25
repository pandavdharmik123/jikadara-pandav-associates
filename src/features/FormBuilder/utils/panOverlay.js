import { PAN_FORM_PAGES, PAN_LAYOUT, PAN_SMALL_SIZE, PAN_VALUE_SIZE } from '../constants/panLayout';
import {
  DEFAULT_SIGNATURE_ASPECT,
  clampDocumentPlacement,
  clampPlacement,
  createDocumentPlacement,
  createSignaturePlacements,
  placementHeight,
} from './panImages';

/**
 * Helvetica advance widths (units/1000) for printable ASCII. Used to size the
 * free-text values so long addresses / e-mails still fit inside their printed
 * boxes. The same numbers are used by the preview and by the PDF export, so
 * both always agree.
 */
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** Width of `text` in PDF points at `size`. */
export function measureText(text, size) {
  let total = 0;
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    total += code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32] : 556;
  }
  return (total / 1000) * size;
}

/** Largest font size (between `min` and `max`) that fits `width`. */
export function fitFontSize(text, width, max = PAN_VALUE_SIZE, min = 5) {
  let size = max;
  while (size > min && measureText(text, size) > width) size -= 0.1;
  return Math.max(min, Math.round(size * 10) / 10);
}

const upper = (value) => String(value || '').toUpperCase();
const normalize = (value) => upper(value).replace(/\s+/g, ' ').trim();

/** Split a value into form characters – a space consumes one blank box. */
function toFormChars(value) {
  const normalized = normalize(value);
  const chars = [];
  for (let i = 0; i < normalized.length; i += 1) {
    chars.push(normalized[i] === ' ' ? '' : normalized[i]);
  }
  return chars;
}

/**
 * Distribute characters over one or more character-box rows.
 * Extra characters that do not fit are dropped (the UI already blocks typing
 * beyond the available boxes).
 *
 * `align: 'right'` keeps the digits flush with the last box (used for country
 * codes, e.g. "91" in a 3-box field prints in the 2nd and 3rd boxes).
 */
export function pushGrid(ops, page, rows, value, { align = 'left' } = {}) {
  if (!value) return;
  const rowList = Array.isArray(rows) ? rows : [rows];
  const chars = toFormChars(value);
  if (!chars.length) return;
  const capacity = rowList.reduce((total, row) => total + row.count, 0);
  const offset = align === 'right' ? Math.max(0, capacity - chars.length) : 0;
  let index = 0;
  let box = 0;
  for (let r = 0; r < rowList.length && index < chars.length; r += 1) {
    const row = rowList[r];
    for (let c = 0; c < row.count && index < chars.length; c += 1) {
      const position = box;
      box += 1;
      if (position < offset) continue;
      const ch = chars[index];
      index += 1;
      if (!ch) continue;
      ops.push({
        type: 'char',
        page,
        ch,
        x: row.x + c * row.w,
        y: row.top,
        w: row.w,
        h: row.h,
        size: PAN_VALUE_SIZE,
      });
    }
  }
}

export function pushText(ops, page, box, value, { uppercase = true, maxSize = PAN_VALUE_SIZE, align = 'left' } = {}) {
  const text = (uppercase ? upper(value) : String(value || '')).trim();
  if (!text) return;
  const size = fitFontSize(text, box.w - 4, maxSize);
  ops.push({
    type: 'text',
    page,
    text,
    x: box.x,
    y: box.top,
    w: box.w,
    h: box.h,
    size,
    align,
  });
}

export function pushTick(ops, page, box, selected) {
  if (!selected) return;
  ops.push({ type: 'tick', page, x: box.x, y: box.top, w: box.w, h: box.h });
}

export function pushAddress(ops, page, layout, value = {}) {
  pushGrid(ops, page, layout.flat, value.flat);
  pushGrid(ops, page, layout.road, value.road);
  pushGrid(ops, page, layout.post, value.post);
  pushGrid(ops, page, layout.area, value.area);
  pushGrid(ops, page, layout.district, value.district);
  pushText(ops, page, layout.state, value.state);
  pushText(ops, page, layout.country, value.country);
  pushGrid(ops, page, layout.pin, value.pin);
}

/** Turn an ISO date (YYYY-MM-DD) into the form's day / month / year parts. */
const dateParts = (iso) => {
  const [year = '', month = '', day = ''] = String(iso || '').split('-');
  return { day, month, year };
};

/** DD/MM/YYYY for the verification block. */
export const formatDate = (iso) => {
  const { day, month, year } = dateParts(iso);
  if (!day || !month || !year) return '';
  return `${day}/${month}/${year}`;
};

/**
 * Build every drawable operation required to fill the template.
 * Consumed by both the live preview and the pdf-lib export.
 */
export function buildPanOverlays(data) {
  const ops = [];
  const p1 = PAN_LAYOUT.page1;
  const p2 = PAN_LAYOUT.page2;

  /* ---------------- Page 1 · Part A ---------------- */
  pushGrid(ops, 1, p1.firstName, data.firstName);
  pushGrid(ops, 1, p1.middleName, data.middleName);
  pushGrid(ops, 1, p1.lastName, data.lastName);
  pushGrid(ops, 1, p1.aadhaarName, data.aadhaarName);

  pushTick(ops, 1, p1.gender.male, data.gender === 'MALE');
  pushTick(ops, 1, p1.gender.female, data.gender === 'FEMALE');
  pushTick(ops, 1, p1.gender.transgender, data.gender === 'TRANSGENDER');

  const dob = dateParts(data.dob);
  pushGrid(ops, 1, p1.dob.dd, dob.day);
  pushGrid(ops, 1, p1.dob.mm, dob.month);
  pushGrid(ops, 1, p1.dob.yyyy, dob.year);

  pushGrid(ops, 1, p1.aadhaar, data.aadhaar);
  pushAddress(ops, 1, p1.residence, data.residence);
  pushAddress(ops, 1, p1.office, data.office);

  pushTick(ops, 1, p1.residentialStatus.resident, data.residentialStatus === 'RESIDENT');
  pushTick(ops, 1, p1.residentialStatus.nonResident, data.residentialStatus === 'NON_RESIDENT');
  pushTick(ops, 1, p1.residentialStatus.rnor, data.residentialStatus === 'RNOR');

  pushGrid(ops, 1, p1.passport, data.passport);
  pushGrid(ops, 1, p1.tin, data.tin);

  pushGrid(ops, 1, p1.mobileCode, data.contact?.mobileCode, { align: 'right' });
  pushGrid(ops, 1, p1.mobile, data.contact?.mobile);
  pushText(ops, 1, p1.email, data.contact?.email, { uppercase: false });
  pushGrid(ops, 1, p1.stdCode, data.contact?.stdCode);
  pushGrid(ops, 1, p1.landline, data.contact?.landline);

  /* ---------------- Page 1 · Part B ---------------- */
  const sources = data.sources || [];
  pushTick(ops, 1, p1.sources.salary, sources.includes('SALARY'));
  pushTick(ops, 1, p1.sources.business, sources.includes('BUSINESS'));
  pushTick(ops, 1, p1.sources.houseProperty, sources.includes('HOUSE_PROPERTY'));
  pushTick(ops, 1, p1.sources.capitalGains, sources.includes('CAPITAL_GAINS'));
  pushTick(ops, 1, p1.sources.otherSources, sources.includes('OTHER_SOURCES'));
  pushTick(ops, 1, p1.sources.noIncome, sources.includes('NO_INCOME'));

  /* ---------------- Page 1 · Part C ---------------- */
  pushTick(ops, 1, p1.singleParent.yes, data.singleParent === 'YES');
  pushTick(ops, 1, p1.singleParent.no, data.singleParent === 'NO');
  pushGrid(ops, 1, p1.fatherFirst, data.father?.first);
  pushGrid(ops, 1, p1.fatherMiddle, data.father?.middle);
  pushGrid(ops, 1, p1.fatherLast, data.father?.last);

  /* ---------------- Page 1 · photographs ---------------- */
  if (data.photo) {
    ops.push({ type: 'image', page: 1, src: data.photo, x: p1.photoLeft.x, y: p1.photoLeft.top, w: p1.photoLeft.w, h: p1.photoLeft.h });
    ops.push({ type: 'image', page: 1, src: data.photo, x: p1.photoRight.x, y: p1.photoRight.top, w: p1.photoRight.w, h: p1.photoRight.h });
  }

  /* ---------------- Page 2 · Part C (continued) ---------------- */
  pushGrid(ops, 2, p2.motherFirst, data.mother?.first);
  pushGrid(ops, 2, p2.motherMiddle, data.mother?.middle);
  pushGrid(ops, 2, p2.motherLast, data.mother?.last);
  pushTick(ops, 2, p2.parentOnCard.father, data.parentOnCard === 'FATHER');
  pushTick(ops, 2, p2.parentOnCard.mother, data.parentOnCard === 'MOTHER');

  /* ---------------- Page 2 · Part D ---------------- */
  pushGrid(ops, 2, p2.aoArea, data.ao?.area);
  pushGrid(ops, 2, p2.aoType, data.ao?.type);
  pushGrid(ops, 2, p2.aoRange, data.ao?.range);
  pushGrid(ops, 2, p2.aoNumber, data.ao?.number);

  /* ---------------- Page 2 · Part E ---------------- */
  if (data.raApplicable) {
    pushGrid(ops, 2, p2.raFirst, data.ra?.first);
    pushGrid(ops, 2, p2.raMiddle, data.ra?.middle);
    pushGrid(ops, 2, p2.raLast, data.ra?.last);
    pushGrid(ops, 2, p2.raPan, data.ra?.pan);
    pushGrid(ops, 2, p2.raAadhaar, data.ra?.aadhaar);
    pushAddress(ops, 2, p2.raAddress, data.ra?.address);
    pushGrid(ops, 2, p2.raMobileCode, data.ra?.contact?.mobileCode, { align: 'right' });
    pushGrid(ops, 2, p2.raMobile, data.ra?.contact?.mobile);
    pushText(ops, 2, p2.raEmail, data.ra?.contact?.email, { uppercase: false });
    pushGrid(ops, 2, p2.raStdCode, data.ra?.contact?.stdCode);
    pushGrid(ops, 2, p2.raLandline, data.ra?.contact?.landline);
  }

  /* ---------------- Page 2 · Part F ---------------- */
  pushTick(ops, 2, p2.communication.residence, data.communication === 'RESIDENCE');
  pushTick(ops, 2, p2.communication.ra, data.communication === 'RA');
  pushTick(ops, 2, p2.communication.office, data.communication === 'OFFICE');

  /* ---------------- Page 2 · Part G ---------------- */
  const docs = data.applicantDocs || [];
  pushTick(ops, 2, p2.applicantDocs.poi, docs.includes('POI'));
  pushTick(ops, 2, p2.applicantDocs.poa, docs.includes('POA'));
  pushTick(ops, 2, p2.applicantDocs.pdob, docs.includes('PDOB'));

  const raDocs = data.raDocs || [];
  if (data.raApplicable) {
    pushTick(ops, 2, p2.raDocs.poi, raDocs.includes('POI'));
    pushTick(ops, 2, p2.raDocs.poa, raDocs.includes('POA'));
  }

  pushText(ops, 2, p2.verifyName, data.declaration?.name, { maxSize: PAN_SMALL_SIZE });
  if (data.declaration?.capacity) {
    pushText(
      ops,
      2,
      p2.verifyCapacity,
      data.declaration.capacity === 'SELF' ? 'Self' : 'Representative Assessee',
      { maxSize: PAN_SMALL_SIZE, uppercase: false }
    );
  }
  pushText(ops, 2, p2.place, data.declaration?.place);
  pushText(ops, 2, p2.date, formatDate(data.declaration?.date));
  pushText(ops, 2, p2.printName, data.declaration?.name, { maxSize: PAN_SMALL_SIZE });
  pushText(ops, 2, p2.designation, data.declaration?.designation, { maxSize: PAN_SMALL_SIZE });

  /* ---------------- Signature (photograph + signature box) ---------------- */
  if (data.signature) {
    const aspect = data.signatureAspect || DEFAULT_SIGNATURE_ASPECT;
    const defaults = createSignaturePlacements(aspect);
    const stored = data.signaturePlacements || {};
    const onPage1 = clampPlacement(stored.page1 || defaults.page1, aspect);
    const onPage2 = clampPlacement(stored.page2 || defaults.page2, aspect);

    ops.push({
      type: 'image',
      kind: 'signature',
      page: 1,
      src: data.signature,
      x: onPage1.x,
      y: onPage1.y,
      w: onPage1.w,
      h: placementHeight(onPage1, aspect),
    });
    ops.push({
      type: 'image',
      kind: 'signature',
      page: 2,
      src: data.signature,
      x: onPage2.x,
      y: onPage2.y,
      w: onPage2.w,
      h: placementHeight(onPage2, aspect),
    });
  }

  /* ---------------- Other documents (one appended page each) ---------------- */
  const documents = (data.documents || []).filter((doc) => doc && doc.src);
  documents.forEach((doc, index) => {
    const placement = clampDocumentPlacement(
      doc.placement || createDocumentPlacement(doc.aspect || 1)
    );
    ops.push({
      type: 'image',
      kind: 'document',
      docId: doc.id,
      page: PAN_FORM_PAGES + index + 1,
      src: doc.src,
      ...placement,
    });
  });

  return ops;
}
