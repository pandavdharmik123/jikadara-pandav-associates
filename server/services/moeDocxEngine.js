import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import dayjs from 'dayjs';
import {
  buildMoePropertyDescription,
  buildTitleDocumentDescription,
  formatIndianAmount,
  numberToIndianRupeesWords,
} from '../config/moeTemplates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, '../templates/moe');
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const PIC_NS = 'http://schemas.openxmlformats.org/drawingml/2006/picture';

function toRoman(num) {
  const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let n = num;
  let out = '';
  for (const [val, sym] of map) {
    while (n >= val) {
      out += sym;
      n -= val;
    }
  }
  return out || String(num);
}

function formatDateDDMMYYYY(val, fallback = '') {
  if (!val) return fallback;
  const d = dayjs(val);
  return d.isValid() ? d.format('DD-MM-YYYY') : String(val);
}

function getParagraphText(pNode) {
  const tNodes = pNode.getElementsByTagNameNS(W_NS, 't');
  let text = '';
  for (let i = 0; i < tNodes.length; i += 1) {
    text += tNodes[i].textContent || '';
  }
  return text;
}

function replaceInParagraph(pNode, searchValue, replaceValue, { all = true } = {}) {
  if (!searchValue) return false;
  let replacedAny = false;
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
      if (item.end <= matchIdx || item.start >= matchEnd) continue;
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

function setCellParagraphLines(doc, tcNode, lines) {
  const existingPs = Array.from(tcNode.childNodes).filter((c) => c.nodeType === 1 && c.localName === 'p');
  if (existingPs.length === 0) return;
  const tplP = existingPs[0].cloneNode(true);
  for (const p of existingPs) {
    tcNode.removeChild(p);
  }
  const list = lines && lines.length > 0 ? lines : [''];
  for (const line of list) {
    const p = tplP.cloneNode(true);
    setParagraphSingleText(doc, p, line);
    tcNode.appendChild(p);
  }
}

function getRowCells(trNode) {
  const cells = [];
  for (let i = 0; i < trNode.childNodes.length; i += 1) {
    const ch = trNode.childNodes[i];
    if (ch.nodeType === 1 && ch.localName === 'tc') cells.push(ch);
  }
  return cells;
}

function getTableRows(tblNode) {
  const rows = [];
  for (let i = 0; i < tblNode.childNodes.length; i += 1) {
    const ch = tblNode.childNodes[i];
    if (ch.nodeType === 1 && ch.localName === 'tr') rows.push(ch);
  }
  return rows;
}

function formatPartyLines(parties = [], { includeBusinessAddress = false, businessAddress = '' } = {}) {
  const lines = [];
  const list = parties.length > 0 ? parties : [{ fullName: '[Party Name]', age: 'Adult', residentialAddress: '' }];
  list.forEach((p, idx) => {
    lines.push(`(${idx + 1}) ${(p.fullName || '[Party Name]').trim()}`);
    const addr = (p.residentialAddress || p.address || '').trim();
    const age = (p.age || 'Adult').trim();
    lines.push(`Age About ${age}, Residing at : ${addr}`);
  });
  if (includeBusinessAddress && businessAddress?.trim()) {
    lines.push(`Business Address : ${businessAddress.trim()}`);
  }
  return lines;
}

async function addEmbeddedImageParagraph(zip, relsDoc, contentTypesDoc, doc, pNode, dataUrl, widthPx = 115, heightPx = 125, counterRef) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return;
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) return;

  const extRaw = match[1].toLowerCase();
  const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
  const base64Data = match[2];
  const imgBuf = Buffer.from(base64Data, 'base64');

  counterRef.count += 1;
  const imgId = counterRef.count;
  const mediaName = `moe_media_${imgId}.${ext}`;
  const rId = `rIdMoeImg${imgId}`;

  zip.file(`word/media/${mediaName}`, imgBuf);

  // Add relationship
  const relsRoot = relsDoc.documentElement;
  const relEl = relsDoc.createElementNS('http://schemas.openxmlformats.org/package/2006/relationships', 'Relationship');
  relEl.setAttribute('Id', rId);
  relEl.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
  relEl.setAttribute('Target', `media/${mediaName}`);
  relsRoot.appendChild(relEl);

  // Ensure Content_Types has extension
  const ctRoot = contentTypesDoc.documentElement;
  const defaults = Array.from(ctRoot.getElementsByTagName('Default'));
  if (!defaults.some((d) => d.getAttribute('Extension')?.toLowerCase() === ext)) {
    const def = contentTypesDoc.createElement('Default');
    def.setAttribute('Extension', ext);
    def.setAttribute('ContentType', ext === 'png' ? 'image/png' : 'image/jpeg');
    ctRoot.appendChild(def);
  }

  // Replace existing runs in pNode with an inline DrawingML image
  const runs = Array.from(pNode.getElementsByTagNameNS(W_NS, 'r'));
  for (const r of runs) {
    if (r.parentNode === pNode) pNode.removeChild(r);
  }

  const cx = Math.round(widthPx * 9525);
  const cy = Math.round(heightPx * 9525);
  const drawingXml = `
    <w:r xmlns:w="${W_NS}" xmlns:wp="${WP_NS}" xmlns:a="${A_NS}" xmlns:pic="${PIC_NS}" xmlns:r="${R_NS}">
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${cx}" cy="${cy}"/>
          <wp:docPr id="${1000 + imgId}" name="MOE_Image_${imgId}"/>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="${1000 + imgId}" name="${mediaName}"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${rId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  `;
  const rDoc = new DOMParser().parseFromString(drawingXml, 'application/xml');
  const importedRun = doc.importNode(rDoc.documentElement, true);
  pNode.appendChild(importedRun);
}

/**
 * Generate a finalized MOE DOCX buffer from the master template + centralized formData.
 */
export async function generateMoeDocx(formData = {}, templateFileName = 'registered-moe-axis-first-deposit.docx') {
  const templatePath = path.join(TEMPLATES_DIR, templateFileName);
  const templateBytes = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBytes);

  const parser = new DOMParser();
  const doc = parser.parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml');
  const relsDoc = parser.parseFromString(await zip.file('word/_rels/document.xml.rels').async('string'), 'application/xml');
  const contentTypesDoc = parser.parseFromString(await zip.file('[Content_Types].xml').async('string'), 'application/xml');
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0];

  const s1 = formData.schedule1 || {};
  const s2 = formData.schedule2 || {};
  const s3 = formData.schedule3 || {};
  const s4 = formData.schedule4 || {};
  const s5 = formData.schedule5 || {};
  const s6 = formData.schedule6 || {};
  const clauses = formData.conditionalClauses || {};
  const execution = formData.execution || {};

  const depositPlace = (s1.depositPlace || 'SURAT').trim();
  const depositDateFormatted = formatDateDDMMYYYY(s1.depositDate, '__-__-____');
  const bankName = (s1.bankName || 'Axis Bank Limited').trim();
  const bankShortName = (s1.bankShortName || bankName).trim();
  const bankRegOffice = (s1.bankRegisteredOffice || '').trim();
  const bankBranchAddress = (s1.bankBranchAddress || '').trim();
  const officerName = (s1.authorizedOfficerName || '').trim();
  const officerDesignation = (s1.authorizedOfficerDesignation || 'Manager').trim();
  const officerFull = officerName ? `${officerName} - ${officerDesignation}` : `[Authorized Officer] - ${officerDesignation}`;

  const securityProviders = Array.isArray(s2.securityProviders) ? s2.securityProviders : [];
  const borrowers = Array.isArray(s3.borrowers) ? s3.borrowers : [];
  const facilityAgreements = Array.isArray(s3.facilityAgreements) ? s3.facilityAgreements : [];
  const sanctionLetters = Array.isArray(s3.sanctionLetters) ? s3.sanctionLetters : [];
  const facilities = Array.isArray(s3.facilities) ? s3.facilities : [];
  const titleDocs = Array.isArray(s4.titleDocuments) ? s4.titleDocuments : [];
  const properties = Array.isArray(s5.properties) ? s5.properties : [];
  const existingCharges = Array.isArray(s6.existingCharges) ? s6.existingCharges : [];

  // 1. Main Memorandum paragraphs & Conditional Clauses
  const allParagraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'));
  for (const p of allParagraphs) {
    const txt = getParagraphText(p);
    if (!txt) continue;

    if (txt.includes('Axis Bank Limited, a company incorporated')) {
      replaceInParagraph(p, 'Axis Bank Limited', bankName);
      if (bankRegOffice) {
        replaceInParagraph(
          p,
          '‘Trishul’, 3rd Floor, Opposite Samartheshwar Temple, Law Garden, Ellis Bridge, Ahmedabad – 380 006',
          bankRegOffice
        );
      }
    }

    // Conditional Section 180(1)(a) Companies Act clause
    if (txt.includes('Section 180(1) (a) of the Companies Act, 2013')) {
      if (clauses.sec180_companies_act === 'NOT_APPLICABLE') {
        if (p.parentNode === body) body.removeChild(p);
      }
    }
  }

  // 2. Tables: Schedule I, Schedule II, Schedule III
  const tables = Array.from(doc.getElementsByTagNameNS(W_NS, 'tbl'));
  for (const tbl of tables) {
    const rows = getTableRows(tbl);
    if (rows.length === 0) continue;
    const headerTxt = getParagraphText(rows[0]);

    // Schedule I (Place, Date, Branch Address, Officer)
    if (headerTxt.includes('Particulars') && headerTxt.includes('Details')) {
      if (rows[1]) setCellParagraphLines(doc, getRowCells(rows[1])[2], [depositPlace]);
      if (rows[2]) setCellParagraphLines(doc, getRowCells(rows[2])[2], [depositDateFormatted]);
      if (rows[3]) setCellParagraphLines(doc, getRowCells(rows[3])[2], [bankBranchAddress]);
      if (rows[4]) setCellParagraphLines(doc, getRowCells(rows[4])[2], [officerFull]);
    }

    // Schedule II (Security Provider(s) & Authorized Person)
    if (headerTxt.includes('Title') && headerTxt.includes('Details')) {
      if (rows[1]) {
        const spLines = formatPartyLines(securityProviders);
        setCellParagraphLines(doc, getRowCells(rows[1])[2], spLines);
      }
      if (rows[2]) {
        const authPersonText = s2.hasAuthorizedPerson === 'Yes'
          ? [
              `${(s2.authorizedPersonName || '').trim()}${s2.authorizedPersonAge ? `, Age About ${s2.authorizedPersonAge}` : ''}`,
              s2.authorizedPersonAddress ? `Residing at : ${s2.authorizedPersonAddress.trim()}` : '',
            ].filter(Boolean)
          : ['NA'];
        setCellParagraphLines(doc, getRowCells(rows[2])[2], authPersonText);
      }
      if (rows[3]) {
        const authDetailsText = s2.hasAuthorizedPerson === 'Yes'
          ? [
              [
                s2.authorizationType && s2.authorizationType !== 'NA' ? s2.authorizationType : '',
                s2.poaNumber ? `POA No. ${s2.poaNumber}` : '',
                s2.poaDate ? `dated ${formatDateDDMMYYYY(s2.poaDate)}` : '',
                s2.resolutionNumber ? `Resolution No. ${s2.resolutionNumber}` : '',
                s2.resolutionDate ? `dated ${formatDateDDMMYYYY(s2.resolutionDate)}` : '',
              ].filter(Boolean).join(', '),
              s2.authorizationDetails && s2.authorizationDetails !== 'NA' ? s2.authorizationDetails.trim() : '',
            ].filter(Boolean)
          : ['NA'];
        setCellParagraphLines(doc, getRowCells(rows[3])[2], authDetailsText.length ? authDetailsText : ['NA']);
      }
    }

    // Schedule III (Borrowers, Facility Agreements, Sanction Letters, Facilities, Total, Clearances, Ranking)
    if (headerTxt.includes('S.No.') && headerTxt.includes('Terms')) {
      const bizAddr = borrowers.map((b) => b.businessAddress || b.registeredOfficeAddress || b.principalPlaceOfBusiness).find((x) => x?.trim()) || '';
      if (rows[1]) {
        setCellParagraphLines(doc, getRowCells(rows[1])[2], formatPartyLines(borrowers));
      }
      if (rows[2]) {
        setCellParagraphLines(doc, getRowCells(rows[2])[2], formatPartyLines(borrowers, { includeBusinessAddress: true, businessAddress: bizAddr }));
      }

      // Dynamic Facility Agreement rows (template rows 3 & 4 -> anchor at row 5)
      const faTplRow = rows[3].cloneNode(true);
      const slAnchor = rows[5];
      tbl.removeChild(rows[3]);
      tbl.removeChild(rows[4]);
      const faList = facilityAgreements.length ? facilityAgreements : [{}];
      faList.forEach((fa, idx) => {
        const r = faTplRow.cloneNode(true);
        const cells = getRowCells(r);
        if (idx > 0) setCellParagraphLines(doc, cells[1], ['']);
        const d = fa.executionDate ? dayjs(fa.executionDate) : null;
        const dateDesc = d && d.isValid() ? `the ${d.format('DD')} day of ${d.format('MMMM, YYYY')}` : 'the ____ day of ________, ____';
        const autoDesc = `The ${(fa.facilityName || 'FACILITY').trim()} ${(fa.agreementType || 'Facility Agreement').trim()} executed on ${dateDesc} at ${(fa.executionPlace || depositPlace).trim()}, by and among ${(fa.borrowerReferences || 'the Borrower and the Bank').trim()}.`;
        setCellParagraphLines(doc, cells[2], [(fa.agreementDescription || '').trim() || autoDesc]);
        tbl.insertBefore(r, slAnchor);
      });

      // Dynamic Sanction Letter rows (template rows 5 & 6 -> anchor at row 7)
      const slTplRow = rows[5].cloneNode(true);
      const facHeaderAnchor = rows[7];
      tbl.removeChild(rows[5]);
      tbl.removeChild(rows[6]);
      const slList = sanctionLetters.length ? sanctionLetters : [{}];
      slList.forEach((sl, idx) => {
        const r = slTplRow.cloneNode(true);
        const cells = getRowCells(r);
        if (idx > 0) setCellParagraphLines(doc, cells[1], ['']);
        const dStr = sl.sanctionDate ? dayjs(sl.sanctionDate).format('DD MMMM YYYY') : '________';
        const refStr = (sl.sanctionRefNo || '________').trim();
        const extra = sl.additionalDetails ? ` ${sl.additionalDetails.trim()}` : '';
        const slDesc = `The Sanction Letter issued to the Borrower on the ${dStr} Sanction Ref No. ${refStr} by the bank.${extra}`;
        setCellParagraphLines(doc, cells[2], [slDesc]);
        tbl.insertBefore(r, facHeaderAnchor);
      });

      // Dynamic Financial Facilities rows (template rows 8 & 9 -> anchor at row 10 Total)
      const facTplRow = rows[8].cloneNode(true);
      const totalRowAnchor = rows[10];
      tbl.removeChild(rows[8]);
      tbl.removeChild(rows[9]);
      let totalAmount = 0;
      const facList = facilities.length ? facilities : [{}];
      facList.forEach((fac) => {
        const r = facTplRow.cloneNode(true);
        const cells = getRowCells(r);
        const rawAmt = Number(String(fac.facilityAmount || 0).replace(/[^0-9.-]/g, '')) || 0;
        totalAmount += rawAmt;
        setCellParagraphLines(doc, cells[1], [(fac.facilityName || '').trim() || 'Facility']);
        setCellParagraphLines(doc, cells[2], [`${formatIndianAmount(rawAmt)}/- (${numberToIndianRupeesWords(rawAmt)})`]);
        tbl.insertBefore(r, totalRowAnchor);
      });

      // Total row (Row 10)
      setCellParagraphLines(doc, getRowCells(totalRowAnchor)[2], [
        `${formatIndianAmount(totalAmount)}/-`,
        `(${numberToIndianRupeesWords(totalAmount)})`,
      ]);

      // Row 11: Authorizations & Clearances
      if (rows[11]) {
        const authClearances = s3.authorizationsApplicable === 'Yes'
          ? [
              s3.authorizationDescription && s3.authorizationDescription !== 'NA' ? s3.authorizationDescription.trim() : '',
              s3.section281Details ? `Sec 281: ${s3.section281Details.trim()}` : '',
              s3.nocDetails ? `NOC: ${s3.nocDetails.trim()}` : '',
              s3.otherApprovals ? s3.otherApprovals.trim() : '',
            ].filter(Boolean)
          : ['NA'];
        setCellParagraphLines(doc, getRowCells(rows[11])[2], authClearances.length ? authClearances : ['NA']);
      }

      // Row 12: Ranking of Security Interest
      if (rows[12]) {
        const rankText = s3.rankingDescription?.trim()
          ? `${s3.rankingOfSecurityInterest || 'First'} - ${s3.rankingDescription.trim()}`
          : (s3.rankingOfSecurityInterest || 'First');
        setCellParagraphLines(doc, getRowCells(rows[12])[2], [rankText]);
      }
    }
  }

  // 3. Dynamic Schedule IV (List of Title Documents between "List of the Title Documents" and "SCHEDULE V")
  const bodyChildren = Array.from(body.childNodes).filter((c) => c.nodeType === 1);
  const sch4HeadIdx = bodyChildren.findIndex((el) => el.localName === 'p' && getParagraphText(el).includes('List of the Title Documents'));
  const sch5Idx = bodyChildren.findIndex((el) => el.localName === 'p' && getParagraphText(el).includes('SCHEDULE V'));

  if (sch4HeadIdx !== -1 && sch5Idx !== -1 && sch5Idx > sch4HeadIdx + 1) {
    const firstDocP = bodyChildren.slice(sch4HeadIdx + 1, sch5Idx).find((el) => el.localName === 'p' && getParagraphText(el).trim());
    const tplDocP = firstDocP ? firstDocP.cloneNode(true) : doc.createElementNS(W_NS, 'w:p');
    const anchor5 = bodyChildren[sch5Idx];

    for (let i = sch4HeadIdx + 1; i < sch5Idx; i += 1) {
      body.removeChild(bodyChildren[i]);
    }

    const docsToRender = titleDocs.length > 0 ? titleDocs : [{ documentType: 'Registered Sale Deed' }];
    docsToRender.forEach((td, idx) => {
      const p = tplDocP.cloneNode(true);
      const desc = td.manualDescriptionOverride && td.customDescription?.trim()
        ? td.customDescription.trim()
        : buildTitleDocumentDescription(td);
      setParagraphSingleText(doc, p, `${idx + 1}. ${desc}`);
      body.insertBefore(p, anchor5);
    });
  }

  // 4. Dynamic Schedule V (Multiple Immovable Properties between "SCHEDULE V" and "SCHEDULE VI")
  const bodyChildren2 = Array.from(body.childNodes).filter((c) => c.nodeType === 1);
  const sch5StartIdx = bodyChildren2.findIndex((el) => el.localName === 'p' && getParagraphText(el).includes('SCHEDULE V'));
  const sch6Idx = bodyChildren2.findIndex((el) => el.localName === 'p' && getParagraphText(el).includes('SCHEDULE VI'));

  if (sch5StartIdx !== -1 && sch6Idx !== -1) {
    const slice5 = bodyChildren2.slice(sch5StartIdx + 1, sch6Idx);
    const tplTitleP = slice5.find((el) => getParagraphText(el).includes('Description of the Immoveable'))?.cloneNode(true);
    const tplDescP = slice5.find((el) => getParagraphText(el).includes('All that residential'))?.cloneNode(true);
    const tplBoundHeadP = slice5.find((el) => getParagraphText(el).includes('Boundaries'))?.cloneNode(true);
    const tplEastNorthP = slice5.find((el) => getParagraphText(el).includes('East'))?.cloneNode(true);
    const tplWestSouthP = slice5.find((el) => getParagraphText(el).includes('West'))?.cloneNode(true);
    const tplRightsP = slice5.find((el) => getParagraphText(el).includes('together with the right to use common areas'))?.cloneNode(true);
    const anchor6 = bodyChildren2[sch6Idx];

    for (let i = sch5StartIdx + 1; i < sch6Idx; i += 1) {
      body.removeChild(bodyChildren2[i]);
    }

    const propsToRender = properties.length > 0 ? properties : [{}];
    propsToRender.forEach((prop, idx) => {
      if (tplTitleP) {
        const pTitle = tplTitleP.cloneNode(true);
        setParagraphSingleText(doc, pTitle, `Description of the Immoveable Properties-${toRoman(idx + 1)}`);
        body.insertBefore(pTitle, anchor6);
      }
      if (tplDescP) {
        const pDesc = tplDescP.cloneNode(true);
        const propDesc = prop.manualDescriptionOverride && prop.completePropertyDescription?.trim()
          ? prop.completePropertyDescription.trim()
          : ((prop.completePropertyDescription || '').trim() || buildMoePropertyDescription(prop));
        setParagraphSingleText(doc, pDesc, propDesc);
        body.insertBefore(pDesc, anchor6);
      }
      if (tplBoundHeadP) {
        body.insertBefore(tplBoundHeadP.cloneNode(true), anchor6);
      }
      const b = prop.boundaries || {};
      if (tplEastNorthP) {
        const pEN = tplEastNorthP.cloneNode(true);
        setParagraphSingleText(doc, pEN, `East  : ${(b.east || '—').trim()}              North  : ${(b.north || '—').trim()}`);
        body.insertBefore(pEN, anchor6);
      }
      if (tplWestSouthP) {
        const pWS = tplWestSouthP.cloneNode(true);
        setParagraphSingleText(doc, pWS, `West  : ${(b.west || '—').trim()}              South  : ${(b.south || '—').trim()}`);
        body.insertBefore(pWS, anchor6);
      }
      if (tplRightsP) {
        const pRights = tplRightsP.cloneNode(true);
        const rightsParts = [];
        if (prop.commonAreaRights !== false) rightsParts.push('the right to use common areas of the building');
        if (prop.waterFacilities !== false) rightsParts.push('the right to use water closet');
        if (prop.drainage !== false) rightsParts.push('drainage, lavatories and other conveniences and facilities, amenities');
        if (prop.easementRights !== false) rightsParts.push('easementary rights');
        if (prop.fixturesAndFittings !== false) rightsParts.push('all fixtures and fittings, both present and future');
        if (prop.otherPropertyRights?.trim()) rightsParts.push(prop.otherPropertyRights.trim());
        if (rightsParts.length > 0) {
          setParagraphSingleText(doc, pRights, `together with ${rightsParts.join(', ')}.`);
          body.insertBefore(pRights, anchor6);
        }
      }
    });
  }

  // 5. Schedule VI (NIL or Existing Charges)
  const allP2 = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'));
  for (const p of allP2) {
    const txt = getParagraphText(p);
    if (txt.trim() === 'NIL') {
      if (s6.hasExistingCharges === 'EXISTING' && existingCharges.length > 0) {
        const chargeSummary = existingCharges
          .map((ch, idx) =>
            `(${idx + 1}) ${ch.chargeHolderName || 'Charge Holder'} — ${ch.natureOfCharge || 'Charge'}${ch.registrationNo ? ` (Reg No. ${ch.registrationNo}${ch.registrationDate ? ` dated ${formatDateDDMMYYYY(ch.registrationDate)}` : ''})` : ''}${ch.outstandingDetails ? ` | ${ch.outstandingDetails}` : ''}`
          )
          .join('\n');
        setParagraphSingleText(doc, p, chargeSummary);
      }
    }
  }

  // 6. Signature, Execution Date & Photo/Signature/Thumb Section
  const execDate = execution.executionDate || s1.depositDate;
  const execDay = execDate && dayjs(execDate).isValid() ? dayjs(execDate).format('DD') : '____';
  const execMonth = execDate && dayjs(execDate).isValid() ? dayjs(execDate).format('MMMM') : '________';
  const execYear = execDate && dayjs(execDate).isValid() ? dayjs(execDate).format('YYYY') : String(new Date().getFullYear());

  const sp1Name = (securityProviders[0]?.fullName || '[Security Provider 1]').trim();
  const sp2Name = securityProviders[1]?.fullName?.trim() || '';

  const imgCounter = { count: 0 };
  const allP3 = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'));
  let currentSpPhotoIdx = -1;
  let inBankPhotoSection = false;

  for (let i = 0; i < allP3.length; i += 1) {
    const p = allP3[i];
    const txt = getParagraphText(p);
    if (!txt) {
      // Check if this paragraph holds an image box
      const hasDrawing = p.getElementsByTagNameNS(WP_NS, 'inline').length > 0 || p.getElementsByTagNameNS(WP_NS, 'anchor').length > 0;
      if (hasDrawing) {
        if (!inBankPhotoSection && currentSpPhotoIdx >= 0 && currentSpPhotoIdx < securityProviders.length) {
          const sp = securityProviders[currentSpPhotoIdx];
          // First image box is Photo, second is Thumb Impression
          if (sp._photoReplaced !== true && sp.photoImage) {
            sp._photoReplaced = true;
            await addEmbeddedImageParagraph(zip, relsDoc, contentTypesDoc, doc, p, sp.photoImage, 110, 125, imgCounter);
          } else if (sp._thumbReplaced !== true && sp.thumbImage) {
            sp._thumbReplaced = true;
            await addEmbeddedImageParagraph(zip, relsDoc, contentTypesDoc, doc, p, sp.thumbImage, 110, 95, imgCounter);
          }
        } else if (inBankPhotoSection) {
          if (execution._bankPhotoReplaced !== true && execution.bankOfficerPhotoImage) {
            execution._bankPhotoReplaced = true;
            await addEmbeddedImageParagraph(zip, relsDoc, contentTypesDoc, doc, p, execution.bankOfficerPhotoImage, 110, 125, imgCounter);
          } else if (execution._bankSigReplaced !== true && execution.bankOfficerSignatureImage) {
            execution._bankSigReplaced = true;
            await addEmbeddedImageParagraph(zip, relsDoc, contentTypesDoc, doc, p, execution.bankOfficerSignatureImage, 140, 60, imgCounter);
          }
        }
      }
      continue;
    }

    if (txt.includes('Photo, Signature & Thumb Impression of Bank Officer')) {
      inBankPhotoSection = true;
    }

    if (txt.includes('(1) PREMSHANKAR LALMANI MAURYA')) {
      if (txt.includes('1.___________________________')) {
        replaceInParagraph(p, 'PREMSHANKAR LALMANI MAURYA', sp1Name);
      } else {
        currentSpPhotoIdx = 0;
        replaceInParagraph(p, 'PREMSHANKAR LALMANI MAURYA', sp1Name);
      }
    }

    if (txt.includes('(2) HEMADEVI PREMSHANKAR MAURYA')) {
      if (txt.includes('2.___________________________')) {
        if (sp2Name) {
          replaceInParagraph(p, 'HEMADEVI PREMSHANKAR MAURYA', sp2Name);
        } else {
          setParagraphSingleText(doc, p, '');
        }
      } else {
        currentSpPhotoIdx = 1;
        if (sp2Name) {
          replaceInParagraph(p, 'HEMADEVI PREMSHANKAR MAURYA', sp2Name);
        } else {
          setParagraphSingleText(doc, p, '');
        }
      }
    }

    // Security provider signature dotted line
    if (txt.includes('….………………………………………') && !inBankPhotoSection && currentSpPhotoIdx >= 0) {
      const sp = securityProviders[currentSpPhotoIdx];
      if (sp?.signatureImage) {
        await addEmbeddedImageParagraph(zip, relsDoc, contentTypesDoc, doc, p, sp.signatureImage, 140, 55, imgCounter);
      }
    }

    replaceInParagraph(p, 'Mr. Pritesh Mahla - Manager', officerFull);
    replaceInParagraph(p, 'For, Axis Bank Ltd', `For, ${bankShortName}`);

    if (txt.includes('Dated this') && txt.includes('day of')) {
      setParagraphSingleText(doc, p, `Dated this ${execDay} day of ${execMonth} ${execYear}`);
    }
  }

  const serializer = new XMLSerializer();
  zip.file('word/document.xml', serializer.serializeToString(doc));
  zip.file('word/_rels/document.xml.rels', serializer.serializeToString(relsDoc));
  zip.file('[Content_Types].xml', serializer.serializeToString(contentTypesDoc));

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
