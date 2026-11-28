import dayjs from 'dayjs';

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

  // Schedule I
  if (!s1.depositPlace?.trim()) errors.push({ section: 'schedule1', message: 'Place of deposit is required.' });
  if (!s1.depositDate) errors.push({ section: 'schedule1', message: 'Date of deposit of title deeds is required.' });
  if (!s1.bankName?.trim()) errors.push({ section: 'schedule1', message: 'Bank name is required.' });
  if (!s1.bankBranchAddress?.trim()) errors.push({ section: 'schedule1', message: 'Bank branch address is required.' });
  if (!s1.authorizedOfficerName?.trim()) errors.push({ section: 'schedule1', message: 'Authorized bank officer name is required.' });

  // Schedule II
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
        warnings.push({
          section: 'clauses',
          message: `Security Provider #${i + 1} is a Company, but Section 180(1)(a) Companies Act clause is not marked Applicable.`,
        });
      }
    });
  }
  if (s2.hasAuthorizedPerson === 'Yes' && !s2.authorizedPersonName?.trim()) {
    errors.push({ section: 'schedule2', message: 'Authorized person name is required when authorization is Yes.' });
  }

  // Schedule III
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
        errors.push({ section: 'schedule3', message: `Facility #${i + 1} Amount must be greater than 0.` });
      }
    });
  }
  const depD = s1.depositDate ? dayjs(s1.depositDate) : null;
  (s3.sanctionLetters || []).forEach((sl, i) => {
    if (depD && sl.sanctionDate && dayjs(sl.sanctionDate).isAfter(depD, 'day')) {
      warnings.push({ section: 'schedule3', message: `Sanction Letter #${i + 1} date is after Deposit of Title Deeds date.` });
    }
  });

  // Schedule IV
  const docs = Array.isArray(s4.titleDocuments) ? s4.titleDocuments : [];
  if (docs.length === 0) {
    errors.push({ section: 'schedule4', message: 'At least one Title Document is required in Schedule IV.' });
  }

  // Schedule V
  const props = Array.isArray(s5.properties) ? s5.properties : [];
  if (props.length === 0) {
    errors.push({ section: 'schedule5', message: 'At least one Immovable Property is required in Schedule V.' });
  } else {
    props.forEach((p, i) => {
      const b = p.boundaries || {};
      if (!b.east?.trim() || !b.west?.trim() || !b.north?.trim() || !b.south?.trim()) {
        errors.push({ section: 'schedule5', message: `Property #${i + 1} requires all 4 boundaries (East, West, North, South).` });
      }
    });
  }

  // Schedule VI
  if (s6.hasExistingCharges === 'EXISTING' && (!Array.isArray(s6.existingCharges) || s6.existingCharges.length === 0)) {
    errors.push({ section: 'schedule6', message: 'Add at least one existing charge or set Schedule VI to NIL.' });
  }

  // Conditional clauses uncertain check
  if (clauses.sec180_companies_act === 'UNCERTAIN' || clauses.sec281_income_tax === 'UNCERTAIN') {
    warnings.push({ section: 'clauses', message: 'One or more Conditional Legal Clauses are marked for Advocate Review.' });
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
