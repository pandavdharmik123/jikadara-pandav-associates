/** Number of printed pages in the marriage-registration document. */
export const MARRIAGE_FORM_PAGES = 3;

/** Form state for the Gujarat marriage-registration form. */
export const createMarriagePerson = () => ({
  name: '',
  age: '',
  dob: '',
  religion: '',
  residence: '',
  address: '',
  maritalStatus: '',
  parentName: '',
  parentAge: '',
  parentResidence: '',
  parentAddress: '',
});

export const createMarriageWitness = (id) => ({
  id,
  name: '',
  age: '',
  address: '',
});

export const createMarriageData = () => ({
  application: {
    mobile: '',
    place: '',
    date: '',
  },
  marriage: {
    date: '',
    place: '',
  },
  groom: createMarriagePerson(),
  bride: createMarriagePerson(),
  officiant: {
    name: '',
    age: '',
    residence: '',
    address: '',
  },
  witnesses: [createMarriageWitness('w1'), createMarriageWitness('w2')],
});

export const MARRIAGE_GROOM_STATUS_OPTIONS = [
  { value: 'UNMARRIED', label: 'Never married (અપરિણીત)' },
  { value: 'WIDOWER', label: 'Widower (વિધુર)' },
  { value: 'DIVORCED', label: 'Divorced (છૂટાછેડા થયેલ)' },
];

export const MARRIAGE_BRIDE_STATUS_OPTIONS = [
  { value: 'UNMARRIED', label: 'Never married (અપરિણીત)' },
  { value: 'WIDOW', label: 'Widow (વિધવા)' },
  { value: 'DIVORCED', label: 'Divorced (છૂટાછેડા થયેલ)' },
];

export const MARRIAGE_LIMITS = {
  mobile: 10,
  age: 3,
  name: 100,
  text: 180,
  address: 320,
};

/** DD-MM-YYYY (or another separator) from an ISO date, using ASCII digits. */
export function formatMarriageDate(iso, separator = '-') {
  if (!iso) return '';
  const [year = '', month = '', day = ''] = String(iso).split('-');
  if (!year || !month || !day) return '';
  return `${day}${separator}${month}${separator}${year}`;
}

const hasText = (value) => String(value || '').trim().length > 0;

/**
 * Errors are keyed by the same dotted paths that the form uses, e.g.
 * `groom.parentName`. The builder shows the total count and each section
 * displays its own pending badges.
 */
export function validateMarriage(data) {
  const errors = {};
  const required = (key, value, message = 'Required.') => {
    if (!hasText(value)) errors[key] = message;
  };
  const age = (key, value) => {
    required(key, value);
    if (hasText(value) && !/^\d{1,3}$/.test(String(value).trim())) {
      errors[key] = 'Enter a valid age in digits.';
    }
  };

  required('application.mobile', data.application?.mobile, 'Enter the mobile number.');
  if (hasText(data.application?.mobile) && !/^\d{10}$/.test(data.application.mobile)) {
    errors['application.mobile'] = 'Enter a 10-digit mobile number.';
  }
  required('application.place', data.application?.place, 'Enter the application place.');
  required('application.date', data.application?.date, 'Choose the application date.');

  required('marriage.date', data.marriage?.date, 'Choose the marriage date.');
  required('marriage.place', data.marriage?.place, 'Enter the marriage venue.');

  const person = (prefix, value, { parentResidenceRequired = true } = {}) => {
    required(`${prefix}.name`, value?.name, 'Enter the full name.');
    age(`${prefix}.age`, value?.age);
    required(`${prefix}.dob`, value?.dob, 'Choose the date of birth.');
    required(`${prefix}.religion`, value?.religion, 'Enter the religion.');
    required(`${prefix}.residence`, value?.residence, 'Enter the residence place.');
    required(`${prefix}.parentName`, value?.parentName, "Enter the parent/guardian's full name.");
    age(`${prefix}.parentAge`, value?.parentAge);
    if (parentResidenceRequired) {
      required(`${prefix}.parentResidence`, value?.parentResidence, 'Enter the parent/guardian residence place.');
    }
  };

  person('groom', data.groom);
  person('bride', data.bride);

  required('officiant.name', data.officiant?.name, 'Enter the officiant name.');
  age('officiant.age', data.officiant?.age);
  required('officiant.address', data.officiant?.address, 'Enter the officiant address.');

  (data.witnesses || []).forEach((witness, index) => {
    const prefix = `witnesses.${index}`;
    required(`${prefix}.name`, witness?.name, 'Enter the witness name.');
    age(`${prefix}.age`, witness?.age);
    required(`${prefix}.address`, witness?.address, 'Enter the witness address.');
  });

  return errors;
}

/** Keys shown in each collapsible section, used for the pending badges. */
export const MARRIAGE_SECTION_KEYS = {
  application: ['application.mobile', 'application.place', 'application.date'],
  marriage: ['marriage.date', 'marriage.place'],
  groom: [
    'groom.name', 'groom.age', 'groom.dob', 'groom.religion', 'groom.residence',
    'groom.parentName', 'groom.parentAge', 'groom.parentResidence',
  ],
  bride: [
    'bride.name', 'bride.age', 'bride.dob', 'bride.religion', 'bride.residence',
    'bride.parentName', 'bride.parentAge', 'bride.parentResidence',
  ],
  officiant: ['officiant.name', 'officiant.age', 'officiant.address'],
  witnesses: [
    'witnesses.0.name', 'witnesses.0.age', 'witnesses.0.address',
    'witnesses.1.name', 'witnesses.1.age', 'witnesses.1.address',
  ],
};
