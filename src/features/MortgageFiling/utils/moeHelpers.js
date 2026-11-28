import dayjs from 'dayjs';

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

function rawWords(n) {
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

export function numberToIndianRupeesWords(amountInput) {
  const num = Math.round(Number(String(amountInput ?? '').replace(/[^0-9.-]/g, '')));
  if (!Number.isFinite(num) || num <= 0) return 'Zero Rupees Only';

  let n = num;
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) parts.push(`${rawWords(crore)} Crore`);

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) parts.push(`${twoDigitsToWords(lakh)} Lakh`);

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) parts.push(`${twoDigitsToWords(thousand)} Thousand`);

  if (n > 0) parts.push(threeDigitsToWords(n));
  return `${parts.join(' ').trim()} Rupees Only`;
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

export function validateMoeFormData(formData = {}) {
  const errors = [];
  const warnings = [];

  const s1 = formData.schedule1 || {};
  const s2 = formData.schedule2 || {};
  const s3 = formData.schedule3 || {};
  const s4 = formData.schedule4 || {};
  const s5 = formData.schedule5 || {};
  const s6 = formData.schedule6 || {};
  const clauses = formData.conditionalClauses || {};

  if (!s1.depositPlace?.trim()) errors.push({ section: 'schedule1', message: 'Place of deposit is required.' });
  if (!s1.depositDate) errors.push({ section: 'schedule1', message: 'Date of deposit is required.' });
  if (!s1.bankName?.trim()) errors.push({ section: 'schedule1', message: 'Bank name is required.' });
  if (!s1.bankBranchAddress?.trim()) errors.push({ section: 'schedule1', message: 'Bank branch address is required.' });
  if (!s1.authorizedOfficerName?.trim()) errors.push({ section: 'schedule1', message: 'Authorized bank officer name is required.' });

  const sps = Array.isArray(s2.securityProviders) ? s2.securityProviders : [];
  if (sps.length === 0) {
    errors.push({ section: 'schedule2', message: 'At least one Security Provider is required.' });
  } else {
    sps.forEach((sp, i) => {
      if (!sp.fullName?.trim()) errors.push({ section: 'schedule2', message: `Security Provider #${i + 1} Full Name is required.` });
      if (!sp.residentialAddress?.trim() && !sp.address?.trim()) {
        errors.push({ section: 'schedule2', message: `Security Provider #${i + 1} Address is required.` });
      }
      if (sp.personType === 'Company' && clauses.sec180_companies_act !== 'APPLICABLE') {
        warnings.push({ section: 'clauses', message: `Security Provider #${i + 1} is a Company; review Section 180(1)(a) clause.` });
      }
    });
  }
  if (s2.hasAuthorizedPerson === 'Yes' && !s2.authorizedPersonName?.trim()) {
    errors.push({ section: 'schedule2', message: 'Authorized person name is required.' });
  }

  const borrowers = Array.isArray(s3.borrowers) ? s3.borrowers : [];
  if (borrowers.length === 0) {
    errors.push({ section: 'schedule3', message: 'At least one Borrower is required.' });
  } else {
    borrowers.forEach((b, i) => {
      if (!b.fullName?.trim()) errors.push({ section: 'schedule3', message: `Borrower #${i + 1} Full Name is required.` });
    });
  }

  const facilities = Array.isArray(s3.facilities) ? s3.facilities : [];
  if (facilities.length === 0) {
    errors.push({ section: 'schedule3', message: 'At least one Financial Facility is required.' });
  } else {
    facilities.forEach((f, i) => {
      if (!f.facilityName?.trim()) errors.push({ section: 'schedule3', message: `Facility #${i + 1} Name is required.` });
      const amt = Number(String(f.facilityAmount || '').replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(amt) || amt <= 0) {
        errors.push({ section: 'schedule3', message: `Facility #${i + 1} Amount must be positive.` });
      }
    });
  }

  const depD = s1.depositDate ? dayjs(s1.depositDate) : null;
  (s3.sanctionLetters || []).forEach((sl, i) => {
    if (depD && sl.sanctionDate && dayjs(sl.sanctionDate).isAfter(depD, 'day')) {
      warnings.push({ section: 'schedule3', message: `Sanction Letter #${i + 1} date is after Deposit date.` });
    }
  });

  if (!Array.isArray(s4.titleDocuments) || s4.titleDocuments.length === 0) {
    errors.push({ section: 'schedule4', message: 'At least one Title Document is required.' });
  }

  const props = Array.isArray(s5.properties) ? s5.properties : [];
  if (props.length === 0) {
    errors.push({ section: 'schedule5', message: 'At least one Property is required.' });
  } else {
    props.forEach((p, i) => {
      const b = p.boundaries || {};
      if (!b.east?.trim() || !b.west?.trim() || !b.north?.trim() || !b.south?.trim()) {
        errors.push({ section: 'schedule5', message: `Property #${i + 1} requires all 4 boundaries.` });
      }
    });
  }

  if (s6.hasExistingCharges === 'EXISTING' && (!Array.isArray(s6.existingCharges) || s6.existingCharges.length === 0)) {
    errors.push({ section: 'schedule6', message: 'Add at least one existing charge or select NIL.' });
  }

  if (clauses.sec180_companies_act === 'UNCERTAIN' || clauses.sec281_income_tax === 'UNCERTAIN') {
    warnings.push({ section: 'clauses', message: 'Conditional clause(s) marked for Advocate Review.' });
  }

  const sectionCounts = {};
  for (const e of errors) {
    sectionCounts[e.section] = sectionCounts[e.section] || { errors: 0, warnings: 0 };
    sectionCounts[e.section].errors += 1;
  }
  for (const w of warnings) {
    sectionCounts[w.section] = sectionCounts[w.section] || { errors: 0, warnings: 0 };
    sectionCounts[w.section].warnings += 1;
  }

  return { isValid: errors.length === 0, errors, warnings, sectionCounts };
}

export function collectMoeHighlightTokens(formData = {}) {
  const tokens = new Set();
  const add = (val) => {
    const s = String(val || '').trim();
    if (s.length >= 3) tokens.add(s);
  };

  add(formData.schedule1?.depositPlace);
  add(formData.schedule1?.bankName);
  add(formData.schedule1?.authorizedOfficerName);
  (formData.schedule2?.securityProviders || []).forEach((p) => add(p.fullName));
  (formData.schedule3?.borrowers || []).forEach((b) => add(b.fullName));
  (formData.schedule3?.facilities || []).forEach((f) => add(f.facilityName));
  (formData.schedule5?.properties || []).forEach((p) => {
    add(p.boundaries?.east);
    add(p.boundaries?.west);
    add(p.boundaries?.north);
    add(p.boundaries?.south);
  });

  return Array.from(tokens).sort((a, b) => b.length - a.length);
}
