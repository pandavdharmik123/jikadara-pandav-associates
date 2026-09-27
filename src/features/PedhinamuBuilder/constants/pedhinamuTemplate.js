import { DECEASED_TEMPLATE } from './deceasedTemplate';
import { ALIVE_TEMPLATE } from './hayatiTemplate';

export { DECEASED_TEMPLATE, ALIVE_TEMPLATE };

export const PEDHINAMU_TEMPLATES = {
  DECEASED: DECEASED_TEMPLATE,
  ALIVE: ALIVE_TEMPLATE
};

// Default static text export retained for 100% backward compatibility
export const PEDHINAMU_STATIC_TEXT = DECEASED_TEMPLATE;

export const DEFAULT_PEDHINAMU_DATA = {
  pedhinamuType: 'DECEASED', // 'DECEASED' | 'ALIVE'
  general: {
    registrationNo: '............',
    registrationYear: '૨૦૨૬',
    moje: 'ડભોલી',
    talatiMoje: 'ડભોલી',
    taluka: 'કતારગામ',
    district: 'સુરત',
    place: 'સુરત',
    currentDate: '૨૧-૧૦-૨૦૨૪',
    applicationDate: '૨૧-૧૦-૨૦૨૪'
  },
  applicant: {
    name: 'દિનેશભાઇ મધુભાઇ જીકાદરા',
    age: '૪૮',
    occupation: 'વેપાર',
    address: '૧૪૯, બાપાસીતારામ નગર સોસા., ડભોલી રોડ, કતારગામ, સુરત-૩૯૫૦૦૪.',
    mobileNumber: '',
    relationWithDeceased: 'મારા પિતા',
    photoUrl: ''
  },
  deceased: {
    name: 'મધુભાઇ પરશોતમભાઇ જીકાદરા',
    deathDate: '૨૦-૦૧-૨૦૨૬',
    deathPlace: 'સુરત'
  },
  tree: {
    rootNode: {
      id: 'root',
      name: 'મધુભાઇ પરશોતમભાઇ જીકાદરા',
      deceased: true,
      deathDate: '૨૦-૦૧-૨૦૨૬',
      age: '૬૮',
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
};
