import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import dayjs from 'dayjs';
import { buildDefaultPropertyDescription } from '../config/surfacyTemplates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, '../templates/surfacy');
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function formatDateDDMMYYYY(val, fallback = '') {
  if (!val) return fallback;
  const d = dayjs(val);
  return d.isValid() ? d.format('DD/MM/YYYY') : String(val);
}

function formatIndianCurrency(val, fallback = '0') {
  if (val === undefined || val === null || val === '') return fallback;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return String(val);
  return Math.round(num).toLocaleString('en-IN');
}

function getParagraphText(pNode) {
  const tNodes = pNode.getElementsByTagNameNS(W_NS, 't');
  let text = '';
  for (let i = 0; i < tNodes.length; i += 1) {
    text += tNodes[i].textContent || '';
  }
  return text;
}

/**
 * Replace a substring inside a Word paragraph while preserving the exact <w:rPr>
 * formatting of the run where the match begins, even if the matched text spans
 * multiple fragmented <w:r> runs.
 */
function replaceInParagraph(pNode, searchValue, replaceValue, { all = true } = {}) {
  if (!searchValue) return false;
  let replacedAny = false;

  // Iterate until no more matches (or once if !all)
  // Guard with max iterations to avoid infinite loop if replaceValue contains searchValue
  let safety = 0;
  let searchFrom = 0;
  while (safety < 20) {
    safety += 1;
    const tNodes = [];
    const allT = pNode.getElementsByTagNameNS(W_NS, 't');
    let fullText = '';
    for (let i = 0; i < allT.length; i += 1) {
      const node = allT[i];
      const txt = node.textContent || '';
      tNodes.push({ node, start: fullText.length, end: fullText.length + txt.length, text: txt });
      fullText += txt;
    }

    const matchIdx = fullText.indexOf(searchValue, searchFrom);
    if (matchIdx === -1) break;

    const matchEnd = matchIdx + searchValue.length;
    replacedAny = true;

    let inserted = false;
    for (const item of tNodes) {
      if (item.end <= matchIdx || item.start >= matchEnd) {
        continue;
      }
      const localStart = Math.max(0, matchIdx - item.start);
      const localEnd = Math.min(item.text.length, matchEnd - item.start);
      const prefix = item.text.slice(0, localStart);
      const suffix = item.text.slice(localEnd);

      if (!inserted) {
        item.node.textContent = `${prefix}${replaceValue}${suffix}`;
        item.node.setAttribute('xml:space', 'preserve');
        inserted = true;
      } else {
        item.node.textContent = `${prefix}${suffix}`;
      }
    }

    if (!all) break;
    searchFrom = matchIdx + replaceValue.length;
  }

  return replacedAny;
}

function setParagraphSingleText(doc, pNode, newText) {
  const runs = Array.from(pNode.getElementsByTagNameNS(W_NS, 'r'));
  let templateRpr = null;
  for (const r of runs) {
    const rpr = r.getElementsByTagNameNS(W_NS, 'rPr')[0];
    if (rpr) {
      templateRpr = rpr.cloneNode(true);
      break;
    }
  }
  for (const r of runs) {
    if (r.parentNode === pNode) {
      pNode.removeChild(r);
    }
  }
  const newR = doc.createElementNS(W_NS, 'w:r');
  if (templateRpr) newR.appendChild(templateRpr);
  const newT = doc.createElementNS(W_NS, 'w:t');
  newT.setAttribute('xml:space', 'preserve');
  newT.textContent = newText;
  newR.appendChild(newT);
  pNode.appendChild(newR);
}

/**
 * Replace a paragraph's runs with a bold label run (e.g. "     Address: ")
 * followed by a normal (non-bold) value run, preserving the paragraph's <w:pPr>
 * indentation and font size.
 */
function setParagraphLabelAndValue(doc, pNode, boldLabel, normalValue) {
  const runs = Array.from(pNode.getElementsByTagNameNS(W_NS, 'r'));
  let boldRpr = null;
  let normalRpr = null;

  for (const r of runs) {
    const rpr = r.getElementsByTagNameNS(W_NS, 'rPr')[0];
    if (!rpr) continue;
    const hasBold = rpr.getElementsByTagNameNS(W_NS, 'b').length > 0;
    if (hasBold && !boldRpr) {
      boldRpr = rpr.cloneNode(true);
    } else if (!hasBold && !normalRpr) {
      normalRpr = rpr.cloneNode(true);
    }
  }

  if (!normalRpr && boldRpr) {
    normalRpr = boldRpr.cloneNode(true);
    Array.from(normalRpr.getElementsByTagNameNS(W_NS, 'b')).forEach((b) => normalRpr.removeChild(b));
    Array.from(normalRpr.getElementsByTagNameNS(W_NS, 'bCs')).forEach((b) => normalRpr.removeChild(b));
  }

  for (const r of runs) {
    if (r.parentNode === pNode) {
      pNode.removeChild(r);
    }
  }

  const labelRun = doc.createElementNS(W_NS, 'w:r');
  if (boldRpr) labelRun.appendChild(boldRpr);
  const labelT = doc.createElementNS(W_NS, 'w:t');
  labelT.setAttribute('xml:space', 'preserve');
  labelT.textContent = boldLabel;
  labelRun.appendChild(labelT);
  pNode.appendChild(labelRun);

  if (normalValue) {
    const valRun = doc.createElementNS(W_NS, 'w:r');
    if (normalRpr) valRun.appendChild(normalRpr);
    const valT = doc.createElementNS(W_NS, 'w:t');
    valT.setAttribute('xml:space', 'preserve');
    valT.textContent = normalValue;
    valRun.appendChild(valT);
    pNode.appendChild(valRun);
  }
}

function setCellText(tcNode, newText) {
  const pNodes = tcNode.getElementsByTagNameNS(W_NS, 'p');
  if (pNodes.length === 0) return;
  const p = pNodes[0];
  const tNodes = p.getElementsByTagNameNS(W_NS, 't');
  if (tNodes.length > 0) {
    tNodes[0].textContent = newText;
    tNodes[0].setAttribute('xml:space', 'preserve');
    for (let i = 1; i < tNodes.length; i += 1) {
      tNodes[i].textContent = '';
    }
  } else {
    const doc = tcNode.ownerDocument;
    const r = doc.createElementNS(W_NS, 'w:r');
    const t = doc.createElementNS(W_NS, 'w:t');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = newText;
    r.appendChild(t);
    p.appendChild(r);
  }
}

function populateDynamicTableRows(tblNode, rowsData, rowMapper) {
  const trNodes = [];
  for (let i = 0; i < tblNode.childNodes.length; i += 1) {
    const child = tblNode.childNodes[i];
    if (child.nodeType === 1 && child.localName === 'tr') {
      trNodes.push(child);
    }
  }
  if (trNodes.length < 2) return;

  const templateRow = trNodes[1]; // Row 0 is header, Row 1 is sample data row
  // Remove any extra data rows beyond row 1
  for (let i = 2; i < trNodes.length; i += 1) {
    tblNode.removeChild(trNodes[i]);
  }

  const items = rowsData.length > 0 ? rowsData : [{}];
  items.forEach((item, idx) => {
    const rowNode = idx === 0 ? templateRow : templateRow.cloneNode(true);
    const cells = [];
    for (let c = 0; c < rowNode.childNodes.length; c += 1) {
      const ch = rowNode.childNodes[c];
      if (ch.nodeType === 1 && ch.localName === 'tc') {
        cells.push(ch);
      }
    }
    const values = rowMapper(item, idx);
    values.forEach((val, colIdx) => {
      if (cells[colIdx]) {
        setCellText(cells[colIdx], val);
      }
    });
    if (idx > 0) {
      tblNode.appendChild(rowNode);
    }
  });
}

function formatOpponentSummaryList(opponents) {
  if (!opponents || opponents.length === 0) return '(1) [Opponent Name] (Borrower)';
  return opponents
    .map((o, i) => `(${i + 1}) ${(o.fullName || '[Opponent Name]').trim()} (${(o.role || 'Borrower').trim()})`)
    .join(', ');
}

function formatOpponentAndList(opponents) {
  if (!opponents || opponents.length === 0) return '[Opponent Name] (Borrower)';
  return opponents
    .map((o) => `${(o.fullName || '[Opponent Name]').trim()} (${(o.role || 'Borrower').trim()})`)
    .join(' And ');
}

function formatShortOpponentHeading(opponents) {
  if (!opponents || opponents.length === 0) return '[Opponent Name] (Borrower)';
  const first = opponents[0];
  const base = `${(first.fullName || '[Opponent Name]').trim()} (${(first.role || 'Borrower').trim()})`;
  return opponents.length > 1 ? `${base} & others` : base;
}

/**
 * Generate a finalized DOCX buffer from the master template + centralized formData.
 */
export async function generateSurfacyDocx(formData = {}, templateFileName = 'sarfaesi-sec14-navsari.docx') {
  const templatePath = path.join(TEMPLATES_DIR, templateFileName);
  const templateBytes = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBytes);
  const docXmlStr = await zip.file('word/document.xml').async('string');

  const parser = new DOMParser();
  const doc = parser.parseFromString(docXmlStr, 'application/xml');
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0];

  const court = formData.court || {};
  const applicant = formData.applicant || {};
  const opponents = Array.isArray(formData.opponents) ? formData.opponents : [];
  const loans = Array.isArray(formData.loans) ? formData.loans : [];
  const property = formData.property || {};
  const proceedings = formData.proceedings || {};
  const affidavit = formData.affidavit || {};
  const vakalatnama = formData.vakalatnama || {};
  const annexures = Array.isArray(formData.annexures) ? formData.annexures : [];

  const courtName = (court.courtName || 'ADDL. CHIEF JUDICIAL MAGISTRATE').trim();
  const courtLocation = (court.courtLocation || 'NAVSARI').trim().toUpperCase();
  const appNo = (court.applicationNumber || '').trim();
  const appYear = (court.applicationYear || String(new Date().getFullYear())).trim();
  const filingDateFormatted = court.filingDate ? formatDateDDMMYYYY(court.filingDate) : `     /     / ${appYear}`;
  const filingMonthYear = court.filingDate ? dayjs(court.filingDate).format('MMMM, YYYY') : `November, ${appYear}`;

  const instName = (applicant.institutionName || 'Aavas Financiers Limited').trim();
  const formerName = (applicant.formerInstitutionName || '').trim();
  const fullInstName = formerName ? `${instName} (Formerly known As ${formerName})` : instName;
  const regAddress = (applicant.registeredOfficeAddress || '').trim();
  const branchAddress = (applicant.branchOfficeAddress || '').trim();
  const officerName = (applicant.authorizedOfficerName || '').trim();
  const officerDesignation = (applicant.authorizedOfficerDesignation || 'Authorized Officer and Manager').trim();

  const firstLoan = loans[0] || {};
  const loanAppDate = formatDateDDMMYYYY(firstLoan.applicationDate, '____/____/____');
  const depositDate = formatDateDDMMYYYY(firstLoan.depositTitleDeedsDate, '____/____/____');
  const mortSubReg = (firstLoan.mortgageSubRegistrar || '').trim() || '________';
  const mortSerial = (firstLoan.mortgageSerialNo || '').trim() || '________';
  const mortRegDate = formatDateDDMMYYYY(firstLoan.mortgageRegDate, '____/____/____');

  const computedPropDesc = property.manualDescriptionOverride
    ? (property.completePropertyDescription || '').trim()
    : ((property.completePropertyDescription || '').trim() || buildDefaultPropertyDescription(property));
  const boundaries = property.boundaries || {};
  const bNorth = (boundaries.north || '').trim() || '—';
  const bSouth = (boundaries.south || '').trim() || '—';
  const bEast = (boundaries.east || '').trim() || '—';
  const bWest = (boundaries.west || '').trim() || '—';

  const npaDateStr = formatDateDDMMYYYY(proceedings.npaDate, '____/____/____');
  const demandDateStr = formatDateDDMMYYYY(proceedings.demandNoticeDate, '____/____/____');
  const demandAmtStr = formatIndianCurrency(proceedings.demandNoticeAmount, '0');
  const noticePeriod = (proceedings.statutoryNoticePeriod || '60 days').trim();
  const symPossessionDateStr = formatDateDDMMYYYY(proceedings.symbolicPossessionDate, '____/____/____');

  const affDeponent = (affidavit.deponentName || officerName).trim();
  const affAge = (affidavit.age || 'Adult').trim();
  const affOcc = (affidavit.occupation || 'Service').trim();
  const affClaimStr = formatIndianCurrency(affidavit.totalOutstandingClaim || proceedings.demandNoticeAmount, '0');
  const affNpaStr = formatDateDDMMYYYY(affidavit.npaDate || proceedings.npaDate, '____/____/____');
  const affDemandStr = formatDateDDMMYYYY(affidavit.demandNoticeDate || proceedings.demandNoticeDate, '____/____/____');
  const affExecPlace = (affidavit.executionPlace || courtLocation).trim().toUpperCase();
  const affExecMonthYear = affidavit.executionDate
    ? dayjs(affidavit.executionDate).format('MMMM, YYYY')
    : appYear;
  const affExecDay = affidavit.executionDate ? dayjs(affidavit.executionDate).format('DD') : '        ';

  const advocates = Array.isArray(vakalatnama.advocates) ? vakalatnama.advocates.filter((a) => a.name?.trim()) : [];
  const advocatesListStr = advocates.length > 0
    ? advocates.map((a) => a.name.trim()).join(', ')
    : 'MR. CHANDRESH B. PANDAV, NIRAV P. PANDAV';
  const primaryAdvocate = advocates[0]?.name?.trim() || 'Chandresh B. Pandav';
  const advOffice = (vakalatnama.officeAddress || '').trim();
  const advMobile = (vakalatnama.mobileNumber || '').trim();
  const advEnroll = (vakalatnama.enrollmentNumber || '').trim();
  const vakalatExecMonthYear = vakalatnama.executionDate
    ? dayjs(vakalatnama.executionDate).format('MMMM YYYY')
    : `October ${appYear}`;
  const vakalatExecDay = vakalatExecDayVal(vakalatnama.executionDate);

  const oppSummaryList = formatOpponentSummaryList(opponents);
  const oppAndList = formatOpponentAndList(opponents);
  const oppShortHeading = formatShortOpponentHeading(opponents);
  const primaryOppAddr = (opponents[0]?.residentialAddress || '').trim();

  // 1. Dynamically rebuild Cause Title Opponents (between "OPPONENTS  :" and "APPLICATION UNDER SECTION 14")
  const children = [];
  for (let i = 0; i < body.childNodes.length; i += 1) {
    if (body.childNodes[i].nodeType === 1) children.push(body.childNodes[i]);
  }

  const oppHeaderIdx = children.findIndex((el) => el.localName === 'p' && getParagraphText(el).includes('OPPONENTS  :'));
  const appTitleIdx = children.findIndex((el) => el.localName === 'p' && getParagraphText(el).includes('APPLICATION UNDER SECTION 14'));

  if (oppHeaderIdx !== -1 && appTitleIdx !== -1 && appTitleIdx > oppHeaderIdx + 4) {
    // Capture template paragraphs for one opponent from P[oppHeaderIdx + 1 .. +5]
    const tplNameP = children[oppHeaderIdx + 1].cloneNode(true);
    const tplRelP = children[oppHeaderIdx + 2].cloneNode(true);
    const tplAddrP = children[oppHeaderIdx + 3].cloneNode(true);
    const tplAltP = children[oppHeaderIdx + 4].cloneNode(true);
    const tplSpacerP = children[oppHeaderIdx + 5] ? children[oppHeaderIdx + 5].cloneNode(true) : null;
    const anchorNode = children[appTitleIdx];

    // Remove all existing opponent paragraphs between oppHeaderIdx and appTitleIdx
    for (let i = oppHeaderIdx + 1; i < appTitleIdx; i += 1) {
      body.removeChild(children[i]);
    }

    const oppList = opponents.length > 0 ? opponents : [{}];
    oppList.forEach((opp, idx) => {
      const pName = tplNameP.cloneNode(true);
      setParagraphSingleText(doc, pName, `(${idx + 1}) ${(opp.fullName || '[Opponent Name]').trim()}  (${(opp.role || 'Borrower').trim()})`);
      body.insertBefore(pName, anchorNode);

      if (opp.relationName?.trim()) {
        const pRel = tplRelP.cloneNode(true);
        setParagraphSingleText(doc, pRel, `     ${(opp.relationship || 'S/o').trim()} ${opp.relationName.trim()}`);
        body.insertBefore(pRel, anchorNode);
      }

      const pAddr = tplAddrP.cloneNode(true);
      setParagraphLabelAndValue(doc, pAddr, '     Address: ', (opp.residentialAddress || '').trim());
      body.insertBefore(pAddr, anchorNode);

      if (opp.alternateAddress?.trim()) {
        const pAlt = tplAltP.cloneNode(true);
        setParagraphLabelAndValue(doc, pAlt, '     Also At: ', opp.alternateAddress.trim());
        body.insertBefore(pAlt, anchorNode);
      }

      if (idx < oppList.length - 1 && tplSpacerP) {
        body.insertBefore(tplSpacerP.cloneNode(true), anchorNode);
      }
    });
  }

  // 2. Replace dynamic values across all paragraphs in document
  const allParagraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'));
  let inAffidavitSection = false;

  for (const p of allParagraphs) {
    const txt = getParagraphText(p);
    if (!txt) continue;

    if (txt.includes('AFFIDAVIT')) {
      inAffidavitSection = true;
    } else if (txt.includes('VAKALATNAMA')) {
      inAffidavitSection = false;
    }

    // Headings & Court info
    replaceInParagraph(p, 'ADDL.CHIEF JUDICIAL MAGISTRATE', courtName);
    replaceInParagraph(p, 'ADDL. CHIEF JUDICIAL MAGISTRATE', courtName);
    replaceInParagraph(p, 'ADDI.CHIEF JUDICIAL MAGISTRATE', courtName);
    replaceInParagraph(p, 'NAVSARI', inAffidavitSection && txt.includes('Solemnly affirmed') ? affExecPlace : courtLocation);

    if (txt.includes('APPLICATION NO.')) {
      replaceInParagraph(p, 'APPLICATION NO.            / 2026', `APPLICATION NO. ${appNo || '       '} / ${appYear}`);
      replaceInParagraph(p, 'APPLICATION NO.         / 2026', `APPLICATION NO. ${appNo || '       '} / ${appYear}`);
      replaceInParagraph(p, 'APPLICATION NO.        / 2026', `APPLICATION NO. ${appNo || '       '} / ${appYear}`);
      replaceInParagraph(p, 'APPLICATION NO.       / 2026', `APPLICATION NO. ${appNo || '       '} / ${appYear}`);
    }

    // Applicant / Bank
    replaceInParagraph(p, 'Aavas Financiers Limited (Formerly known As AU Housing Finance Limited)', fullInstName);
    // In Affidavit heading, split across 2 lines:
    replaceInParagraph(p, 'Aavas Financiers Limited (Formerly ', fullInstName);
    replaceInParagraph(p, '           known As AU Housing Finance Limited)', '');
    replaceInParagraph(p, 'Aavas Financiers Limited,', `${instName},`);
    replaceInParagraph(p, '201-202, 2nd Floor, South End Square, Mansarovar Industrial Area, Jaipur-302020 (Rajasthan)', regAddress);
    replaceInParagraph(p, '301, Regent Square, Above D-Mart, Adajan, Surat-395009, Gujarat., Gujarat.', branchAddress);

    // Authorized Officer
    replaceInParagraph(p, 'Mr. Ashok Kumar ', inAffidavitSection ? `${affDeponent} ` : `${officerName} `);
    replaceInParagraph(p, 'Mr. Ashok Kumar', inAffidavitSection ? affDeponent : officerName);
    replaceInParagraph(p, 'Authorized Officer and Manager', officerDesignation);
    replaceInParagraph(p, 'Authorised Officer and Manager', officerDesignation);

    // Opponents in Para 4, Para 6, and secondary headings
    replaceInParagraph(p, '(1) AVINASH KUMAR MAKWANA (Borrower), (2) FALGUNI MAKWANA (Coborrower),', `${oppSummaryList},`);
    if (primaryOppAddr) {
      replaceInParagraph(p, 'Gothon Faliyu, Vedachha, Navsari, Gujarat - 396472.', primaryOppAddr);
    }
    replaceInParagraph(p, 'AVINASH KUMAR MAKWANA  (Borrower), And FALGUNI MAKWANA (Coborrower) (Coborrower),', `${oppAndList},`);
    replaceInParagraph(p, 'AVINASH KUMAR MAKWANA  (Borrower) & others', oppShortHeading);
    replaceInParagraph(p, 'AVINASH KUMAR MAKWANA (Borrower) others', oppShortHeading);

    // Property description & Boundaries (Main App, Prayer, Affidavit) - replace BEFORE Jalalpor/other substrings
    if (computedPropDesc && txt.includes('All right title and interest of land bearing')) {
      const propStart = txt.indexOf('All right title and interest of land bearing');
      const originalPropSpan = txt.slice(propStart);
      replaceInParagraph(p, originalPropSpan, computedPropDesc, { all: false });
    }

    // Loan dates & Mortgage registration
    replaceInParagraph(p, '09/07/2025', loanAppDate);
    replaceInParagraph(p, '11/03/2022', depositDate);
    replaceInParagraph(p, 'Sub Registrar, Jalalpor', `Sub Registrar, ${mortSubReg}`);
    replaceInParagraph(p, '7212/2025', mortSerial);
    replaceInParagraph(p, '25/08/2025', mortRegDate);
    replaceInParagraph(p, 'Adj. FLAT NO. 302', bNorth, { all: false });
    if (txt.includes('South')) {
      replaceInParagraph(p, bNorth === 'Adj. FLAT NO. 302' ? 'Adj. FLAT NO. 302' : 'Adj. FLAT NO. 302', bSouth);
    }
    // Better: target North/South lines specifically so North != South works cleanly
    if (txt.trim().startsWith('North')) {
      setParagraphSingleText(doc, p, `North - ${bNorth}`);
    } else if (txt.trim().startsWith('South')) {
      setParagraphSingleText(doc, p, `South - ${bSouth}`);
    } else if (txt.trim().startsWith('East')) {
      setParagraphSingleText(doc, p, `East - ${bEast}`);
    } else if (txt.trim().startsWith('West')) {
      setParagraphSingleText(doc, p, `West - ${bWest}`);
    }

    // SARFAESI Proceedings & Affidavit dates/amounts
    if (!inAffidavitSection) {
      replaceInParagraph(p, '03/08/2026', npaDateStr);
      // Para 8 had "non-performing assets of bank as on 06/08/2026" and "Demand Notice ... dated: 08/08/2026"
      if (txt.includes('non-performing assets of bank as on')) {
        replaceInParagraph(p, '06/08/2026', npaDateStr);
      }
      replaceInParagraph(p, '08/08/2026', demandDateStr);
      replaceInParagraph(p, '9,68,990', demandAmtStr);
    } else {
      replaceInParagraph(p, '03/08/2026', affNpaStr);
      replaceInParagraph(p, '06/08/2026', affDemandStr);
      replaceInParagraph(p, '9,68,990', affClaimStr);
    }
    replaceInParagraph(p, '60 days', noticePeriod);
    replaceInParagraph(p, '20/11/2026', symPossessionDateStr);

    // Verification & Affidavit deponent details
    replaceInParagraph(p, 'aged Adult, Occ: service', `aged ${affAge}, Occ: ${affOcc}`);
    replaceInParagraph(p, 'aged, adult, occupation; service', `aged, ${affAge}, occupation; ${affOcc}`);
    replaceInParagraph(p, '_____day of November, 2026', `_____day of ${filingMonthYear}`);
    if (txt.includes('Solemnly affirmed and declared')) {
      replaceInParagraph(p, 'on this         day of ……………….. 2026.', `on this ${affExecDay} day of ${affExecMonthYear}.`);
    }

    // Filing dates in signatures
    if (txt.includes('Dt.') && txt.includes('AuthorisedOfficer')) {
      replaceInParagraph(p, 'Dt.      /    / 2026', `Dt. ${filingDateFormatted}`);
    }
    if (txt.includes('Dt.') && txt.includes('Authorized Officer')) {
      replaceInParagraph(p, 'Dt.      /       /2026', `Dt. ${filingDateFormatted}`);
    }

    // Vakalatnama
    replaceInParagraph(
      p,
      'MR. CHANDRESH B. PANDAV, NIRAV P. PANDAV, And ………………………….',
      advocatesListStr
    );
    if (txt.includes('IN WITNESS WHEREOF')) {
      replaceInParagraph(p, 'on this        day of October 2026.', `on this ${vakalatExecDay} day of ${vakalatExecMonthYear}.`);
    }
    if (txt.includes('Chandresh B. Pandav, Advocate')) {
      replaceInParagraph(p, 'Chandresh B. Pandav, Advocate', `${primaryAdvocate}, Advocate`);
    }
    if (txt.includes('201, Sundaram Plus')) {
      setParagraphSingleText(doc, p, `Office:- ${advOffice}`);
    }
    if (txt.trim() === 'Nanpura, Surat-395001' && advOffice) {
      setParagraphSingleText(doc, p, '');
    }
    if (txt.includes('Mobile :-')) {
      setParagraphSingleText(doc, p, `Mobile :- ${advMobile}`);
    }
    if (txt.includes('Enrollment :')) {
      setParagraphSingleText(doc, p, `Enrollment : ${advEnroll}`);
    }
  }

  // 3. Populate dynamic tables (Loan Sanction Table, Loan Liability Table, Affidavit Loan Table, Annexure Table)
  const tables = Array.from(doc.getElementsByTagNameNS(W_NS, 'tbl'));
  for (const tbl of tables) {
    const headerRow = tbl.getElementsByTagNameNS(W_NS, 'tr')[0];
    if (!headerRow) continue;
    const headerText = getParagraphText(headerRow);

    if (headerText.includes('Date Of Sanction')) {
      // Loan Sanction Table (Main App & Affidavit)
      populateDynamicTableRows(tbl, loans, (loan, idx) => [
        `${idx + 1}.`,
        (loan.loanAccountNo || '').trim(),
        (loan.loanType || 'Housing Loan').trim(),
        formatDateDDMMYYYY(loan.sanctionDate, ''),
        `Rs. ${formatIndianCurrency(loan.sanctionedAmount, '0')}/-`,
      ]);
    } else if (headerText.includes('Liability With Int.')) {
      // Loan Liability Table (Main App)
      populateDynamicTableRows(tbl, loans, (loan, idx) => [
        `${idx + 1}.`,
        (loan.loanAccountNo || '').trim(),
        (loan.loanType || 'Housing Loan').trim(),
        formatDateDDMMYYYY(loan.liabilityDate, ''),
        `Rs. ${formatIndianCurrency(loan.outstandingAmount, '0')}/-`,
      ]);
    } else if (headerText.includes('Particulars') && headerText.includes('Page No')) {
      // List of Documents / Annexures Table
      populateDynamicTableRows(tbl, annexures, (ann, idx) => [
        String(ann.serialNo || idx + 1),
        (ann.particulars || '').trim(),
        (ann.pageNo || '').trim(),
      ]);
    }
  }

  const serializer = new XMLSerializer();
  const updatedXml = serializer.serializeToString(doc);
  zip.file('word/document.xml', updatedXml);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function vakalatExecDayVal(executionDate) {
  if (!executionDate) return '       ';
  const d = dayjs(executionDate);
  return d.isValid() ? d.format('DD') : '       ';
}
