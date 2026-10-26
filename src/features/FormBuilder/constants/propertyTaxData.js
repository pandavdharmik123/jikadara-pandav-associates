export const PROPERTY_TAX_LIMITS = {
  number: 24,
  text: 80,
  address: 180,
  area: 48,
  documents: 260,
};

export const PROPERTY_TAX_SECTION_KEYS = {
  application: ['date', 'booking.wardNo', 'booking.locationNo', 'booking.ownerNo', 'booking.occupierNo'],
  owner: ['owner.name', 'owner.address'],
  transferee: ['transferee.name', 'transferee.address'],
  property: ['division', 'numbers.wardNo', 'numbers.surveyNo', 'numbers.rsNo', 'area'],
  boundaries: ['boundaries.east', 'boundaries.west', 'boundaries.north', 'boundaries.south'],
  documents: ['documents'],
};

export function createPropertyTaxData() {
  return {
    date: '',
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
