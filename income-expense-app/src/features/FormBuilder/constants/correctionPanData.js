import { CORRECTION_LAYOUT } from './correctionPanLayout';

/** Empty address block used by the correction form. */
export const createCorrectionAddress = () => ({
  flat: '',
  road: '',
  post: '',
  area: '',
  district: '',
  state: '',
  country: '',
  pin: '',
});

export const createCorrectionContact = () => ({
  mobileCode: '',
  mobile: '',
  email: '',
  isdCode: '',
  stdCode: '',
  landline: '',
});

/**
 * Whole correction request. Kept in one serialisable object so it can be
 * stored on this device as a draft (same pattern as the new-application tab).
 */
export const createCorrectionPanData = () => ({
  pan: '',
  aadhaar: '',
  // Items ticked in the left margin of the printed form.
  changes: [],
  nameA: { first: '', middle: '', last: '' },
  nameB: { first: '', middle: '', last: '' },
  gender: '',
  dob: '',
  addressType: '',
  address: createCorrectionAddress(),
  passport: '',
  tin: '',
  contact: createCorrectionContact(),
  father: { first: '', middle: '', last: '' },
  mother: { first: '', middle: '', last: '' },
  parentOnCard: '',
  proofs: [],
  declaration: {
    name: '',
    capacity: '',
    place: '',
    date: '',
  },
  photo: null,
  signature: null,
  signatureAspect: null,
  signaturePlacements: null,
  // Attached scans – each one is appended as its own page after the form.
  documents: [],
});

export const CORRECTION_CHANGE_OPTIONS = [
  { value: 'NAME_A', label: '1A · Name' },
  { value: 'NAME_B', label: '1B · Name as per Aadhaar' },
  { value: 'GENDER', label: '2 · Gender' },
  { value: 'DOB', label: '3 · Date of Birth' },
  { value: 'ADDRESS', label: '4 · Address' },
  { value: 'PASSPORT', label: '5 · Passport Number' },
  { value: 'TIN', label: '6 · Taxpayer Identification Number' },
  { value: 'CONTACT', label: '7 · Contact Details' },
  { value: 'FATHER', label: '8 · Father’s Name' },
  { value: 'MOTHER', label: '9 · Mother’s Name' },
];

export const CORRECTION_ADDRESS_TYPE_OPTIONS = [
  { value: 'RESIDENCE', label: 'Residence' },
  { value: 'OFFICE', label: 'Office' },
];

export const CORRECTION_GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'TRANSGENDER', label: 'Transgender' },
];

export const CORRECTION_PARENT_ON_CARD_OPTIONS = [
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
];

export const CORRECTION_CAPACITY_OPTIONS = [
  { value: 'SELF', label: 'Self' },
  { value: 'RA', label: 'Representative Assessee' },
];

export const CORRECTION_PROOF_OPTIONS = [
  { value: 'IDENTITY', label: '(i) Proof of Identity' },
  { value: 'ADDRESS', label: '(ii) Proof of Address' },
  { value: 'DOB', label: '(iii) Proof of Date of Birth' },
  { value: 'OTHER', label: '(iv) Documentary proof of other changes' },
  { value: 'PAN_COPY', label: '(v) Copy of PAN *' },
];

export const CORRECTION_BOX_LIMITS = {
  pan: CORRECTION_LAYOUT.page1.pan.count,
  aadhaar: CORRECTION_LAYOUT.page1.aadhaar.count,
  namePart: CORRECTION_LAYOUT.page1.nameA.first.count,
  addressPart: CORRECTION_LAYOUT.page1.address.flat.count,
  pin: CORRECTION_LAYOUT.page1.address.pin.count,
  passport: CORRECTION_LAYOUT.page1.passport.count,
  tin: CORRECTION_LAYOUT.page1.tin.count,
  mobileCode: CORRECTION_LAYOUT.page1.contact.mobileCode.count,
  mobile: CORRECTION_LAYOUT.page1.contact.mobile.count,
  isdCode: CORRECTION_LAYOUT.page1.contact.isdCode.count,
  stdCode: CORRECTION_LAYOUT.page1.contact.stdCode.count,
  landline: CORRECTION_LAYOUT.page1.contact.landline.count,
};

const DIGITS_RE = /^\d+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

const isBlank = (value) => !String(value || '').trim();
const normalizePan = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');

/**
 * Advisory validation. The form can still be downloaded / printed, but the
 * status chip and inline hints point at everything that is still missing.
 */
export function validateCorrectionPan(data) {
  const errors = {};
  const req = (key, message) => {
    if (!errors[key]) errors[key] = message;
  };

  if (isBlank(data.pan)) req('pan', 'PAN is required.');
  else if (!PAN_RE.test(normalizePan(data.pan))) {
    req('pan', 'Enter a valid PAN: 5 letters, 4 digits, then 1 letter (e.g. ABCDE1234F).');
  }

  if (isBlank(data.aadhaar)) req('aadhaar', 'Aadhaar number is required, except for exempt categories.');
  else if (!DIGITS_RE.test(data.aadhaar) || data.aadhaar.length !== 12) {
    req('aadhaar', 'Aadhaar number must be exactly 12 digits.');
  }

  if (!data.changes || data.changes.length === 0) {
    req('changes', 'Tick at least one item that needs correction (items 1–9).');
  }

  // 1A / 1B – first and last name are mandatory, middle name is optional.
  if (isBlank(data.nameA.first)) req('nameA.first', 'First name is required (item 1A).');
  if (isBlank(data.nameA.last)) req('nameA.last', 'Last name is required (item 1A).');
  if (isBlank(data.nameB.first)) req('nameB.first', 'First name is required (item 1B).');
  if (isBlank(data.nameB.last)) req('nameB.last', 'Last name is required (item 1B).');

  if (!data.gender) req('gender', 'Select one option (item 2).');
  if (!data.dob) req('dob', 'Date of birth is required (item 3).');
  else if (String(data.dob).length !== 10) req('dob', 'Use the day / month / year format.');

  if (!data.addressType) req('addressType', 'Select Residence or Office (item 4).');
  if (isBlank(data.address.flat)) req('address.flat', 'Flat/Door/Building is required.');
  if (isBlank(data.address.road)) req('address.road', 'Road/Street/Block/Sector is required.');
  if (isBlank(data.address.area)) req('address.area', 'Area/Locality/Town/City is required.');
  if (isBlank(data.address.district)) req('address.district', 'District is required.');
  if (isBlank(data.address.state)) req('address.state', 'State/Union Territory is required.');
  if (isBlank(data.address.country)) req('address.country', 'Country/Region is required.');
  if (isBlank(data.address.pin)) req('address.pin', 'PIN/ZIP code is required.');
  else if (!DIGITS_RE.test(data.address.pin)) req('address.pin', 'PIN/ZIP code must contain digits only.');

  if (isBlank(data.contact.mobileCode)) req('contact.mobileCode', 'Country code is required.');
  if (isBlank(data.contact.mobile)) req('contact.mobile', 'Mobile number is required (item 7).');
  else if (!DIGITS_RE.test(data.contact.mobile)) req('contact.mobile', 'Mobile number must contain digits only.');
  if (isBlank(data.contact.email)) req('contact.email', 'Email ID is required (item 7).');
  else if (!EMAIL_RE.test(data.contact.email)) req('contact.email', 'Enter a valid email address.');

  // 8 / 9 – father's name is mandatory; mother's name is optional.
  if (isBlank(data.father.first)) req('father.first', 'Father’s first name is required (item 8).');
  if (isBlank(data.father.last)) req('father.last', 'Father’s last name is required (item 8).');

  if (!data.parentOnCard) {
    req('parentOnCard', 'Select whose name should be printed on the PAN card (item 10).');
  }

  if (!data.proofs || !data.proofs.includes('PAN_COPY')) {
    req('proofs', 'Copy of PAN is required with the correction request (item 11(v)).');
  }

  // Verification & declaration.
  if (isBlank(data.declaration.name)) req('declaration.name', 'Name is required in the verification block.');
  if (!data.declaration.capacity) {
    req('declaration.capacity', 'Select the capacity (Self / Representative Assessee).');
  }
  if (isBlank(data.declaration.place)) req('declaration.place', 'Place is required.');
  if (isBlank(data.declaration.date)) req('declaration.date', 'Date is required.');

  return errors;
}
