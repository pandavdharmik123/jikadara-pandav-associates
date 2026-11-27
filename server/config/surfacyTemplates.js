/**
 * Structured Template & Field-Mapping Configuration for Surfacy Case Filing
 * (SARFAESI Act Section 14 Applications)
 *
 * Adding a new template in the future only requires adding an entry here and
 * placing its master .docx file inside server/templates/surfacy/.
 */

export function buildDefaultPropertyDescription(property = {}) {
  const flatNo = (property.flatHouseNo || '').trim();
  const builtUp = (property.builtUpArea || '').trim();
  const areaUnit = (property.areaUnit || 'Sq.fts').trim();
  const floor = (property.floorNumber || '').trim();
  const newProp = (property.newPropertyNo || '').trim();
  const oldProp = (property.oldPropertyNo || '').trim();
  const building = (property.buildingName || '').trim();
  const plotNo = (property.plotNo || '').trim();
  const plotArea = (property.plotArea || '').trim();
  const surveyNo = (property.blockSurveyNo || '').trim();
  const newSurveyNo = (property.newSurveyNo || '').trim();
  const village = (property.villageMoje || '').trim();
  const taluka = (property.talukaSubDistrict || '').trim();
  const district = (property.district || '').trim();

  const parts = [];
  let head = 'All right title and interest of land bearing';
  if (flatNo) head += ` Flat / House No- ${flatNo}`;
  if (builtUp) head += ` Built up admeasuring ${builtUp} ${areaUnit}`;
  if (floor) head += ` on ${floor}`;
  if (newProp || oldProp) {
    const propNums = [
      newProp ? `${newProp} (New)` : '',
      oldProp ? `${oldProp} (Old)` : '',
    ].filter(Boolean).join(', ');
    head += ` As Per Property / House No- ${propNums}`;
  }
  parts.push(head);

  if (building) {
    parts.push(`together with undivided Proportionate share underneath land which known as "${building}"`);
  }
  if (plotNo || plotArea) {
    parts.push(`Constructed on${plotNo ? ` Plot No- ${plotNo}` : ''}${plotArea ? ` admeasuring ${plotArea}` : ''}`);
  }
  if (surveyNo || newSurveyNo) {
    let s = `Situated of land bearing`;
    if (surveyNo) s += ` Block/Revenue Survey No- ${surveyNo}`;
    if (newSurveyNo) s += ` After Promulgation Block/Revenue Survey No- ${newSurveyNo}`;
    parts.push(s);
  }

  const loc = [
    village ? `Moje Village:- ${village}` : '',
    taluka ? `Sub District:- ${taluka}` : '',
    district ? `District:- ${district}` : '',
  ].filter(Boolean).join(', ');
  if (loc) parts.push(`${loc}.`);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export const DEFAULT_SARFAESI_ANNEXURES = [
  {
    id: 'annex-a',
    serialNo: '1',
    annexureName: 'Annexure A',
    particulars: 'Annexure A Copy of Authority Letter/ Power of Attorney of the Authorised Officer.',
    pageNo: '',
  },
  {
    id: 'annex-b',
    serialNo: '2',
    annexureName: 'Annexure B',
    particulars: 'Annexure B Copy of Loan Application Form, Copy of Sanction letter of availed loan facility and Copy of Loan Agreement.',
    pageNo: '',
  },
  {
    id: 'annex-c',
    serialNo: '3',
    annexureName: 'Annexure C',
    particulars: 'Annexure C - Copy of Sale Deeds as ownership proof of Borrower/ Mortgagor and Letter evidencing Deposit of title deeds duly registered with office of Sub Registrar.',
    pageNo: '',
  },
  {
    id: 'annex-d',
    serialNo: '4',
    annexureName: 'Annexure D',
    particulars: 'Annexure D - Copy of the Demand Notice issued under Section 13 (2) of the SARFAESI Act along with Postal receipts and acknowledgement by the borrower signature on receipt of same.',
    pageNo: '',
  },
  {
    id: 'annex-e',
    serialNo: '5',
    annexureName: 'Annexure E',
    particulars: 'Annexure E - Copy of the Possession Notice and Paper Publication of Possession Notice in two leading newspaper, Photographs of Affixation.',
    pageNo: '',
  },
  {
    id: 'annex-f',
    serialNo: '6',
    annexureName: '',
    particulars: 'Statement of Account',
    pageNo: '',
  },
];

export const SARFAESI_SECTIONS = [
  { id: 'court', code: 'A', title: 'Court & Case Information', description: 'Court jurisdiction, application number, and filing metadata' },
  { id: 'applicant', code: 'B', title: 'Applicant / Financial Institution', description: 'Secured creditor details and Authorized Officer' },
  { id: 'opponents', code: 'C', title: 'Opponent / Borrower Information', description: 'Borrowers, co-borrowers, and guarantors (dynamic list)' },
  { id: 'loans', code: 'D', title: 'Loan Information', description: 'Sanction, mortgage registration, and liability details (dynamic list)' },
  { id: 'property', code: 'E', title: 'Secured Property Information', description: 'Immovable property description and four boundaries' },
  { id: 'proceedings', code: 'F', title: 'SARFAESI Proceedings', description: 'NPA classification, Section 13(2) demand notice, and symbolic possession' },
  { id: 'affidavit', code: 'G', title: 'Affidavit Details', description: 'Deponent, aggregate financial assistance, and execution details' },
  { id: 'vakalatnama', code: 'H', title: 'Vakalatnama Details', description: 'Appointed advocates, office address, and enrollment details' },
  { id: 'annexures', code: 'I', title: 'List of Documents / Annexures', description: 'Dynamic index of annexures and page numbers' },
];

export const SARFAESI_FIELD_MAPPING = [
  // A. Court & Case Information
  { fieldId: 'court.courtName', label: 'Court Name', type: 'text', section: 'court', required: true, defaultValue: 'ADDL. CHIEF JUDICIAL MAGISTRATE', placeholder: 'BEFORE THE HON’BLE [COURT NAME]', repeatedOccurrences: ['Main Application Heading', 'Affidavit Heading', 'Vakalatnama Heading', 'List of Documents Heading'], validationRules: { minLength: 3 }, editable: true },
  { fieldId: 'court.courtLocation', label: 'Court Location', type: 'text', section: 'court', required: true, defaultValue: '', placeholder: 'AT [COURT LOCATION]', repeatedOccurrences: ['Main Application Heading', 'Main Application Footer', 'Verification', 'Affidavit Heading', 'Affidavit Affirmation', 'Vakalatnama Heading', 'List of Documents Heading', 'List of Documents Footer'], validationRules: { minLength: 2 }, editable: true },
  { fieldId: 'court.applicationNumber', label: 'Application Number', type: 'text', section: 'court', required: false, defaultValue: '', placeholder: 'APPLICATION NO. [NO] / [YEAR]', repeatedOccurrences: ['Main Application', 'Affidavit', 'Vakalatnama', 'List of Documents'], validationRules: {}, editable: true },
  { fieldId: 'court.applicationYear', label: 'Application Year', type: 'text', section: 'court', required: true, defaultValue: String(new Date().getFullYear()), placeholder: '/ 2026', repeatedOccurrences: ['Main Application', 'Verification', 'Affidavit', 'Vakalatnama', 'List of Documents'], validationRules: { pattern: '^\\d{4}$' }, editable: true },
  { fieldId: 'court.filingDate', label: 'Filing Date', type: 'date', section: 'court', required: false, defaultValue: '', placeholder: 'Dt. DD / MM / YYYY', repeatedOccurrences: ['Main Application Signature', 'List of Documents Signature'], validationRules: {}, editable: true },
  { fieldId: 'court.district', label: 'District', type: 'text', section: 'court', required: true, defaultValue: '', placeholder: 'District', repeatedOccurrences: ['Property Description', 'Jurisdiction'], validationRules: { minLength: 2 }, editable: true },

  // B. Applicant / Financial Institution
  { fieldId: 'applicant.institutionName', label: 'Financial Institution Name', type: 'text', section: 'applicant', required: true, defaultValue: '', placeholder: 'Applicant Bank / HFC Name', repeatedOccurrences: ['Cause Title', 'Para 1', 'Para 7', 'Affidavit Body', 'Affidavit Heading', 'Vakalatnama Heading', 'List of Documents Heading'], validationRules: { minLength: 3 }, editable: true },
  { fieldId: 'applicant.formerInstitutionName', label: 'Former Institution Name', type: 'text', section: 'applicant', required: false, defaultValue: '', placeholder: '(Formerly known As ...)', repeatedOccurrences: ['Cause Title', 'Para 1', 'Para 7', 'Affidavit', 'Vakalatnama', 'List of Documents'], validationRules: {}, editable: true },
  { fieldId: 'applicant.registeredOfficeAddress', label: 'Registered Office Address', type: 'textarea', section: 'applicant', required: true, defaultValue: '', placeholder: 'Registered Office Address', repeatedOccurrences: ['Cause Title', 'Para 1', 'Affidavit'], validationRules: { minLength: 5 }, editable: true },
  { fieldId: 'applicant.branchOfficeAddress', label: 'Branch Office Address', type: 'textarea', section: 'applicant', required: true, defaultValue: '', placeholder: 'Branch Office Address', repeatedOccurrences: ['Cause Title', 'Para 1', 'Affidavit'], validationRules: { minLength: 5 }, editable: true },
  { fieldId: 'applicant.authorizedOfficerName', label: 'Authorized Officer Name', type: 'text', section: 'applicant', required: true, defaultValue: '', placeholder: 'Mr. / Ms. ...', repeatedOccurrences: ['Cause Title', 'Para 3', 'Verification', 'Affidavit Body'], validationRules: { minLength: 2 }, editable: true },
  { fieldId: 'applicant.authorizedOfficerDesignation', label: 'Authorized Officer Designation', type: 'text', section: 'applicant', required: true, defaultValue: 'Authorized Officer and Manager', placeholder: 'Authorized Officer and Manager', repeatedOccurrences: ['Para 3', 'Verification', 'Affidavit'], validationRules: {}, editable: true },

  // C. Opponent / Borrower Information (array)
  { fieldId: 'opponents', label: 'Opponents / Borrowers', type: 'array', section: 'opponents', required: true, defaultValue: [], placeholder: '(1) NAME (Role)...', repeatedOccurrences: ['Cause Title', 'Para 4', 'Para 6', 'Affidavit Heading', 'Vakalatnama Heading', 'List of Documents Heading'], validationRules: { minItems: 1 }, editable: true },

  // D. Loan Information (array + shared dates)
  { fieldId: 'loans', label: 'Loan Records', type: 'array', section: 'loans', required: true, defaultValue: [], placeholder: 'Sanction Table, Liability Table, Affidavit Table', repeatedOccurrences: ['Para 4 Sanction Table', 'Para 5 Liability Table', 'Affidavit Table'], validationRules: { minItems: 1 }, editable: true },

  // E. Secured Property Information
  { fieldId: 'property.completePropertyDescription', label: 'Complete Property Description', type: 'textarea', section: 'property', required: true, defaultValue: '', placeholder: 'All right title and interest of...', repeatedOccurrences: ['Main Application Para 6', 'Prayer Section', 'Affidavit Para'], validationRules: { minLength: 10 }, editable: true },
  { fieldId: 'property.boundaries.north', label: 'North Boundary', type: 'text', section: 'property', required: true, defaultValue: '', placeholder: 'North boundary', repeatedOccurrences: ['Main Application Para 6', 'Prayer Section', 'Affidavit'], validationRules: {}, editable: true },
  { fieldId: 'property.boundaries.south', label: 'South Boundary', type: 'text', section: 'property', required: true, defaultValue: '', placeholder: 'South boundary', repeatedOccurrences: ['Main Application Para 6', 'Prayer Section', 'Affidavit'], validationRules: {}, editable: true },
  { fieldId: 'property.boundaries.east', label: 'East Boundary', type: 'text', section: 'property', required: true, defaultValue: '', placeholder: 'East boundary', repeatedOccurrences: ['Main Application Para 6', 'Prayer Section', 'Affidavit'], validationRules: {}, editable: true },
  { fieldId: 'property.boundaries.west', label: 'West Boundary', type: 'text', section: 'property', required: true, defaultValue: '', placeholder: 'West boundary', repeatedOccurrences: ['Main Application Para 6', 'Prayer Section', 'Affidavit'], validationRules: {}, editable: true },

  // F. SARFAESI Proceedings
  { fieldId: 'proceedings.npaDate', label: 'NPA Classification Date', type: 'date', section: 'proceedings', required: true, defaultValue: '', placeholder: 'DD/MM/YYYY', repeatedOccurrences: ['Para 7 (twice)', 'Affidavit'], validationRules: {}, editable: true },
  { fieldId: 'proceedings.demandNoticeDate', label: 'Demand Notice Date (u/s 13(2))', type: 'date', section: 'proceedings', required: true, defaultValue: '', placeholder: 'DD/MM/YYYY', repeatedOccurrences: ['Para 8', 'Affidavit'], validationRules: {}, editable: true },
  { fieldId: 'proceedings.demandNoticeAmount', label: 'Demand Notice Amount (Rs.)', type: 'currency', section: 'proceedings', required: true, defaultValue: '', placeholder: 'Rs. X,XX,XXX/-', repeatedOccurrences: ['Para 8', 'Affidavit Claim'], validationRules: { min: 1 }, editable: true },
  { fieldId: 'proceedings.symbolicPossessionDate', label: 'Symbolic Possession Date', type: 'date', section: 'proceedings', required: true, defaultValue: '', placeholder: 'DD/MM/YYYY', repeatedOccurrences: ['Para 10'], validationRules: {}, editable: true },
  { fieldId: 'proceedings.statutoryNoticePeriod', label: 'Statutory Notice Period', type: 'text', section: 'proceedings', required: true, defaultValue: '60 days', placeholder: '60 days', repeatedOccurrences: ['Para 8', 'Affidavit'], validationRules: {}, editable: true },

  // G. Affidavit Details
  { fieldId: 'affidavit.deponentName', label: 'Deponent (Authorized Officer) Name', type: 'text', section: 'affidavit', required: true, defaultValue: '', placeholder: 'Authorized Officer Name', repeatedOccurrences: ['Affidavit Opening', 'Verification'], validationRules: {}, editable: true },
  { fieldId: 'affidavit.age', label: 'Deponent Age', type: 'text', section: 'affidavit', required: true, defaultValue: 'Adult', placeholder: 'Adult', repeatedOccurrences: ['Verification', 'Affidavit'], validationRules: {}, editable: true },
  { fieldId: 'affidavit.occupation', label: 'Deponent Occupation', type: 'text', section: 'affidavit', required: true, defaultValue: 'Service', placeholder: 'Service', repeatedOccurrences: ['Verification', 'Affidavit'], validationRules: {}, editable: true },
  { fieldId: 'affidavit.totalOutstandingClaim', label: 'Total Outstanding Claim (Rs.)', type: 'currency', section: 'affidavit', required: true, defaultValue: '', placeholder: 'Rs. X,XX,XXX/-', repeatedOccurrences: ['Affidavit Claim', 'Affidavit Default'], validationRules: {}, editable: true },
  { fieldId: 'affidavit.executionPlace', label: 'Execution Place', type: 'text', section: 'affidavit', required: true, defaultValue: '', placeholder: 'Execution Place', repeatedOccurrences: ['Affidavit Affirmation'], validationRules: {}, editable: true },

  // H. Vakalatnama Details
  { fieldId: 'vakalatnama.advocates', label: 'Appointed Advocates', type: 'array', section: 'vakalatnama', required: true, defaultValue: [], placeholder: 'Advocate Names', repeatedOccurrences: ['Vakalatnama Body', 'Advocate Block'], validationRules: { minItems: 1 }, editable: true },
  { fieldId: 'vakalatnama.officeAddress', label: 'Advocate Office Address', type: 'textarea', section: 'vakalatnama', required: true, defaultValue: '201, Sundaram Plus, Opp. Central Bank, Nanpura, Surat-395001', placeholder: 'Office Address', repeatedOccurrences: ['Vakalatnama Footer'], validationRules: {}, editable: true },
  { fieldId: 'vakalatnama.mobileNumber', label: 'Advocate Mobile Number', type: 'text', section: 'vakalatnama', required: true, defaultValue: '7405698382', placeholder: 'Mobile Number', repeatedOccurrences: ['Vakalatnama Footer'], validationRules: {}, editable: true },
  { fieldId: 'vakalatnama.enrollmentNumber', label: 'Bar Council Enrollment Number', type: 'text', section: 'vakalatnama', required: true, defaultValue: 'G/2769/2020', placeholder: 'G/XXXX/YYYY', repeatedOccurrences: ['Vakalatnama Footer'], validationRules: {}, editable: true },

  // I. List of Documents / Annexures
  { fieldId: 'annexures', label: 'List of Documents / Annexures', type: 'array', section: 'annexures', required: true, defaultValue: DEFAULT_SARFAESI_ANNEXURES, placeholder: 'Annexure Table', repeatedOccurrences: ['List of Documents Table'], validationRules: { minItems: 1 }, editable: true },
];

export const SARFAESI_SEC14_NAVSARI_TEMPLATE = {
  templateKey: 'sarfaesi_sec14_navsari_v1',
  name: 'SARFAESI Section 14 Application (Navsari ACJM Format)',
  description: '15-page Section 14 SARFAESI application containing Main Application, Verification, Affidavit, Vakalatnama, and List of Documents / Annexures.',
  fileName: 'sarfaesi-sec14-navsari.docx',
  version: '1.0.0',
  isActive: true,
  sections: SARFAESI_SECTIONS,
  fieldMapping: SARFAESI_FIELD_MAPPING,
  placeholderMapping: {
    documentParts: ['Main Application (Sec 14)', 'Verification', 'Affidavit', 'Vakalatnama', 'List of Documents'],
    tables: ['Loan Sanction Table (P22)', 'Loan Liability Table (P25)', 'Affidavit Loan Table (P96)', 'Annexure Table (P155)'],
    dynamicParagraphGroups: ['Opponents Cause Title (P6-P13)', 'Opponents Para 4 (P21)', 'Opponents Para 6 (P28)'],
  },
};

export function createEmptySurfacyFormData() {
  return {
    court: {
      courtName: 'ADDL. CHIEF JUDICIAL MAGISTRATE',
      courtLocation: '',
      applicationNumber: '',
      applicationYear: String(new Date().getFullYear()),
      filingDate: '',
      district: '',
    },
    applicant: {
      institutionName: 'Aavas Financiers Limited',
      formerInstitutionName: 'AU Housing Finance Limited',
      registeredOfficeAddress: '201-202, 2nd Floor, South End Square, Mansarovar Industrial Area, Jaipur-302020 (Rajasthan)',
      branchOfficeAddress: '301, Regent Square, Above D-Mart, Adajan, Surat-395009, Gujarat.',
      authorizedOfficerName: 'Mr. Ashok Kumar',
      authorizedOfficerDesignation: 'Authorized Officer and Manager',
    },
    opponents: [
      {
        id: 'opp-1',
        fullName: '',
        relationName: '',
        relationship: 'S/o',
        role: 'Borrower',
        residentialAddress: '',
        alternateAddress: '',
      },
    ],
    loans: [
      {
        id: 'loan-1',
        loanAccountNo: '',
        loanType: 'Housing Loan',
        applicationDate: '',
        sanctionDate: '',
        sanctionedAmount: '',
        loanAgreementDate: '',
        depositTitleDeedsDate: '',
        mortgageSubRegistrar: '',
        mortgageSerialNo: '',
        mortgageRegDate: '',
        outstandingAmount: '',
        liabilityDate: '',
        interestDetails: '',
      },
    ],
    property: {
      flatHouseNo: '',
      builtUpArea: '',
      areaUnit: 'Sq.fts',
      floorNumber: '',
      newPropertyNo: '',
      oldPropertyNo: '',
      buildingName: '',
      plotNo: '',
      plotArea: '',
      blockSurveyNo: '',
      newSurveyNo: '',
      villageMoje: '',
      talukaSubDistrict: '',
      district: '',
      completePropertyDescription: '',
      manualDescriptionOverride: false,
      boundaries: {
        north: '',
        south: '',
        east: '',
        west: '',
      },
    },
    proceedings: {
      npaDate: '',
      demandNoticeDate: '',
      demandNoticeAmount: '',
      demandNoticeServiceDate: '',
      statutoryNoticePeriod: '60 days',
      symbolicPossessionDate: '',
      newspaperPublicationDetails: '',
      policeStationDetails: '',
      annexureReferences: 'Annexure A to E',
    },
    affidavit: {
      deponentName: 'Mr. Ashok Kumar',
      age: 'Adult',
      occupation: 'Service',
      aggregateFinancialAssistance: '',
      totalOutstandingClaim: '',
      npaDate: '',
      demandNoticeDate: '',
      executionDate: '',
      executionPlace: '',
    },
    vakalatnama: {
      advocates: [
        {
          id: 'adv-1',
          name: 'MR. CHANDRESH B. PANDAV',
          isPrimary: true,
        },
        {
          id: 'adv-2',
          name: 'NIRAV P. PANDAV',
          isPrimary: false,
        },
      ],
      additionalAdvocatesText: '',
      executionDate: '',
      officeAddress: '201, Sundaram Plus, Opp. Central Bank, Nanpura, Surat-395001',
      mobileNumber: '7405698382',
      enrollmentNumber: 'G/2769/2020',
    },
    annexures: DEFAULT_SARFAESI_ANNEXURES.map((a) => ({ ...a })),
  };
}
