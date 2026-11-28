/**
 * Reusable Template & Field-Mapping Configuration for Mortgage Filing (MOE Builder)
 * Completely independent from Surfacy Case Filing.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitsToWords(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${ONES[o]}` : ''}`.trim();
}

function threeDigitsToWords(n) {
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const parts = [];
  if (h > 0) parts.push(`${ONES[h]} Hundred`);
  if (rem > 0) parts.push(twoDigitsToWords(rem));
  return parts.join(' ').trim();
}

/**
 * Reliable Indian Numbering System converter (Crore, Lakh, Thousand, Hundred).
 * Example: 1476023 -> "Fourteen Lakh Seventy Six Thousand Twenty Three Rupees Only"
 */
export function numberToIndianRupeesWords(amountInput) {
  const num = Math.round(Number(String(amountInput ?? '').replace(/[^0-9.-]/g, '')));
  if (!Number.isFinite(num) || num <= 0) return 'Zero Rupees Only';

  let n = num;
  const parts = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) parts.push(`${numberToIndianRupeesWordsRaw(crore)} Crore`);

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) parts.push(`${twoDigitsToWords(lakh)} Lakh`);

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) parts.push(`${twoDigitsToWords(thousand)} Thousand`);

  if (n > 0) parts.push(threeDigitsToWords(n));

  return `${parts.join(' ').trim()} Rupees Only`;
}

function numberToIndianRupeesWordsRaw(n) {
  if (n < 100) return twoDigitsToWords(n);
  if (n < 1000) return threeDigitsToWords(n);
  const parts = [];
  const lakh = Math.floor(n / 100000);
  let rem = n % 100000;
  if (lakh > 0) parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  if (thousand > 0) parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  if (rem > 0) parts.push(threeDigitsToWords(rem));
  return parts.join(' ').trim();
}

export function formatIndianAmount(val) {
  const num = Math.round(Number(String(val ?? '').replace(/[^0-9.-]/g, '')));
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-IN');
}

export function buildTitleDocumentDescription(doc = {}) {
  const copyPrefix = doc.copyType === 'Certified Copy' ? 'Certified Copy of ' : 'Original ';
  const docType = doc.documentType || 'Registered Sale Deed';
  const regNo = (doc.registrationNo || '').trim();
  const oldReg = (doc.oldRegistrationNo || '').trim();
  const docDate = (doc.documentDate || '').trim();
  const oldDate = (doc.oldDocumentDate || '').trim();
  const executedBy = (doc.executedBy || '').trim();
  const executedInFavourOf = (doc.executedInFavourOf || '').trim();
  const poaHolder = (doc.poaHolder || '').trim();
  const rrSuffix = doc.rrDetails ? ` ${doc.rrDetails.trim()}` : '';

  const regPart = oldReg ? `${regNo} (Old Reg. No. ${oldReg})` : regNo;
  const datePart = oldDate ? `${docDate} (Old Date: ${oldDate})` : docDate;
  const poaPart = poaHolder ? ` Through their power of attorney holder ${poaHolder}` : '';

  if (docType === 'NOC') {
    return `${executedBy ? `NOC From ${executedBy}` : 'NOC'}${doc.remarks ? ` - ${doc.remarks}` : ''}`.trim();
  }
  if (docType === 'Notarized Sale Agreement') {
    return `${copyPrefix}Notarized Sale Agreement Serial No. ${regPart} dated ${datePart} executed by ${executedBy}${poaPart} in favour of ${executedInFavourOf}${rrSuffix}.`.replace(/\s+/g, ' ').trim();
  }
  if (docType === 'Reconveyance Deed') {
    return `${copyPrefix}Reconveyance Deed No. ${regPart} dated ${datePart} executed by ${executedBy} in favour of ${executedInFavourOf}${rrSuffix || ' alongwith its RR'}.`.replace(/\s+/g, ' ').trim();
  }
  if (docType === 'Power of Attorney') {
    return `${copyPrefix}Power of Attorney No. ${regPart} dated ${datePart} executed by ${executedBy} in favour of ${executedInFavourOf}${rrSuffix}.`.replace(/\s+/g, ' ').trim();
  }
  if (docType === 'Other') {
    return (doc.remarks || `${copyPrefix}${regPart} dated ${datePart}`).trim();
  }
  // Registered Sale Deed (default)
  return `${copyPrefix}Reg. Sale Deed No. ${regPart} dated ${datePart} executed by ${executedBy}${poaPart} in favour of ${executedInFavourOf}${rrSuffix || ' alongwith its RR'}.`.replace(/\s+/g, ' ').trim();
}

export function buildMoePropertyDescription(prop = {}) {
  const propType = (prop.propertyType || 'residential house property').trim();
  const plotNo = (prop.plotNo || '').trim();
  const houseNo = (prop.houseFlatUnitNo || '').trim();
  const society = (prop.societyBuildingName || '').trim();
  const landArea = (prop.landArea || '').trim();
  const surveyNo = (prop.revenueSurveyNo || prop.surveyNo || '').trim();
  const blockNo = (prop.blockNo || '').trim();
  const village = (prop.villageMoje || '').trim();
  const taluka = (prop.talukaSubDistrict || '').trim();
  const district = (prop.district || '').trim();
  const propArea = (prop.propertyArea || '').trim();
  const areaUnit = (prop.areaUnit || 'Sq. Yards').trim();

  const parts = [`All that ${propType}`];
  if (houseNo) parts.push(`bearing ${houseNo}`);
  if (plotNo) parts.push(`constructed upon Plot No. ${plotNo},`);
  if (society) parts.push(`out of the plots situated in the society known as "${society}",`);
  if (landArea) parts.push(`planned on the non-agricultural land admeasuring ${landArea}`);
  if (surveyNo || blockNo) {
    const s = [
      surveyNo ? `Revenue Survey Nos. ${surveyNo}` : '',
      blockNo ? `Block No. ${blockNo}` : '',
    ].filter(Boolean).join(', ');
    parts.push(`bearing ${s},`);
  }
  const loc = [
    village ? `situated at Moje Village ${village}` : '',
    taluka ? `Sub-District Taluka ${taluka}` : '',
    district ? `District ${district}` : '',
  ].filter(Boolean).join(', ');
  if (loc) parts.push(`${loc},`);
  if (propArea) parts.push(`having an area of ${propArea} ${areaUnit},`);
  parts.push('together with all internal and external rights, easements, and appurtenances attached thereto in its entirety.');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export const MOE_SECTIONS = [
  { id: 'schedule1', number: 1, title: 'Schedule I – Deposit & Bank', shortTitle: 'Deposit & Bank' },
  { id: 'schedule2', number: 2, title: 'Schedule II – Security Provider', shortTitle: 'Security Provider' },
  { id: 'schedule3', number: 3, title: 'Schedule III – Borrower & Facilities', shortTitle: 'Borrower & Facilities' },
  { id: 'schedule4', number: 4, title: 'Schedule IV – List of Title Documents', shortTitle: 'Title Documents' },
  { id: 'schedule5', number: 5, title: 'Schedule V – Immovable Property', shortTitle: 'Property Details' },
  { id: 'schedule6', number: 6, title: 'Schedule VI – Existing Charges', shortTitle: 'Existing Charges' },
  { id: 'clauses', number: 7, title: 'Legal Declarations & Conditional Clauses', shortTitle: 'Legal Clauses' },
  { id: 'execution', number: 8, title: 'Signatures, Photos & Execution', shortTitle: 'Signatures & Photos' },
];

export const MOE_CONDITIONAL_CLAUSES = [
  {
    id: 'sec180_companies_act',
    title: 'Section 180(1)(a) Companies Act, 2013 Resolution',
    clauseRef: 'Main Memorandum – Paragraph P[36]',
    condition: 'Applicable when Security Provider is a Company under Companies Act, 2013.',
    originalText: 'The shareholders have at its general meeting/ extra ordinary general meeting duly passed a resolution under Section 180(1) (a) of the Companies Act, 2013 authorising creation of the mortgage over the Immovable Properties in favour of the Bank...',
  },
  {
    id: 'sec281_income_tax',
    title: 'Section 281 Income-Tax Permission / Clearance',
    clauseRef: 'Schedule III – Authorizations & Clearances',
    condition: 'Applicable when prior permission under Section 281 of Income-tax Act, 1961 is obtained or required.',
    originalText: 'Description of authorizations and clearances (Section 281 permission, NOC, approvals)',
  },
  {
    id: 'authorized_person_deposit',
    title: 'Authorized Person / POA Deposit Declaration',
    clauseRef: 'Main Memorandum & Schedule II (Sr. No. 2 & 3)',
    condition: 'Applicable when title deeds are deposited by an authorized representative / POA holder instead of the Security Provider personally.',
    originalText: 'Details of the person authorized on behalf of the Security Provider(s) to deposit the title deed & POA/Resolution details.',
  },
  {
    id: 'existing_charges_disclosure',
    title: 'Prior / Existing Charges Disclosure',
    clauseRef: 'Schedule VI',
    condition: 'Must match whether existing charges/encumbrances exist or NIL.',
    originalText: 'Details of the existing charges/ security interest on the immovable properties',
  },
];

export const MOE_AXIS_DEFAULT_BANK = {
  bankName: 'Axis Bank Limited',
  bankShortName: 'Axis Bank Ltd',
  registeredOfficeAddress: '‘Trishul’, 3rd Floor, Opposite Samartheshwar Temple, Law Garden, Ellis Bridge, Ahmedabad – 380 006',
  defaultBranchAddress: 'AXIS Bank Limited, Shop No. C-102 & 103, 1st Floor, Sapphire Business Hub, Near Madhuvan Circle, L P Savani School Road, Adajan, Surat – 395009.',
  defaultPlace: 'SURAT',
};

export const MOE_FIELD_MAPPING = [
  { fieldId: 'schedule1.depositPlace', name: 'depositPlace', label: 'Place of Deposit', section: 'schedule1', type: 'text', required: true, defaultValue: 'SURAT', docLocation: 'Memorandum Opening, Schedule I Sr.1, Clause 11', occurrences: 3, repeatable: false, conditionallyRequired: false, autoCalculated: false },
  { fieldId: 'schedule1.depositDate', name: 'depositDate', label: 'Date of Deposit of Title Deeds', section: 'schedule1', type: 'date', required: true, defaultValue: '', docLocation: 'Memorandum Opening, Schedule I Sr.2, Execution Date', occurrences: 3, repeatable: false, conditionallyRequired: false, autoCalculated: false },
  { fieldId: 'schedule1.bankName', name: 'bankName', label: 'Bank Name', section: 'schedule1', type: 'text', required: true, defaultValue: 'Axis Bank Limited', docLocation: 'Memorandum Opening, Schedule I, Schedule III, Bank Officer Block', occurrences: 4, repeatable: false, conditionallyRequired: false, autoCalculated: false },
  { fieldId: 'schedule1.bankBranchAddress', name: 'bankBranchAddress', label: 'Bank Branch Address', section: 'schedule1', type: 'textarea', required: true, defaultValue: MOE_AXIS_DEFAULT_BANK.defaultBranchAddress, docLocation: 'Schedule I Sr.3', occurrences: 1, repeatable: false, conditionallyRequired: false, autoCalculated: false },
  { fieldId: 'schedule1.authorizedOfficerName', name: 'authorizedOfficerName', label: 'Authorized Bank Officer Name', section: 'schedule1', type: 'text', required: true, defaultValue: '', docLocation: 'Schedule I Sr.4, Signature Block, Photo Block', occurrences: 3, repeatable: false, conditionallyRequired: false, autoCalculated: false },
  { fieldId: 'schedule1.authorizedOfficerDesignation', name: 'authorizedOfficerDesignation', label: 'Authorized Officer Designation', section: 'schedule1', type: 'text', required: true, defaultValue: 'Manager', docLocation: 'Schedule I Sr.4, Signature Block, Photo Block', occurrences: 3, repeatable: false, conditionallyRequired: false, autoCalculated: false },
  { fieldId: 'schedule2.securityProviders', name: 'securityProviders', label: 'Security Providers', section: 'schedule2', type: 'array', required: true, defaultValue: [], docLocation: 'Schedule II Sr.1, Signature Block, Photo/Thumb Block', occurrences: 3, repeatable: true, conditionallyRequired: false, autoCalculated: false },
  { fieldId: 'schedule3.borrowers', name: 'borrowers', label: 'Borrowers', section: 'schedule3', type: 'array', required: true, defaultValue: [], docLocation: 'Schedule III Sr.1 & Sr.2', occurrences: 2, repeatable: true, conditionallyRequired: false, autoCalculated: false },
  { fieldId: 'schedule3.facilities', name: 'facilities', label: 'Financial Facilities', section: 'schedule3', type: 'array', required: true, defaultValue: [], docLocation: 'Schedule III Facilities Table', occurrences: 1, repeatable: true, conditionallyRequired: false, autoCalculated: true },
  { fieldId: 'schedule4.titleDocuments', name: 'titleDocuments', label: 'List of Title Documents', section: 'schedule4', type: 'array', required: true, defaultValue: [], docLocation: 'Schedule IV', occurrences: 1, repeatable: true, conditionallyRequired: false, autoCalculated: false },
  { fieldId: 'schedule5.properties', name: 'properties', label: 'Immovable Properties', section: 'schedule5', type: 'array', required: true, defaultValue: [], docLocation: 'Schedule V', occurrences: 1, repeatable: true, conditionallyRequired: false, autoCalculated: false },
];

export const REGISTERED_MOE_AXIS_TEMPLATE = {
  templateKey: 'registered_moe_axis_first_deposit_v1',
  name: 'Registered MOE – First Time Deposit – Axis Bank',
  description: '5-page Memorandum of Agreement (First Time Deposit) for creation of mortgage by way of deposit of title deeds with Schedules I–VI and Photo/Signature blocks.',
  fileName: 'registered-moe-axis-first-deposit.docx',
  version: '1.0.0',
  isActive: true,
  bankDefaults: MOE_AXIS_DEFAULT_BANK,
  sections: MOE_SECTIONS,
  fieldMapping: MOE_FIELD_MAPPING,
  conditionalClauses: MOE_CONDITIONAL_CLAUSES,
};

export function createEmptyMoeFormData(bankDefaults = MOE_AXIS_DEFAULT_BANK) {
  return {
    schedule1: {
      depositPlace: bankDefaults.defaultPlace || 'SURAT',
      depositDate: '',
      bankName: bankDefaults.bankName || 'Axis Bank Limited',
      bankShortName: bankDefaults.bankShortName || 'Axis Bank Ltd',
      bankRegisteredOffice: bankDefaults.registeredOfficeAddress || MOE_AXIS_DEFAULT_BANK.registeredOfficeAddress,
      bankBranchAddress: bankDefaults.defaultBranchAddress || MOE_AXIS_DEFAULT_BANK.defaultBranchAddress,
      authorizedOfficerName: '',
      authorizedOfficerDesignation: 'Manager',
    },
    schedule2: {
      securityProviders: [
        {
          id: 'sp-1',
          fullName: '',
          age: 'Adult',
          address: '',
          residentialAddress: '',
          personType: 'Individual',
          signatureImage: '',
          photoImage: '',
          thumbImage: '',
        },
      ],
      hasAuthorizedPerson: 'No',
      authorizedPersonName: 'NA',
      authorizedPersonAge: '',
      authorizedPersonAddress: '',
      authorizationType: 'NA',
      poaNumber: '',
      poaDate: '',
      resolutionNumber: '',
      resolutionDate: '',
      authorizationDetails: 'NA',
    },
    schedule3: {
      borrowers: [
        {
          id: 'br-1',
          fullName: '',
          age: 'Adult',
          residentialAddress: '',
          registeredOfficeAddress: '',
          principalPlaceOfBusiness: '',
          businessAddress: '',
          borrowerType: 'Individual',
        },
      ],
      facilityAgreements: [
        {
          id: 'fa-1',
          facilityName: 'POWER HOME BRE',
          agreementType: 'Facility Agreement',
          executionDate: '',
          executionPlace: bankDefaults.defaultPlace || 'SURAT',
          borrowerReferences: 'the Borrower and the Bank',
          agreementDescription: '',
        },
      ],
      sanctionLetters: [
        {
          id: 'sl-1',
          sanctionDate: '',
          sanctionRefNo: '',
          bankName: bankDefaults.bankName || 'Axis Bank',
          associatedFacility: 'POWER HOME BRE',
          additionalDetails: '',
        },
      ],
      facilities: [
        {
          id: 'fac-1',
          facilityName: 'POWER HOME BRE',
          facilityAmount: '',
          associatedSanctionLetter: '',
        },
      ],
      authorizationsApplicable: 'No',
      authorizationDescription: 'NA',
      section281Details: '',
      nocDetails: '',
      otherApprovals: '',
      rankingOfSecurityInterest: 'First',
      rankingDescription: '',
    },
    schedule4: {
      titleDocuments: [
        {
          id: 'td-1',
          serialNo: '1',
          documentType: 'Registered Sale Deed',
          copyType: 'Original',
          registrationNo: '',
          oldRegistrationNo: '',
          documentDate: '',
          oldDocumentDate: '',
          executedBy: '',
          executedInFavourOf: '',
          poaHolder: '',
          rrDetails: 'alongwith its RR',
          remarks: '',
          manualDescriptionOverride: false,
          customDescription: '',
        },
      ],
    },
    schedule5: {
      properties: [
        {
          id: 'prop-1',
          propertyType: 'residential house property',
          houseFlatUnitNo: '',
          plotNo: '',
          societyBuildingName: '',
          landArea: '',
          propertyArea: '',
          areaUnit: 'Sq. Yards',
          revenueSurveyNo: '',
          blockNo: '',
          surveyNo: '',
          villageMoje: '',
          talukaSubDistrict: '',
          district: 'Surat',
          state: 'Gujarat',
          boundaries: { east: '', west: '', north: '', south: '' },
          commonAreaRights: true,
          waterFacilities: true,
          drainage: true,
          easementRights: true,
          fixturesAndFittings: true,
          otherPropertyRights: '',
          manualDescriptionOverride: false,
          completePropertyDescription: '',
        },
      ],
    },
    schedule6: {
      hasExistingCharges: 'NIL',
      existingCharges: [],
    },
    conditionalClauses: {
      sec180_companies_act: 'NOT_APPLICABLE',
      sec281_income_tax: 'NOT_APPLICABLE',
      authorized_person_deposit: 'NOT_APPLICABLE',
      existing_charges_disclosure: 'NIL',
      clauseNotes: '',
    },
    execution: {
      executionDate: '',
      bankOfficerSignatureImage: '',
      bankOfficerPhotoImage: '',
    },
  };
}
