/**
 * Coordinate map for "Request For Changes Or Correction in PAN Data"
 * (CORRECTION PANCARD FORM.pdf).
 *
 * All values are expressed in PDF points with a TOP-LEFT origin, exactly as
 * measured from the original template, so the preview overlay and the
 * pdf-lib export can share the same numbers.
 *
 *  - `grid` -> a row of character boxes (one character per box)
 *  - `box`  -> a free-text area (single line, shrink to fit)
 *  - `tick` -> a printed "Tick" square that receives a check mark
 */

export const CORRECTION_PAGE = { width: 595.276, height: 841.89 };

/** Pages 1–2 are the fillable form; pages 3–4 are the printed guidelines. */
export const CORRECTION_FORM_PAGES = 2;

const grid = (x, top, count, w, h = 11.5) => ({ x, top, count, w, h });
const box = (x, top, w, h = 11.5) => ({ x, top, w, h });
const tick = (x, top, w, h = 11.5) => ({ x, top, w, h });

export const CORRECTION_LAYOUT = {
  page1: {
    // Photographs – left copy carries the signature/thumb impression.
    photoLeft: box(35.15, 23.21, 99.28, 127.63),
    photoRight: box(460.82, 23.35, 99.28, 127.63),

    // PAN / Aadhaar at the top of the form.
    pan: grid(227.02, 86.67, 10, 14.74),
    aadhaar: grid(212.27, 127.49, 12, 14.74),

    // Left-margin "Tick" boxes for the items being corrected.
    changes: {
      nameA: tick(73.82, 188.9, 17.08, 13.1),
      nameB: tick(73.8, 247.27, 17.44, 13.09),
      gender: tick(74.1, 302.52, 16.61, 11.49),
      dob: tick(74.15, 315.93, 16.44, 11.49),
      address: tick(74.13, 331.92, 16.52, 13.1),
      passport: tick(74.15, 444.86, 16.56, 11.49),
      tin: tick(74.1, 458.27, 16.52, 11.49),
      contact: tick(74.1, 487.67, 16.55, 13.1),
      father: tick(75.46, 603.86, 16.55, 11.49),
      mother: tick(75.51, 644.09, 16.5, 11.5),
    },

    // 1 A – Name
    nameA: {
      first: grid(176.6, 203.92, 25, 15.34, 11.49),
      middle: grid(176.6, 217.33, 25, 15.34, 11.49),
      last: grid(176.53, 230.74, 25, 15.34, 12.03),
    },
    // 1 B – Name as per Aadhaar
    nameB: {
      first: grid(176.6, 262.3, 25, 15.34, 11.49),
      middle: grid(176.6, 275.7, 25, 15.34, 11.49),
      last: grid(176.6, 289.1, 25, 15.34, 11.49),
    },

    // 2 Gender
    gender: {
      male: tick(176.6, 302.52, 15.77, 11.49),
      female: tick(222.76, 302.52, 15.77, 11.49),
      transgender: tick(283.84, 302.52, 15.78, 11.49),
    },

    // 3 Date of Birth
    dob: {
      dd: grid(176.35, 315.93, 2, 15.84, 11.49),
      mm: grid(222.19, 315.93, 2, 15.84, 11.49),
      yyyy: grid(268.28, 315.93, 4, 15.03, 11.49),
    },

    // 4 Address type
    addressType: {
      residence: tick(176.67, 349.4, 19.13, 13.1),
      office: tick(258.87, 349.4, 19.14, 13.1),
    },
    address: {
      flat: grid(176.67, 364.4, 25, 15.34, 11.49),
      road: grid(176.65, 377.8, 25, 15.34, 11.49),
      post: grid(176.6, 391.2, 25, 15.34, 11.49),
      area: grid(176.6, 404.6, 25, 15.34, 11.49),
      district: grid(176.65, 418.0, 25, 15.34, 11.49),
      state: box(132.99, 431.4, 81.49),
      country: box(289.84, 431.4, 96.77),
      pin: grid(452.98, 431.4, 7, 15.35),
    },

    // 5 Passport, 6 TIN
    passport: grid(383.24, 444.86, 12, 14.74, 11.49),
    tin: grid(264.9, 471.7, 20, 14.74, 11.49),

    // 7 Contact details
    contact: {
      mobileCode: grid(279.21, 508.3, 3, 14.74, 11.49),
      mobile: grid(413.01, 508.3, 10, 14.74, 11.49),
      email: box(278.89, 521.7, 281.8, 11.49),
      isdCode: grid(278.93, 535.1, 4, 14.74, 11.49),
      stdCode: grid(416.31, 535.1, 4, 14.9, 11.49),
      landline: grid(279.68, 558.1, 8, 14.74, 11.49),
    },

    // 8 Father, 9 Mother
    father: {
      first: grid(176.77, 603.86, 25, 15.34, 11.49),
      middle: grid(177.02, 617.27, 25, 15.34, 11.49),
      last: grid(176.95, 630.68, 25, 15.34, 11.49),
    },
    mother: {
      first: grid(176.74, 644.09, 25, 15.34, 11.49),
      middle: grid(176.74, 657.51, 25, 15.34, 11.49),
      last: grid(176.88, 670.92, 25, 15.34, 11.49),
    },

    // 10 Parent name printed on the PAN card
    parentOnCard: {
      father: tick(340.87, 686.91, 20.55, 13.1),
      mother: tick(409.61, 686.91, 19.84, 13.1),
    },

    // 11 Documents submitted
    proofs: {
      identity: tick(68.45, 748.93, 14.87, 11.49),
      address: tick(167.08, 748.93, 14.87, 11.49),
      dob: tick(267.99, 748.93, 14.87, 11.49),
      other: tick(68.45, 772.92, 14.87, 11.49),
      panCopy: tick(267.87, 772.92, 14.87, 11.49),
    },
  },

  page2: {
    // Verification & Declaration
    verifyName: box(77, 52.5, 142, 11),
    verifyCapacity: box(279.2, 52.5, 135, 11),
    place: box(99.5, 93.5, 120, 11),
    date: box(100.5, 118.4, 120, 11),
    signature: box(328.61, 141.88, 201.3, 61.49),
  },
};

/** Printed boxes used for the two default signature placements. */
export const CORRECTION_SIGNATURE_BOXES = {
  page1: CORRECTION_LAYOUT.page1.photoLeft,
  page2: CORRECTION_LAYOUT.page2.signature,
};
