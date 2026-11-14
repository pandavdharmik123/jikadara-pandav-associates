/**
 * Coordinate map for "FORM NO. 93 – Application for Allotment of Permanent
 * Account Number" (NEW APPLICATION FORM PANCARD.pdf).
 *
 * All values are expressed in PDF points with a TOP-LEFT origin, exactly as
 * measured from the original template, so the preview overlay and the
 * pdf-lib export can share the same numbers.
 *
 *  - `grid`  -> a row of character boxes (one character per box)
 *  - `box`   -> a free-text area (single line, shrink to fit)
 *  - `tick`  -> a printed "Tick" square that receives a check mark
 */

export const PAN_PAGE = { width: 595.276, height: 841.89 };

/**
 * Number of fillable pages in the template. Pages 3–5 only carry the printed
 * notes and filling guidelines, so they are not part of the preview / export.
 */
export const PAN_FORM_PAGES = 2;

/** Font size used for values written inside the form. */
export const PAN_VALUE_SIZE = 9;
/** Font size used for the small print on the verification block. */
export const PAN_SMALL_SIZE = 8;
/** Keep glyphs away from the printed box borders. */
export const PAN_INSET = 0.7;

const grid = (x, top, count, w, h = 11) => ({ x, top, count, w, h });
const box = (x, top, w, h = 11) => ({ x, top, w, h });
const tick = (x, top, w, h = 11) => ({ x, top, w, h });

export const PAN_LAYOUT = {
  page1: {
    // 1(A) Name
    firstName: grid(180.36, 195.3, 25, 15.37),
    middleName: grid(180.48, 208.7, 25, 15.36),
    lastName: grid(180.48, 222.1, 25, 15.36, 11.5),
    // 1(B) Name as per Aadhaar – flows over three rows (75 boxes)
    aadhaarName: [
      grid(180.31, 253.1, 25, 15.36),
      grid(180.59, 266.5, 25, 15.36),
      grid(180.36, 279.9, 25, 15.36),
    ],
    // 2 Gender
    gender: {
      male: tick(180.36, 293.4, 16.28),
      female: tick(226.52, 293.4, 16.28),
      transgender: tick(287.61, 293.4, 16.27),
    },
    // 3 Date of Birth
    dob: {
      dd: grid(180.53, 306.8, 2, 15.84),
      mm: grid(226.38, 306.8, 2, 15.84),
      yyyy: grid(272.47, 306.8, 4, 15.03),
    },
    // 4 Aadhaar Number
    aadhaar: grid(180.34, 320.2, 12, 15.17),
    // 5 Residence address
    residence: {
      flat: grid(180.34, 350.7, 25, 15.36),
      road: grid(180.49, 364.1, 25, 15.36),
      post: grid(180.56, 377.5, 25, 15.36),
      area: grid(180.7, 390.9, 25, 15.36),
      district: grid(180.77, 404.3, 25, 15.36),
      state: box(132.98, 417.7, 81.99),
      country: box(289.83, 417.7, 97.27),
      pin: grid(457.07, 417.7, 7, 15.43),
    },
    // 6 Office address
    office: {
      flat: grid(180.53, 448.3, 25, 15.36),
      road: grid(180.65, 461.7, 25, 15.36),
      post: grid(180.65, 475.1, 25, 15.36),
      area: grid(180.48, 488.5, 25, 15.36),
      district: grid(180.36, 501.9, 25, 15.37),
      state: box(132.98, 515.3, 81.99),
      country: box(289.83, 515.3, 97.27),
      pin: grid(457.07, 515.3, 7, 15.43),
    },
    // 7 Residential status
    residentialStatus: {
      resident: tick(210.65, 532.2, 15.32),
      nonResident: tick(272.73, 532.2, 15.32),
      rnor: tick(349.97, 532.2, 15.33),
    },
    // 8 Passport number
    passport: grid(328.57, 552.0, 12, 14.78),
    // 9 TIN
    tin: grid(269.77, 572.1, 20, 14.77),
    // 10 Contact details
    mobileCode: grid(240.06, 602.6, 3, 14.91),
    mobile: grid(376.92, 602.6, 10, 14.79),
    email: box(239.99, 616.0, 326.94),
    stdCode: grid(240.11, 629.4, 4, 14.86),
    landline: grid(377.49, 629.4, 8, 14.97),
    // 11 Source of income
    sources: {
      salary: tick(179.15, 669.2, 15.32),
      business: tick(256.0, 669.2, 15.33),
      houseProperty: tick(394.47, 669.2, 15.33),
      capitalGains: tick(179.15, 685.4, 15.32),
      otherSources: tick(255.86, 685.4, 15.84),
      noIncome: tick(394.62, 685.4, 16.09),
    },
    // 12 Single parent
    singleParent: {
      yes: tick(240.41, 724.4, 15.37),
      no: tick(301.92, 724.4, 15.37),
    },
    // 13 Father's name
    fatherFirst: grid(179.42, 739.2, 25, 15.36),
    fatherMiddle: grid(179.56, 752.7, 25, 15.36),
    fatherLast: grid(179.42, 766.1, 25, 15.36),
    // Photographs (left one carries the signature/thumb impression)
    photoLeft: box(45.7, 23.2, 99.2, 127.6),
    photoRight: box(443.3, 23.4, 99.3, 127.6),
  },

  page2: {
    // 14 Mother's name
    motherFirst: grid(179.42, 22.1, 25, 15.36),
    motherMiddle: grid(179.7, 35.5, 25, 15.36),
    motherLast: grid(179.28, 48.9, 25, 15.36),
    // 15 Parent's name to be printed on PAN card
    parentOnCard: {
      father: tick(332.82, 64.9, 16.37, 12.6),
      mother: tick(394.33, 64.9, 16.09, 12.6),
    },
    // 16 Assessing Officer
    aoArea: grid(237.33, 106.5, 3, 15.51),
    aoType: grid(397.2, 106.5, 2, 15.59),
    aoRange: grid(237.75, 119.9, 3, 15.51),
    aoNumber: grid(397.17, 119.9, 2, 15.59),
    // 17 Representative Assessee name
    raFirst: grid(177.38, 163.9, 25, 15.36),
    raMiddle: grid(177.38, 177.3, 25, 15.36),
    raLast: grid(177.38, 190.7, 25, 15.36),
    // 18 / 19
    raPan: grid(178.14, 206.0, 10, 15.39),
    raAadhaar: grid(281.09, 222.4, 12, 15.39),
    // 20 Representative Assessee address
    raAddress: {
      flat: grid(177.76, 254.0, 25, 15.36),
      road: grid(177.91, 267.4, 25, 15.36),
      post: grid(178.13, 280.8, 25, 15.36),
      area: grid(177.91, 294.2, 25, 15.36),
      district: grid(178.23, 307.6, 25, 15.36),
      state: box(128.44, 320.9, 82.0),
      country: box(285.29, 320.9, 93.1),
      pin: grid(454.14, 320.9, 7, 15.43),
    },
    // 21 Representative Assessee contact details
    raMobileCode: grid(236.96, 352.1, 3, 15.51),
    raMobile: grid(357.38, 352.1, 10, 15.39),
    raEmail: box(236.91, 366.1, 325.29),
    raStdCode: grid(237.62, 380.0, 4, 15.47),
    raLandline: grid(358.84, 380.0, 8, 14.97),
    // 22 Address for communication
    communication: {
      residence: tick(213.56, 415.8, 15.36),
      ra: tick(299.55, 415.8, 15.53),
      office: tick(445.55, 415.8, 15.36),
    },
    // 23 Applicant's supporting documents
    applicantDocs: {
      poi: tick(68.2, 472.9, 15.37),
      poa: tick(166.83, 472.9, 15.36),
      pdob: tick(267.74, 472.9, 15.37),
    },
    // 24 Representative Assessee's supporting documents
    raDocs: {
      poi: tick(68.2, 510.0, 15.37),
      poa: tick(166.83, 510.0, 15.36),
    },
    // Verification & declaration
    verifyName: box(73.5, 562.4, 145.0, 9),
    verifyCapacity: box(279.0, 562.4, 86.5, 9),
    place: box(99.5, 623.4, 120.0, 9),
    date: box(100.5, 638.6, 120.0, 9),
    signature: box(328.6, 653.9, 201.3, 62.9),
    printName: box(390.0, 767.6, 111.0, 9),
    designation: box(408.5, 794.6, 96.0, 9),
  },
};
