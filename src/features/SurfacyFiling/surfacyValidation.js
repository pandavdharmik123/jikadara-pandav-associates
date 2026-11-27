import dayjs from 'dayjs';

function parseDateSafe(val) {
  if (!val) return null;
  const d = dayjs(val);
  return d.isValid() ? d : null;
}

function parseAmount(val) {
  if (val === undefined || val === null || val === '') return NaN;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : NaN;
}

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
    let s = 'Situated of land bearing';
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

export function validateSurfacyFormData(formData = {}) {
  const errors = [];
  const warnings = [];

  const court = formData.court || {};
  const applicant = formData.applicant || {};
  const opponents = Array.isArray(formData.opponents) ? formData.opponents : [];
  const loans = Array.isArray(formData.loans) ? formData.loans : [];
  const property = formData.property || {};
  const proceedings = formData.proceedings || {};
  const affidavit = formData.affidavit || {};
  const vakalatnama = formData.vakalatnama || {};
  const annexures = Array.isArray(formData.annexures) ? formData.annexures : [];

  if (!court.courtName?.trim()) errors.push({ section: 'court', field: 'courtName', message: 'Court Name is required.' });
  if (!court.courtLocation?.trim()) errors.push({ section: 'court', field: 'courtLocation', message: 'Court Location is required.' });
  if (!court.applicationYear?.trim()) errors.push({ section: 'court', field: 'applicationYear', message: 'Application Year is required.' });
  if (!court.district?.trim()) errors.push({ section: 'court', field: 'district', message: 'District is required.' });

  if (!applicant.institutionName?.trim()) errors.push({ section: 'applicant', field: 'institutionName', message: 'Financial Institution Name is required.' });
  if (!applicant.registeredOfficeAddress?.trim()) errors.push({ section: 'applicant', field: 'registeredOfficeAddress', message: 'Registered Office Address is required.' });
  if (!applicant.branchOfficeAddress?.trim()) errors.push({ section: 'applicant', field: 'branchOfficeAddress', message: 'Branch Office Address is required.' });
  if (!applicant.authorizedOfficerName?.trim()) errors.push({ section: 'applicant', field: 'authorizedOfficerName', message: 'Authorized Officer Name is required.' });

  if (opponents.length === 0) {
    errors.push({ section: 'opponents', field: 'opponents', message: 'At least one Opponent / Borrower is required.' });
  } else {
    if (!opponents.some((o) => String(o.role || '').toLowerCase() === 'borrower')) {
      warnings.push({ section: 'opponents', message: 'No opponent is marked as primary "Borrower". Verify party roles.' });
    }
    opponents.forEach((opp, idx) => {
      if (!opp.fullName?.trim()) errors.push({ section: 'opponents', field: `opponents[${idx}].fullName`, message: `Opponent #${idx + 1} Full Name is required.` });
      if (!opp.residentialAddress?.trim()) errors.push({ section: 'opponents', field: `opponents[${idx}].residentialAddress`, message: `Opponent #${idx + 1} Residential Address is required.` });
    });
  }

  if (loans.length === 0) {
    errors.push({ section: 'loans', field: 'loans', message: 'At least one Loan record is required.' });
  } else {
    const seenAccounts = new Set();
    loans.forEach((loan, idx) => {
      const acct = (loan.loanAccountNo || '').trim();
      if (!acct) {
        errors.push({ section: 'loans', field: `loans[${idx}].loanAccountNo`, message: `Loan #${idx + 1} Account Number is required.` });
      } else if (seenAccounts.has(acct.toLowerCase())) {
        warnings.push({ section: 'loans', message: `Duplicate Loan Account Number detected: "${acct}".` });
      } else {
        seenAccounts.add(acct.toLowerCase());
      }

      const sancAmt = parseAmount(loan.sanctionedAmount);
      const outAmt = parseAmount(loan.outstandingAmount);
      if (Number.isNaN(sancAmt) || sancAmt <= 0) {
        errors.push({ section: 'loans', field: `loans[${idx}].sanctionedAmount`, message: `Loan #${idx + 1} Sanctioned Amount must be positive.` });
      }
      if (Number.isNaN(outAmt) || outAmt <= 0) {
        errors.push({ section: 'loans', field: `loans[${idx}].outstandingAmount`, message: `Loan #${idx + 1} Outstanding Amount must be positive.` });
      }

      const appD = parseDateSafe(loan.applicationDate);
      const sancD = parseDateSafe(loan.sanctionDate);
      const depD = parseDateSafe(loan.depositTitleDeedsDate);
      const mortD = parseDateSafe(loan.mortgageRegDate);

      if (appD && sancD && sancD.isBefore(appD, 'day')) {
        warnings.push({ section: 'loans', message: `Loan #${idx + 1}: Sanction Date is earlier than Loan Application Date.` });
      }
      if (appD && depD && depD.isBefore(appD, 'day')) {
        warnings.push({ section: 'loans', message: `Loan #${idx + 1}: Deposit of Title Deeds Date is earlier than Loan Application Date.` });
      }
      if (sancD && mortD && mortD.isBefore(sancD, 'day')) {
        warnings.push({ section: 'loans', message: `Loan #${idx + 1}: Mortgage Registration Date is earlier than Sanction Date.` });
      }
    });
  }

  if (!property.completePropertyDescription?.trim()) {
    errors.push({ section: 'property', field: 'completePropertyDescription', message: 'Complete Property Description is required.' });
  }
  const b = property.boundaries || {};
  if (!b.north?.trim() || !b.south?.trim() || !b.east?.trim() || !b.west?.trim()) {
    errors.push({ section: 'property', field: 'boundaries', message: 'All four property boundaries (N, S, E, W) are required.' });
  } else {
    if (b.north.trim().toLowerCase() === b.south.trim().toLowerCase()) {
      warnings.push({ section: 'property', message: `North and South boundaries are identical ("${b.north}"). Please verify.` });
    }
    if (b.east.trim().toLowerCase() === b.west.trim().toLowerCase()) {
      warnings.push({ section: 'property', message: `East and West boundaries are identical ("${b.east}"). Please verify.` });
    }
  }

  const npaD = parseDateSafe(proceedings.npaDate);
  const demandD = parseDateSafe(proceedings.demandNoticeDate);
  const symD = parseDateSafe(proceedings.symbolicPossessionDate);

  if (!npaD) errors.push({ section: 'proceedings', field: 'npaDate', message: 'NPA Classification Date is required.' });
  if (!demandD) errors.push({ section: 'proceedings', field: 'demandNoticeDate', message: 'Demand Notice Date (u/s 13(2)) is required.' });
  if (!symD) errors.push({ section: 'proceedings', field: 'symbolicPossessionDate', message: 'Symbolic Possession Date is required.' });

  const demandAmt = parseAmount(proceedings.demandNoticeAmount);
  if (Number.isNaN(demandAmt) || demandAmt <= 0) {
    errors.push({ section: 'proceedings', field: 'demandNoticeAmount', message: 'Demand Notice Amount must be positive.' });
  }

  if (npaD && demandD && demandD.isBefore(npaD, 'day')) {
    warnings.push({ section: 'proceedings', message: `Demand Notice Date (${demandD.format('DD/MM/YYYY')}) is earlier than NPA Date (${npaD.format('DD/MM/YYYY')}).` });
  }
  if (demandD && symD) {
    if (symD.isBefore(demandD, 'day')) {
      warnings.push({ section: 'proceedings', message: 'Symbolic Possession Date is earlier than Demand Notice Date.' });
    } else if (symD.diff(demandD, 'day') < 60) {
      warnings.push({ section: 'proceedings', message: `Symbolic Possession Date is only ${symD.diff(demandD, 'day')} days after Demand Notice (statutory period is 60 days).` });
    }
  }

  const affNpaD = parseDateSafe(affidavit.npaDate);
  const affDemandD = parseDateSafe(affidavit.demandNoticeDate);
  if (npaD && affNpaD && !npaD.isSame(affNpaD, 'day')) {
    warnings.push({ section: 'affidavit', message: `NPA Date mismatch: Application (${npaD.format('DD/MM/YYYY')}) vs Affidavit (${affNpaD.format('DD/MM/YYYY')}).` });
  }
  if (demandD && affDemandD && !demandD.isSame(affDemandD, 'day')) {
    warnings.push({ section: 'affidavit', message: `Demand Notice Date mismatch: Application (${demandD.format('DD/MM/YYYY')}) vs Affidavit (${affDemandD.format('DD/MM/YYYY')}).` });
  }
  const affClaim = parseAmount(affidavit.totalOutstandingClaim);
  if (!Number.isNaN(demandAmt) && !Number.isNaN(affClaim) && Math.round(demandAmt) !== Math.round(affClaim)) {
    warnings.push({ section: 'affidavit', message: `Claim mismatch: Demand Notice ₹${Math.round(demandAmt).toLocaleString('en-IN')} vs Affidavit ₹${Math.round(affClaim).toLocaleString('en-IN')}.` });
  }
  if (applicant.authorizedOfficerName?.trim() && affidavit.deponentName?.trim() &&
      applicant.authorizedOfficerName.trim().toLowerCase() !== affidavit.deponentName.trim().toLowerCase()) {
    warnings.push({ section: 'affidavit', message: `Authorized Officer mismatch between Application and Affidavit.` });
  }

  const advocates = Array.isArray(vakalatnama.advocates) ? vakalatnama.advocates : [];
  if (advocates.length === 0 || !advocates.some((a) => a.name?.trim())) {
    errors.push({ section: 'vakalatnama', field: 'advocates', message: 'At least one Advocate name is required.' });
  }
  if (!vakalatnama.enrollmentNumber?.trim()) {
    errors.push({ section: 'vakalatnama', field: 'enrollmentNumber', message: 'Enrollment Number is required.' });
  }

  if (annexures.length === 0) {
    errors.push({ section: 'annexures', field: 'annexures', message: 'At least one annexure is required.' });
  } else {
    annexures.forEach((ann, idx) => {
      if (!ann.particulars?.trim()) {
        errors.push({ section: 'annexures', field: `annexures[${idx}].particulars`, message: `Annexure #${idx + 1} particulars are required.` });
      }
    });
  }

  const sectionCounts = {};
  for (const err of errors) {
    sectionCounts[err.section] = sectionCounts[err.section] || { errors: 0, warnings: 0 };
    sectionCounts[err.section].errors += 1;
  }
  for (const warn of warnings) {
    sectionCounts[warn.section] = sectionCounts[warn.section] || { errors: 0, warnings: 0 };
    sectionCounts[warn.section].warnings += 1;
  }

  return { isValid: errors.length === 0, errors, warnings, sectionCounts };
}

/**
 * Extract list of entered dynamic values for highlighting in the Live DOCX Preview.
 */
export function collectHighlightTokens(formData = {}) {
  const tokens = new Set();
  const add = (val) => {
    const s = String(val || '').trim();
    if (s.length >= 3) tokens.add(s);
  };

  add(formData.court?.courtName);
  add(formData.court?.courtLocation);
  add(formData.applicant?.institutionName);
  add(formData.applicant?.authorizedOfficerName);
  (formData.opponents || []).forEach((o) => add(o.fullName));
  (formData.loans || []).forEach((l) => add(l.loanAccountNo));
  add(formData.property?.boundaries?.north);
  add(formData.property?.boundaries?.south);
  add(formData.property?.boundaries?.east);
  add(formData.property?.boundaries?.west);
  (formData.vakalatnama?.advocates || []).forEach((a) => add(a.name));
  add(formData.vakalatnama?.enrollmentNumber);

  return Array.from(tokens).sort((a, b) => b.length - a.length);
}
