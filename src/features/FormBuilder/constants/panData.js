import { PAN_LAYOUT } from './panLayout';

/** Empty address block (residence / office / representative assessee). */
export const createAddress = () => ({
  flat: '',
  road: '',
  post: '',
  area: '',
  district: '',
  state: '',
  country: '',
  pin: '',
});

export const createContact = () => ({
  mobileCode: '',
  mobile: '',
  email: '',
  stdCode: '',
  landline: '',
});

/**
 * The whole PAN application lives in one flat-ish object so it can be
 * serialised to localStorage as a draft and re-opened later.
 */
export const createPanData = () => ({
  firstName: '',
  middleName: '',
  lastName: '',
  aadhaarName: '',
  gender: '',
  dob: '',
  aadhaar: '',
  residence: createAddress(),
  office: createAddress(),
  residentialStatus: '',
  passport: '',
  tin: '',
  contact: createContact(),
  sources: [],
  singleParent: '',
  father: { first: '', middle: '', last: '' },
  mother: { first: '', middle: '', last: '' },
  parentOnCard: '',
  ao: { area: '', type: '', range: '', number: '' },
  raApplicable: false,
  ra: {
    first: '',
    middle: '',
    last: '',
    pan: '',
    aadhaar: '',
    address: createAddress(),
    contact: createContact(),
  },
  communication: '',
  applicantDocs: [],
  raDocs: [],
  declaration: {
    name: '',
    capacity: '',
    place: '',
    date: '',
    designation: '',
  },
  photo: null,
  signature: null,
  // Aspect ratio (w / h) of the processed signature image and its position on
  // page 1 (photograph) and page 2 (signature box). `null` = use the defaults.
  signatureAspect: null,
  signaturePlacements: null,
  // Attached scans – each one is appended as its own page after the form.
  documents: [],
});

export const PAN_GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'TRANSGENDER', label: 'Transgender' },
];

export const PAN_RESIDENTIAL_STATUS_OPTIONS = [
  { value: 'RESIDENT', label: 'Resident' },
  { value: 'NON_RESIDENT', label: 'Non-resident' },
  { value: 'RNOR', label: 'Resident but not ordinarily resident' },
];

export const PAN_SOURCE_OPTIONS = [
  { value: 'SALARY', label: 'Salary' },
  { value: 'BUSINESS', label: 'Income from Business/Profession' },
  { value: 'HOUSE_PROPERTY', label: 'Income from House Property' },
  { value: 'CAPITAL_GAINS', label: 'Capital Gains' },
  { value: 'OTHER_SOURCES', label: 'Income from Other Sources' },
  { value: 'NO_INCOME', label: 'No Income' },
];

export const PAN_SINGLE_PARENT_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
];

export const PAN_PARENT_ON_CARD_OPTIONS = [
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
];

export const PAN_COMMUNICATION_OPTIONS = [
  { value: 'RESIDENCE', label: 'Residence Address' },
  { value: 'RA', label: 'Representative Assessee Address' },
  { value: 'OFFICE', label: 'Office Address' },
];

export const PAN_CAPACITY_OPTIONS = [
  { value: 'SELF', label: 'Self' },
  { value: 'RA', label: 'Representative Assessee' },
];

export const PAN_APPLICANT_DOC_OPTIONS = [
  { value: 'POI', label: 'Proof of Identity' },
  { value: 'POA', label: 'Proof of Address' },
  { value: 'PDOB', label: 'Proof of Date of Birth' },
];

export const PAN_RA_DOC_OPTIONS = [
  { value: 'POI', label: 'Proof of Identity' },
  { value: 'POA', label: 'Proof of Address' },
];

/**
 * Maximum number of character boxes available on the printed form for every
 * character-box field. Used for the live "used / available" counter and to
 * stop the user from typing more characters than the form can hold.
 */
export const PAN_BOX_LIMITS = {
  firstName: PAN_LAYOUT.page1.firstName.count,
  middleName: PAN_LAYOUT.page1.middleName.count,
  lastName: PAN_LAYOUT.page1.lastName.count,
  aadhaarName: PAN_LAYOUT.page1.aadhaarName.reduce((sum, row) => sum + row.count, 0),
  aadhaar: PAN_LAYOUT.page1.aadhaar.count,
  passport: PAN_LAYOUT.page1.passport.count,
  tin: PAN_LAYOUT.page1.tin.count,
  mobileCode: PAN_LAYOUT.page1.mobileCode.count,
  mobile: PAN_LAYOUT.page1.mobile.count,
  stdCode: PAN_LAYOUT.page1.stdCode.count,
  landline: PAN_LAYOUT.page1.landline.count,
  fatherFirst: PAN_LAYOUT.page1.fatherFirst.count,
  fatherMiddle: PAN_LAYOUT.page1.fatherMiddle.count,
  fatherLast: PAN_LAYOUT.page1.fatherLast.count,
  motherFirst: PAN_LAYOUT.page2.motherFirst.count,
  motherMiddle: PAN_LAYOUT.page2.motherMiddle.count,
  motherLast: PAN_LAYOUT.page2.motherLast.count,
  raFirst: PAN_LAYOUT.page2.raFirst.count,
  raMiddle: PAN_LAYOUT.page2.raMiddle.count,
  raLast: PAN_LAYOUT.page2.raLast.count,
  raPan: PAN_LAYOUT.page2.raPan.count,
  raAadhaar: PAN_LAYOUT.page2.raAadhaar.count,
  raMobileCode: PAN_LAYOUT.page2.raMobileCode.count,
  raMobile: PAN_LAYOUT.page2.raMobile.count,
  raStdCode: PAN_LAYOUT.page2.raStdCode.count,
  raLandline: PAN_LAYOUT.page2.raLandline.count,
  aoArea: PAN_LAYOUT.page2.aoArea.count,
  aoType: PAN_LAYOUT.page2.aoType.count,
  aoRange: PAN_LAYOUT.page2.aoRange.count,
  aoNumber: PAN_LAYOUT.page2.aoNumber.count,
  addressPart: 25,
  pin: 7,
};

/** Titles that must not be prefixed to a name (guideline (i) of item 1). */
const FORBIDDEN_TITLES = /\b(shri|shree|smt|shrimati|kumari|ku\.?|dr|doctor|mr|mrs|ms|major)\b/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DIGITS_RE = /^\d+$/;

/** Count the character boxes a value occupies (a space still uses a box). */
export const countBoxes = (value) => {
  if (!value) return 0;
  return value.replace(/\s+/g, ' ').trim().length;
};

const isBlank = (v) => !v || !String(v).trim();

/**
 * Validation messages displayed beside the inputs. These follow the notes and
 * guidelines printed on pages 3–5 of the template – nothing beyond them.
 */
export function validatePan(data) {
  const errors = {};
  const req = (key, message) => {
    errors[key] = message;
  };

  // Part A
  if (isBlank(data.firstName)) req('firstName', 'First name is required (item 1A).');
  else if (FORBIDDEN_TITLES.test(data.firstName)) req('firstName', 'Do not prefix titles such as Shri, Smt, Dr or Major.');
  else if (/[.]/.test(data.firstName)) req('firstName', 'Write the name in full – initials/abbreviations are not allowed.');

  if (isBlank(data.lastName)) req('lastName', 'Last name is required (item 1A).');
  else if (FORBIDDEN_TITLES.test(data.lastName)) req('lastName', 'Do not prefix titles such as Shri, Smt, Dr or Major.');

  if (!data.gender) req('gender', 'Select one option (item 2).');

  if (!data.dob) req('dob', 'Date of birth is required (item 3).');
  else {
    const [y, m, d] = data.dob.split('-').map(Number);
    if (!y || !m || !d || data.dob.length !== 10) req('dob', 'Use the day / month / year format.');
  }

  if (isBlank(data.aadhaar)) req('aadhaar', 'Aadhaar number is required (item 4), except for exempt categories.');
  else if (!DIGITS_RE.test(data.aadhaar) || data.aadhaar.length !== 12) req('aadhaar', 'Aadhaar number must be exactly 12 digits.');

  if (isBlank(data.aadhaarName)) {
    req('aadhaarName', 'Name as per Aadhaar is required (item 1B) – this name is printed on the PAN card.');
  }

  if (isBlank(data.residence.flat)) req('residence.flat', 'Flat/Door/Building is required.');
  if (isBlank(data.residence.road)) req('residence.road', 'Road/Street/Block/Sector is required.');
  if (isBlank(data.residence.area)) req('residence.area', 'Area/Locality/Town/City is required.');
  if (isBlank(data.residence.district)) req('residence.district', 'District is required.');
  if (isBlank(data.residence.state)) req('residence.state', 'State/Union Territory is required.');
  if (isBlank(data.residence.country)) req('residence.country', 'Country/Region is required.');
  if (isBlank(data.residence.pin)) req('residence.pin', 'PIN/ZIP code is required.');
  else if (!DIGITS_RE.test(data.residence.pin)) req('residence.pin', 'PIN/ZIP code must contain digits only.');

  if (!data.residentialStatus) req('residentialStatus', 'Select one residential status (item 7).');

  if (
    (data.residentialStatus === 'NON_RESIDENT' || data.residentialStatus === 'RNOR') &&
    isBlank(data.passport)
  ) {
    req('passport', 'Passport number is mandatory for Non-resident / Resident but not ordinarily resident applicants.');
  }

  // Part B
  if (!data.sources || data.sources.length === 0) req('sources', 'Select at least one source of income (item 11).');

  // Part C
  if (!data.singleParent) req('singleParent', 'Select Yes or No (item 12).');
  if (data.singleParent !== 'YES') {
    if (isBlank(data.father.first)) req('father.first', 'Father’s first name is required.');
    if (isBlank(data.father.last)) req('father.last', 'Father’s last name is required.');
    if (isBlank(data.mother.first)) req('mother.first', 'Mother’s first name is required.');
    if (isBlank(data.mother.last)) req('mother.last', 'Mother’s last name is required.');
  }
  if (!data.parentOnCard) req('parentOnCard', 'Select whose name should be printed on the PAN card (item 15).');

  // Part D is optional – the AO code may be left blank when it is not known.

  // Part E (conditional)
  if (data.raApplicable) {
    if (isBlank(data.ra.first)) req('ra.first', 'Representative Assessee name is required.');
    if (isBlank(data.ra.pan) && isBlank(data.ra.aadhaar)) {
      req('ra.pan', 'Provide the Representative Assessee PAN, or the Aadhaar number if PAN is not available.');
    }
    if (isBlank(data.ra.address.flat) && isBlank(data.ra.address.road) && isBlank(data.ra.address.area)) {
      req('ra.address', 'Representative Assessee address is required.');
    }
    if (isBlank(data.ra.contact.mobile)) req('ra.mobile', 'Mobile number of the Representative Assessee is required.');
    if (isBlank(data.ra.contact.email)) req('ra.email', 'Email ID of the Representative Assessee is required.');
  }

  // Part F
  if (!data.communication) req('communication', 'Select the address for communication (item 22).');

  // Verification
  if (isBlank(data.declaration.name)) req('declaration.name', 'Name is required in the verification block.');
  if (!data.declaration.capacity) req('declaration.capacity', 'Select the capacity (Self / Representative Assessee).');
  if (isBlank(data.declaration.place)) req('declaration.place', 'Place is required.');
  if (isBlank(data.declaration.date)) req('declaration.date', 'Date is required.');

  // Contact details (item 10)
  if (isBlank(data.contact.mobileCode)) req('contact.mobileCode', 'Country code is required.');
  if (isBlank(data.contact.mobile)) req('contact.mobile', 'Mobile number is required (item 10).');
  else if (!DIGITS_RE.test(data.contact.mobile)) req('contact.mobile', 'Mobile number must contain digits only.');
  if (isBlank(data.contact.email)) req('contact.email', 'Email ID is required (item 10).');
  else if (!EMAIL_RE.test(data.contact.email)) req('contact.email', 'Enter a valid email address.');

  return errors;
}

/**
 * Whether Part E should be treated as mandatory, based on the guidelines:
 * minors, non-residents and "resident but not ordinarily resident" applicants.
 */
export function isRepresentativeMandatory(data) {
  if (data.residentialStatus === 'NON_RESIDENT' || data.residentialStatus === 'RNOR') return true;
  if (!data.dob) return false;
  const [y, m, d] = data.dob.split('-').map(Number);
  if (!y) return false;
  const dob = new Date(y, m - 1, d);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age < 18;
}
