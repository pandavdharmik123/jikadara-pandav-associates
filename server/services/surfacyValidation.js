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

/**
 * Validate Surfacy Case Filing form data and detect legal/factual discrepancies
 * WITHOUT ever silently altering values.
 */
export function validateSurfacyFormData(formData = {}) {
  const errors = [];   // Hard missing/invalid fields
  const warnings = []; // Legal / factual inconsistencies requiring advocate verification

  const court = formData.court || {};
  const applicant = formData.applicant || {};
  const opponents = Array.isArray(formData.opponents) ? formData.opponents : [];
  const loans = Array.isArray(formData.loans) ? formData.loans : [];
  const property = formData.property || {};
  const proceedings = formData.proceedings || {};
  const affidavit = formData.affidavit || {};
  const vakalatnama = formData.vakalatnama || {};
  const annexures = Array.isArray(formData.annexures) ? formData.annexures : [];

  // A. Court
  if (!court.courtName?.trim()) errors.push({ section: 'court', field: 'courtName', message: 'Court Name is required.' });
  if (!court.courtLocation?.trim()) errors.push({ section: 'court', field: 'courtLocation', message: 'Court Location is required.' });
  if (!court.applicationYear?.trim()) errors.push({ section: 'court', field: 'applicationYear', message: 'Application Year is required.' });
  if (!court.district?.trim()) errors.push({ section: 'court', field: 'district', message: 'District is required.' });

  // B. Applicant
  if (!applicant.institutionName?.trim()) errors.push({ section: 'applicant', field: 'institutionName', message: 'Financial Institution Name is required.' });
  if (!applicant.registeredOfficeAddress?.trim()) errors.push({ section: 'applicant', field: 'registeredOfficeAddress', message: 'Registered Office Address is required.' });
  if (!applicant.branchOfficeAddress?.trim()) errors.push({ section: 'applicant', field: 'branchOfficeAddress', message: 'Branch Office Address is required.' });
  if (!applicant.authorizedOfficerName?.trim()) errors.push({ section: 'applicant', field: 'authorizedOfficerName', message: 'Authorized Officer Name is required.' });

  // C. Opponents
  if (opponents.length === 0) {
    errors.push({ section: 'opponents', field: 'opponents', message: 'At least one Opponent / Borrower is required.' });
  } else {
    const hasPrimaryBorrower = opponents.some((o) => String(o.role || '').toLowerCase() === 'borrower');
    if (!hasPrimaryBorrower) {
      warnings.push({ section: 'opponents', message: 'No opponent is marked as primary "Borrower". Verify party roles.' });
    }
    opponents.forEach((opp, idx) => {
      if (!opp.fullName?.trim()) {
        errors.push({ section: 'opponents', field: `opponents[${idx}].fullName`, message: `Opponent #${idx + 1} Full Name is required.` });
      }
      if (!opp.residentialAddress?.trim()) {
        errors.push({ section: 'opponents', field: `opponents[${idx}].residentialAddress`, message: `Opponent #${idx + 1} Residential Address is required.` });
      }
    });
  }

  // D. Loans
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
        errors.push({ section: 'loans', field: `loans[${idx}].sanctionedAmount`, message: `Loan #${idx + 1} Sanctioned Amount must be a valid positive number.` });
      }
      if (Number.isNaN(outAmt) || outAmt <= 0) {
        errors.push({ section: 'loans', field: `loans[${idx}].outstandingAmount`, message: `Loan #${idx + 1} Outstanding Amount must be a valid positive number.` });
      }

      const appD = parseDateSafe(loan.applicationDate);
      const sancD = parseDateSafe(loan.sanctionDate);
      const depD = parseDateSafe(loan.depositTitleDeedsDate);
      const mortD = parseDateSafe(loan.mortgageRegDate);

      if (appD && sancD && sancD.isBefore(appD, 'day')) {
        warnings.push({ section: 'loans', message: `Loan #${idx + 1}: Sanction Date (${sancD.format('DD/MM/YYYY')}) is earlier than Loan Application Date (${appD.format('DD/MM/YYYY')}).` });
      }
      if (appD && depD && depD.isBefore(appD, 'day')) {
        warnings.push({ section: 'loans', message: `Loan #${idx + 1}: Deposit of Title Deeds Date (${depD.format('DD/MM/YYYY')}) is earlier than Loan Application Date (${appD.format('DD/MM/YYYY')}).` });
      }
      if (sancD && mortD && mortD.isBefore(sancD, 'day')) {
        warnings.push({ section: 'loans', message: `Loan #${idx + 1}: Mortgage Registration Date (${mortD.format('DD/MM/YYYY')}) is earlier than Sanction Date.` });
      }
    });
  }

  // E. Property
  if (!property.completePropertyDescription?.trim()) {
    errors.push({ section: 'property', field: 'completePropertyDescription', message: 'Complete Property Description is required.' });
  }
  const b = property.boundaries || {};
  if (!b.north?.trim() || !b.south?.trim() || !b.east?.trim() || !b.west?.trim()) {
    errors.push({ section: 'property', field: 'boundaries', message: 'All four property boundaries (North, South, East, West) are required.' });
  } else {
    const north = b.north.trim().toLowerCase();
    const south = b.south.trim().toLowerCase();
    const east = b.east.trim().toLowerCase();
    const west = b.west.trim().toLowerCase();
    if (north === south) {
      warnings.push({ section: 'property', message: `North and South boundaries are identical ("${b.north}"). Please verify property boundaries.` });
    }
    if (east === west) {
      warnings.push({ section: 'property', message: `East and West boundaries are identical ("${b.east}"). Please verify property boundaries.` });
    }
  }

  // F. Proceedings
  const npaD = parseDateSafe(proceedings.npaDate);
  const demandD = parseDateSafe(proceedings.demandNoticeDate);
  const symD = parseDateSafe(proceedings.symbolicPossessionDate);

  if (!npaD) errors.push({ section: 'proceedings', field: 'npaDate', message: 'NPA Classification Date is required.' });
  if (!demandD) errors.push({ section: 'proceedings', field: 'demandNoticeDate', message: 'Section 13(2) Demand Notice Date is required.' });
  if (!symD) errors.push({ section: 'proceedings', field: 'symbolicPossessionDate', message: 'Symbolic Possession Date is required.' });

  const demandAmt = parseAmount(proceedings.demandNoticeAmount);
  if (Number.isNaN(demandAmt) || demandAmt <= 0) {
    errors.push({ section: 'proceedings', field: 'demandNoticeAmount', message: 'Demand Notice Amount must be a valid positive number.' });
  }

  if (npaD && demandD && demandD.isBefore(npaD, 'day')) {
    warnings.push({ section: 'proceedings', message: `Demand Notice Date (${demandD.format('DD/MM/YYYY')}) is earlier than NPA Date (${npaD.format('DD/MM/YYYY')}).` });
  }
  if (demandD && symD) {
    if (symD.isBefore(demandD, 'day')) {
      warnings.push({ section: 'proceedings', message: `Symbolic Possession Date (${symD.format('DD/MM/YYYY')}) is earlier than Demand Notice Date (${demandD.format('DD/MM/YYYY')}).` });
    } else if (symD.diff(demandD, 'day') < 60) {
      warnings.push({ section: 'proceedings', message: `Symbolic Possession Date is only ${symD.diff(demandD, 'day')} days after Demand Notice Date (statutory SARFAESI period is 60 days).` });
    }
  }

  // G. Affidavit cross-consistency checks
  const affNpaD = parseDateSafe(affidavit.npaDate);
  const affDemandD = parseDateSafe(affidavit.demandNoticeDate);
  if (npaD && affNpaD && !npaD.isSame(affNpaD, 'day')) {
    warnings.push({
      section: 'affidavit',
      message: `NPA Date mismatch: Main Application has ${npaD.format('DD/MM/YYYY')} while Affidavit has ${affNpaD.format('DD/MM/YYYY')}.`,
    });
  }
  if (demandD && affDemandD && !demandD.isSame(affDemandD, 'day')) {
    warnings.push({
      section: 'affidavit',
      message: `Demand Notice Date mismatch: Main Application has ${demandD.format('DD/MM/YYYY')} while Affidavit has ${affDemandD.format('DD/MM/YYYY')}.`,
    });
  }
  const affClaim = parseAmount(affidavit.totalOutstandingClaim);
  if (!Number.isNaN(demandAmt) && !Number.isNaN(affClaim) && Math.round(demandAmt) !== Math.round(affClaim)) {
    warnings.push({
      section: 'affidavit',
      message: `Claim Amount mismatch: Demand Notice Amount is ₹${Math.round(demandAmt).toLocaleString('en-IN')} while Affidavit Claim is ₹${Math.round(affClaim).toLocaleString('en-IN')}.`,
    });
  }
  if (applicant.authorizedOfficerName?.trim() && affidavit.deponentName?.trim() &&
      applicant.authorizedOfficerName.trim().toLowerCase() !== affidavit.deponentName.trim().toLowerCase()) {
    warnings.push({
      section: 'affidavit',
      message: `Authorized Officer mismatch: "${applicant.authorizedOfficerName}" in Application vs "${affidavit.deponentName}" in Affidavit.`,
    });
  }

  // H. Vakalatnama
  const advocates = Array.isArray(vakalatnama.advocates) ? vakalatnama.advocates : [];
  if (advocates.length === 0 || !advocates.some((a) => a.name?.trim())) {
    errors.push({ section: 'vakalatnama', field: 'advocates', message: 'At least one Advocate name is required.' });
  }
  if (!vakalatnama.enrollmentNumber?.trim()) {
    errors.push({ section: 'vakalatnama', field: 'enrollmentNumber', message: 'Advocate Enrollment Number is required.' });
  }

  // I. Annexures
  if (annexures.length === 0) {
    errors.push({ section: 'annexures', field: 'annexures', message: 'At least one document/annexure entry is required.' });
  } else {
    annexures.forEach((ann, idx) => {
      if (!ann.particulars?.trim()) {
        errors.push({ section: 'annexures', field: `annexures[${idx}].particulars`, message: `Annexure row #${idx + 1} particulars are required.` });
      }
    });
  }

  // Group errors by section for UI badges
  const sectionCounts = {};
  for (const err of errors) {
    sectionCounts[err.section] = (sectionCounts[err.section] || { errors: 0, warnings: 0 });
    sectionCounts[err.section].errors += 1;
  }
  for (const warn of warnings) {
    sectionCounts[warn.section] = (sectionCounts[warn.section] || { errors: 0, warnings: 0 });
    sectionCounts[warn.section].warnings += 1;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sectionCounts,
  };
}
