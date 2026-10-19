import { DECEASED_TEMPLATE } from './deceasedTemplate';
import { ALIVE_TEMPLATE } from './hayatiTemplate';

export { DECEASED_TEMPLATE, ALIVE_TEMPLATE };

export const PEDHINAMU_TEMPLATES = {
  DECEASED: DECEASED_TEMPLATE,
  ALIVE: ALIVE_TEMPLATE
};

// Default static text export retained for 100% backward compatibility
export const PEDHINAMU_STATIC_TEXT = DECEASED_TEMPLATE;

export const createBlankPedhinamuData = (pedhinamuType = 'DECEASED') => ({
  pedhinamuType, // 'DECEASED' | 'ALIVE'
  general: {
    registrationNo: '',
    registrationYear: '',
    moje: '',
    talatiMoje: '',
    taluka: '',
    district: '',
    place: '',
    currentDate: '',
    applicationDate: '',
    mobileNumber: '',
    propertyDetails: ''
  },
  applicant: {
    name: '',
    age: '',
    caste: '',
    occupation: '',
    address: '',
    mobileNumber: '',
    relationWithDeceased: '',
    photoUrl: '',
    propertyDistrict: '',
    propertyTaluka: '',
    propertyMoje: '',
    propertyDetails: ''
  },
  selfDeclaration: {
    properties: [
      {
        district: '',
        taluka: '',
        moje: '',
        details: ''
      }
    ]
  },
  deceased: {
    name: '',
    deathDate: '',
    deathPlace: '',
    age: ''
  },
  tree: {
    rootNode: {
      id: 'root',
      name: '',
      deceased: pedhinamuType !== 'ALIVE',
      deathDate: '',
      age: '',
      gender: 'male',
      relationship: 'મુખ્ય વ્યક્તિ',
      parentId: null,
      position: null,
      children: []
    }
  },
  panchas: [
    {
      id: 1,
      name: '',
      age: '',
      occupation: '',
      address: '',
      mobileNumber: '',
      photoUrl: ''
    },
    {
      id: 2,
      name: '',
      age: '',
      occupation: '',
      address: '',
      mobileNumber: '',
      photoUrl: ''
    },
    {
      id: 3,
      name: '',
      age: '',
      occupation: '',
      address: '',
      mobileNumber: '',
      photoUrl: ''
    }
  ]
});

export const DEFAULT_PEDHINAMU_DATA = createBlankPedhinamuData('DECEASED');
