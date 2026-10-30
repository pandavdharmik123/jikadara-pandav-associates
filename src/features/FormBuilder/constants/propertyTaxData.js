export const PROPERTY_TAX_LIMITS = {
  number: 24,
  text: 80,
  address: 180,
  area: 48,
  documents: 260,
};

export const PROPERTY_TAX_SECTION_KEYS = {
  application: ['date', 'mobile', 'booking.wardNo', 'booking.locationNo', 'booking.ownerNo', 'booking.occupierNo'],
  owner: ['owner.name', 'owner.address'],
  transferee: ['transferee.name', 'transferee.address'],
  property: ['division', 'numbers.wardNo', 'numbers.surveyNo', 'numbers.rsNo', 'area'],
  boundaries: ['boundaries.east', 'boundaries.west', 'boundaries.north', 'boundaries.south'],
  documents: ['documents'],
};

const GUJARATI_DIGIT_OFFSET = 0x0ae6;

/**
 * Accept Gujarati or ASCII digits, drop a +91 country code / leading zero, and
 * keep at most 10 digits. The form and the PDF overlay share this helper so the
 * printed number can never disagree with the input.
 */
export function normalizePropertyTaxMobile(value) {
  const digits = String(value || '')
    .replace(/[૦-૯]/g, (digit) => String(digit.charCodeAt(0) - GUJARATI_DIGIT_OFFSET))
    .replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2, 12);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

export function createPropertyTaxData() {
  return {
    date: '',
    mobile: '',
    booking: {
      wardNo: '',
      locationNo: '',
      ownerNo: '',
      occupierNo: '',
    },
    owner: {
      name: '',
      address: '',
    },
    transferee: {
      name: '',
      address: '',
    },
    // Optional override for the declaration line. When blank, the transferee
    // name is used automatically.
    applicantName: '',
    division: '',
    numbers: {
      wardNo: '',
      surveyNo: '',
      rsNo: '',
    },
    area: '',
    boundaries: {
      east: '',
      west: '',
      north: '',
      south: '',
    },
    documents: '',
  };
}

/** Required values are the seven numbered sections of the printed notice. */
export function validatePropertyTax(data) {
  const errors = {};
  const required = (key, value, message) => {
    if (!String(value || '').trim()) errors[key] = message;
  };

  required('date', data?.date, 'Select the application date.');

  const mobile = normalizePropertyTaxMobile(data?.mobile);
  if (mobile && !/^\d{10}$/.test(mobile)) {
    errors.mobile = 'Enter a valid 10-digit mobile number.';
  }

  required('owner.name', data?.owner?.name, 'Enter the current owner name.');
  required('owner.address', data?.owner?.address, 'Enter the current owner address.');
  required('transferee.name', data?.transferee?.name, 'Enter the transferee full name.');
  required('transferee.address', data?.transferee?.address, 'Enter the transferee address.');
  required('division', data?.division, 'Enter the division, locality, or plot name.');
  required('numbers.wardNo', data?.numbers?.wardNo, 'Enter the ward number.');
  required('numbers.surveyNo', data?.numbers?.surveyNo, 'Enter the survey (નોધ) number.');
  required('numbers.rsNo', data?.numbers?.rsNo, 'Enter the R.S. number.');
  required('area', data?.area, 'Enter the property area.');
  required('boundaries.east', data?.boundaries?.east, 'Enter the eastern boundary.');
  required('boundaries.west', data?.boundaries?.west, 'Enter the western boundary.');
  required('boundaries.north', data?.boundaries?.north, 'Enter the northern boundary.');
  required('boundaries.south', data?.boundaries?.south, 'Enter the southern boundary.');

  return errors;
}
