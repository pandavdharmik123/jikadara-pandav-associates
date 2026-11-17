import {
  CORRECTION_FORM_PAGES,
  CORRECTION_LAYOUT,
  CORRECTION_SIGNATURE_BOXES,
} from '../constants/correctionPanLayout';
import {
  DEFAULT_SIGNATURE_ASPECT,
  clampDocumentPlacement,
  clampPlacement,
  createDocumentPlacement,
  createSignaturePlacements,
  placementHeight,
} from './panImages';
import { formatDate, pushAddress, pushGrid, pushText, pushTick } from './panOverlay';

const has = (list, value) => Array.isArray(list) && list.includes(value);

/**
 * Build every drawable operation required to fill the correction-request
 * template. The preview and the pdf-lib export share this function.
 */
export function buildCorrectionPanOverlays(data) {
  const ops = [];
  const p1 = CORRECTION_LAYOUT.page1;
  const p2 = CORRECTION_LAYOUT.page2;

  pushGrid(ops, 1, p1.pan, data.pan);
  pushGrid(ops, 1, p1.aadhaar, data.aadhaar);

  /* ---------------- Changes requested (left margin) ---------------- */
  pushTick(ops, 1, p1.changes.nameA, has(data.changes, 'NAME_A'));
  pushTick(ops, 1, p1.changes.nameB, has(data.changes, 'NAME_B'));
  pushTick(ops, 1, p1.changes.gender, has(data.changes, 'GENDER'));
  pushTick(ops, 1, p1.changes.dob, has(data.changes, 'DOB'));
  pushTick(ops, 1, p1.changes.address, has(data.changes, 'ADDRESS'));
  pushTick(ops, 1, p1.changes.passport, has(data.changes, 'PASSPORT'));
  pushTick(ops, 1, p1.changes.tin, has(data.changes, 'TIN'));
  pushTick(ops, 1, p1.changes.contact, has(data.changes, 'CONTACT'));
  pushTick(ops, 1, p1.changes.father, has(data.changes, 'FATHER'));
  pushTick(ops, 1, p1.changes.mother, has(data.changes, 'MOTHER'));

  /* ---------------- Part A · personal information ---------------- */
  pushGrid(ops, 1, p1.nameA.first, data.nameA?.first);
  pushGrid(ops, 1, p1.nameA.middle, data.nameA?.middle);
  pushGrid(ops, 1, p1.nameA.last, data.nameA?.last);

  pushGrid(ops, 1, p1.nameB.first, data.nameB?.first);
  pushGrid(ops, 1, p1.nameB.middle, data.nameB?.middle);
  pushGrid(ops, 1, p1.nameB.last, data.nameB?.last);

  pushTick(ops, 1, p1.gender.male, data.gender === 'MALE');
  pushTick(ops, 1, p1.gender.female, data.gender === 'FEMALE');
  pushTick(ops, 1, p1.gender.transgender, data.gender === 'TRANSGENDER');

  pushGrid(ops, 1, p1.dob.dd, data.dob?.split('-')[2]);
  pushGrid(ops, 1, p1.dob.mm, data.dob?.split('-')[1]);
  pushGrid(ops, 1, p1.dob.yyyy, data.dob?.split('-')[0]);

  pushTick(ops, 1, p1.addressType.residence, data.addressType === 'RESIDENCE');
  pushTick(ops, 1, p1.addressType.office, data.addressType === 'OFFICE');
  pushAddress(ops, 1, p1.address, data.address);

  pushGrid(ops, 1, p1.passport, data.passport);
  pushGrid(ops, 1, p1.tin, data.tin);

  // Country / ISD codes are right-aligned so "91" sits in the last boxes.
  pushGrid(ops, 1, p1.contact.mobileCode, data.contact?.mobileCode, { align: 'right' });
  pushGrid(ops, 1, p1.contact.mobile, data.contact?.mobile);
  pushText(ops, 1, p1.contact.email, data.contact?.email, { uppercase: false });
  pushGrid(ops, 1, p1.contact.isdCode, data.contact?.isdCode, { align: 'right' });
  pushGrid(ops, 1, p1.contact.stdCode, data.contact?.stdCode);
  pushGrid(ops, 1, p1.contact.landline, data.contact?.landline);

  /* ---------------- Part B · parents ---------------- */
  pushGrid(ops, 1, p1.father.first, data.father?.first);
  pushGrid(ops, 1, p1.father.middle, data.father?.middle);
  pushGrid(ops, 1, p1.father.last, data.father?.last);
  pushGrid(ops, 1, p1.mother.first, data.mother?.first);
  pushGrid(ops, 1, p1.mother.middle, data.mother?.middle);
  pushGrid(ops, 1, p1.mother.last, data.mother?.last);

  pushTick(ops, 1, p1.parentOnCard.father, data.parentOnCard === 'FATHER');
  pushTick(ops, 1, p1.parentOnCard.mother, data.parentOnCard === 'MOTHER');

  /* ---------------- Part C · documents ---------------- */
  pushTick(ops, 1, p1.proofs.identity, has(data.proofs, 'IDENTITY'));
  pushTick(ops, 1, p1.proofs.address, has(data.proofs, 'ADDRESS'));
  pushTick(ops, 1, p1.proofs.dob, has(data.proofs, 'DOB'));
  pushTick(ops, 1, p1.proofs.other, has(data.proofs, 'OTHER'));
  pushTick(ops, 1, p1.proofs.panCopy, has(data.proofs, 'PAN_COPY'));

  /* ---------------- Photographs ---------------- */
  if (data.photo) {
    ops.push({ type: 'image', page: 1, src: data.photo, x: p1.photoLeft.x, y: p1.photoLeft.top, w: p1.photoLeft.w, h: p1.photoLeft.h });
    ops.push({ type: 'image', page: 1, src: data.photo, x: p1.photoRight.x, y: p1.photoRight.top, w: p1.photoRight.w, h: p1.photoRight.h });
  }

  /* ---------------- Page 2 · verification & declaration ---------------- */
  pushText(ops, 2, p2.verifyName, data.declaration?.name, { maxSize: 8 });
  if (data.declaration?.capacity) {
    pushText(ops, 2, p2.verifyCapacity, data.declaration.capacity === 'SELF' ? 'Self' : 'Representative Assessee', {
      maxSize: 8,
      uppercase: false,
    });
  }
  pushText(ops, 2, p2.place, data.declaration?.place, { maxSize: 8 });
  pushText(ops, 2, p2.date, formatDate(data.declaration?.date), { maxSize: 8 });

  /* ---------------- Signature (photo + signature box) ---------------- */
  if (data.signature) {
    const aspect = data.signatureAspect || DEFAULT_SIGNATURE_ASPECT;
    const defaults = createSignaturePlacements(aspect, CORRECTION_SIGNATURE_BOXES);
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
    const placement = clampDocumentPlacement(doc.placement || createDocumentPlacement(doc.aspect || 1));
    ops.push({
      type: 'image',
      kind: 'document',
      docId: doc.id,
      page: CORRECTION_FORM_PAGES + index + 1,
      src: doc.src,
      ...placement,
    });
  });

  return ops;
}
