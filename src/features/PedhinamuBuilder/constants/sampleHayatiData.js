/**
 * Sample Reference Data for Alive (Hayati) Pedhinamu
 * Extracted directly from reference PDF "Pedhinamu DRAFT - Hayati.pdf":
 * Root Person: શ્રી ટાપણીયા છગનભાઇ પીતાંબરભાઇ (ઉ.આ.વ. ૬૭)
 * Wife: ટાપણીયા શાંતાબેન છગનભાઇ (ઉ.વ. ૬૨)
 * Sons: ટાપણીયા જનક છગનભાઇ (૪૧), ટાપણીયા રોહીત છગનભાઇ (૨૬)
 * Daughters with spouses:
 *  - ટાપણીયા જયશ્રીબેન છગનભાઇ વા/ઓ જીતેશભાઇ માલણકીયા (૩૯)
 *  - ટાપણીયા મીરાબેન છગનભાઇ વા/ઓ ભરતભાઇ કાકલોતર (૩૬)
 *  - ટાપણીયા સેજલ છગનભાઇ વા/ઓ ચંદ્રેશભાઇ તરસરીયા (૩૪)
 *  - ટાપણીયા સોનલ છગનભાઇ વા/ઓ મયુરભાઇ રાવળ (૩૨)
 * Total alive heirs: ૭ (સાત)
 * Panchas:
 *  1. સરવૈયા જગુભાઇ જેરામભાઇ (ઉ.આ.વ. ૬૭, વેપાર, ૯૩ નંદનવન સોસા.)
 *  2. કળસરીયા ભનુભાઇ નરસિંહભાઇ (ઉ.આ.વ. ૬૩, વેપાર, ૯૪ નંદનવન સોસા.)
 *  3. વોરા છગનભાઇ મેરામણભાઇ (ઉ.આ.વ. ૭૧, નિવૃત, ૯૭ નંદનવન સોસા.)
 */

export const SAMPLE_HAYATI_DATA = {
  pedhinamuType: 'ALIVE',
  general: {
    registrationNo: '............',
    registrationYear: '૨૦૨૬',
    moje: 'કતારગામ',
    talatiMoje: 'કતારગામ',
    taluka: 'કતારગામ',
    district: 'સુરત',
    place: 'સુરત',
    currentDate: '૦૫-૦૮-૨૦૨૬',
    applicationDate: '૦૫-૦૮-૨૦૨૬'
  },
  applicant: {
    name: 'ટાપણીયા છગનભાઇ પીતાંબરભાઇ',
    age: '૬૭',
    occupation: 'મજુરી',
    address: '૮૦, નંદનવન સોસા., સિંગણપોર ચાર રસ્તા પાસે, કતારગામ, સુરત-૩૯૫૦૦૪.',
    mobileNumber: '',
    relationWithDeceased: 'પોતે',
    photoUrl: ''
  },
  deceased: {
    name: 'ટાપણીયા છગનભાઇ પીતાંબરભાઇ',
    deathDate: '',
    deathPlace: ''
  },
  tree: {
    rootNode: {
      id: 'root',
      name: 'ટાપણીયા છગનભાઇ પીતાંબરભાઇ',
      deceased: false,
      deathDate: '',
      age: '૬૭',
      gender: 'male',
      relationship: 'મુખ્ય વ્યક્તિ',
      parentId: null,
      position: null,
      children: [
        {
          id: 'member-1',
          name: 'ટાપણીયા શાંતાબેન છગનભાઇ',
          relationship: 'પત્ની',
          gender: 'female',
          deceased: false,
          deathDate: '',
          age: '૬૨',
          parentId: 'root',
          position: null,
          children: []
        },
        {
          id: 'member-2',
          name: 'ટાપણીયા જનક છગનભાઇ',
          relationship: 'પુત્ર',
          gender: 'male',
          deceased: false,
          deathDate: '',
          age: '૪૧',
          parentId: 'root',
          position: null,
          children: []
        },
        {
          id: 'member-3',
          name: 'ટાપણીયા જયશ્રીબેન છગનભાઇ વા/ઓ જીતેશભાઇ માલણકીયા',
          relationship: 'પુત્રી',
          gender: 'female',
          deceased: false,
          deathDate: '',
          age: '૩૯',
          parentId: 'root',
          position: null,
          children: []
        },
        {
          id: 'member-4',
          name: 'ટાપણીયા મીરાબેન છગનભાઇ વા/ઓ ભરતભાઇ કાકલોતર',
          relationship: 'પુત્રી',
          gender: 'female',
          deceased: false,
          deathDate: '',
          age: '૩૬',
          parentId: 'root',
          position: null,
          children: []
        },
        {
          id: 'member-5',
          name: 'ટાપણીયા સેજલ છગનભાઇ વા/ઓ ચંદ્રેશભાઇ તરસરીયા',
          relationship: 'પુત્રી',
          gender: 'female',
          deceased: false,
          deathDate: '',
          age: '૩૪',
          parentId: 'root',
          position: null,
          children: []
        },
        {
          id: 'member-6',
          name: 'ટાપણીયા સોનલ છગનભાઇ વા/ઓ મયુરભાઇ રાવળ',
          relationship: 'પુત્રી',
          gender: 'female',
          deceased: false,
          deathDate: '',
          age: '૩૨',
          parentId: 'root',
          position: null,
          children: []
        },
        {
          id: 'member-7',
          name: 'ટાપણીયા રોહીત છગનભાઇ',
          relationship: 'પુત્ર',
          gender: 'male',
          deceased: false,
          deathDate: '',
          age: '૨૬',
          parentId: 'root',
          position: null,
          children: []
        }
      ]
    }
  },
  panchas: [
    {
      id: 1,
      name: 'સરવૈયા જગુભાઇ જેરામભાઇ',
      age: '૬૭',
      occupation: 'વેપાર',
      address: '૯૩, નંદનવન સોસા., સિંગણપોર ચાર રસ્તા પાસે, કતારગામ, સુરત-૩૯૫૦૦૪',
      mobileNumber: '',
      photoUrl: ''
    },
    {
      id: 2,
      name: 'કળસરીયા ભનુભાઇ નરસિંહભાઇ',
      age: '૬૩',
      occupation: 'વેપાર',
      address: '૯૪, નંદનવન સોસા., સિંગણપોર ચાર રસ્તા પાસે, કતારગામ, સુરત-૩૯૫૦૦૪',
      mobileNumber: '',
      photoUrl: ''
    },
    {
      id: 3,
      name: 'વોરા છગનભાઇ મેરામણભાઇ',
      age: '૭૧',
      occupation: 'નિવૃત',
      address: '૯૭, નંદનવન સોસા., સિંગણપોર ચાર રસ્તા પાસે, કતારગામ, સુરત-૩૯૫૦૦૪',
      mobileNumber: '',
      photoUrl: ''
    }
  ]
};
