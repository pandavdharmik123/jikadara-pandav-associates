import React from 'react';
import FamilyTreeCanvas from './FamilyTreeCanvas';
import PhotoUploadBox from './PhotoUploadBox';
import { PEDHINAMU_TEMPLATES, DECEASED_TEMPLATE } from '../constants/pedhinamuTemplate';
import { calculateAliveHeirs } from '../utils/gujaratiNumbers';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';

export default function PedhinamuPrintDocument({
  data,
  onNodeMove,
  onNodeResize,
  onNodeFontSizeChange,
  interactive = false,
  scale = 1,
  fontMode = 'ghanshyam',
  activePage = 'all',
  selectedNodeId,
  selectedNodeIds,
  onSelectNode
}) {
  const { general = {}, applicant = {}, deceased = {}, tree = {}, panchas = [], pedhinamuType = 'DECEASED' } = data;
  const isAliveMode = pedhinamuType === 'ALIVE';
  const template = PEDHINAMU_TEMPLATES[pedhinamuType] || DECEASED_TEMPLATE;
  const totalHeirs = calculateAliveHeirs(tree);

  const toFont = (text) => {
    if (!text) return '';
    const str = String(text);
    if (fontMode !== 'ghanshyam') return str;
    if (str === '(') return '{';
    if (str === ')') return '}';
    // Only convert if it actually contains Gujarati Unicode (U+0A80 to U+0AFF)
    if (/[\u0A80-\u0AFF]/.test(str)) {
      return convertUnicodeToGhanshyamLegacy(str);
    }
    // If it's already Ghanshyam keystrokes, return as-is without corrupting matras
    return str;
  };
  const fmt = toFont;

  const renderTextWithDynamicAppDate = (templateText) => {
    if (!templateText) return null;
    const parts = templateText.split('{applicationDate}');
    if (parts.length === 1) return toFont(templateText);
    const appDateVal = general.applicationDate || '૨૧-૧૦-૨૦૨૪';
    return (
      <>
        {toFont(parts[0])}
        <span style={{ fontFamily: dynamicFontFamily }}>{toFont(appDateVal)}</span>
        {toFont(parts[1])}
      </>
    );
  };

  const renderPanchDecl1 = (text) => {
    if (!text) return null;
    const regex = /({talatiMoje}|{taluka}|{totalHeirsCountGujarati}|\(\s*{totalHeirsCountWords}\s*\)|{\s*{?totalHeirsCountWords}?\s*}|{totalHeirsCountWords})/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part === '{talatiMoje}') {
        return (
          <span key={i} style={{ fontFamily: dynamicFontFamily }}>
            {toFont(general.talatiMoje || general.moje || '')}
          </span>
        );
      }
      if (part === '{taluka}') {
        return (
          <span key={i} style={{ fontFamily: dynamicFontFamily }}>
            {toFont(general.taluka || '')}
          </span>
        );
      }
      if (part === '{totalHeirsCountGujarati}') {
        return (
          <span key={i} style={{ fontFamily: dynamicFontFamily }}>
            {toFont(totalHeirs.gujaratiDigits)}
          </span>
        );
      }
      if (
        part === '{totalHeirsCountWords}' ||
        /^\(\s*{totalHeirsCountWords}\s*\)$/.test(part) ||
        /^{\s*{?totalHeirsCountWords}?\s*}$/.test(part)
      ) {
        if (fontMode === 'ghanshyam') {
          return (
            <span key={i}>
              <span>{'{ '}</span>
              <span style={{ fontFamily: dynamicFontFamily }}>
                {toFont(totalHeirs.gujaratiWords)}
              </span>
              <span>{' }'}</span>
            </span>
          );
        }
        return (
          <span key={i}>
            <span>{'( '}</span>
            <span style={{ fontFamily: dynamicFontFamily }}>
              {totalHeirs.gujaratiWords}
            </span>
            <span>{' )'}</span>
          </span>
        );
      }
      return <span key={i}>{toFont(part)}</span>;
    });
  };

  const docFontFamily = fontMode === 'ghanshyam'
    ? "'Nilkanth', sans-serif"
    : "'Anek Gujarati', 'Noto Sans Gujarati', system-ui, sans-serif";

  const dynamicFontFamily = fontMode === 'ghanshyam'
    ? "'Ghanshyam', sans-serif"
    : "'Anek Gujarati', 'Noto Sans Gujarati', system-ui, sans-serif";

  // Build Statement Paragraph depending on Alive vs Deceased mode
  const statement = template.getApplicantStatement({ applicant, deceased, general });

  return (
    <div
      className={`pedhinamu-print-document ${fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}`}
      style={{
        width: '1008pt',
        margin: '0 auto',
        fontFamily: docFontFamily,
        color: '#000000',
        backgroundColor: '#ffffff',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'geometricPrecision'
      }}
    >
      {/* ================= PAGE 1 ================= */}
      <div
        className="pedhinamu-page pedhinamu-page-1"
        style={{
          width: '1008pt',
          height: '612pt',
          padding: '24pt 36pt 16pt 36pt',
          boxSizing: 'border-box',
          position: 'relative',
          backgroundColor: '#fff',
          pageBreakAfter: 'always',
          breakAfter: 'page',
          display: (activePage === 'all' || activePage === '1') ? 'flex' : 'none',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: docFontFamily
        }}
      >
        <div>
          {/* Header Row: Title & Right Meta Block */}
          <div style={{ position: 'relative', marginBottom: '5pt', minHeight: '34pt' }}>
            <div
              style={{
                textAlign: 'center',
                fontWeight: fontMode === 'ghanshyam' ? 600 : 700,
                fontSize: fontMode === 'ghanshyam' ? '14pt' : '13pt',
                paddingRight: '120pt',
                paddingLeft: '40pt',
                lineHeight: 1.3,
                fontFamily: dynamicFontFamily
              }}
            >
              {toFont(template.headerTitle)}
            </div>

            {/* Right Meta Column */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                textAlign: 'right',
                fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '10.5pt',
                fontWeight: 600,
                lineHeight: 1.3,
                fontFamily: dynamicFontFamily
              }}
            >
              <div>
                <span>{toFont('રજી. નં.')}</span>
                <span>{toFont(general.registrationNo || '...............')}</span>
                <span>/</span>
                <span>{toFont(general.registrationYear || '૨૦૨૬')}</span>
              </div>
              <div>
                <span>{toFont('મોજે : ')}</span>
                <span>{toFont(general.moje || '')}</span>
              </div>
              <div>
                <span>{toFont('તા. ')}</span>
                <span>{toFont(general.taluka || '')}</span>
                <span>&nbsp;&nbsp;</span>
                <span>{toFont('જી. ')}</span>
                <span>{toFont(general.district || '')}</span>
              </div>
            </div>
          </div>

          {/* Subheading: રૂબરૂ જવાબ */}
          <div style={{ textAlign: 'center', marginBottom: '4pt' }}>
            <span
              style={{
                fontSize: fontMode === 'ghanshyam' ? '13pt' : '12.5pt',
                fontWeight: 700,
                textDecoration: 'underline',
                letterSpacing: '0.5px',
                fontFamily: dynamicFontFamily
              }}
            >
              {toFont(template.page1Subheading)}
            </span>
          </div>

          {/* Applicant Statement Paragraph */}
          <div
            style={{
              fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '10pt',
              lineHeight: fontMode === 'ghanshyam' ? 1.45 : 1.5,
              textAlign: 'justify',
              marginBottom: '5pt',
              color: '#000'
            }}
          >
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {toFont(statement.prefix)}
            <span style={{ fontWeight: 600, fontFamily: dynamicFontFamily }}>{toFont(statement.applicantName)}</span>
            {toFont(statement.ageLabel)}
            <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.applicantAge)}</span>
            {toFont(statement.occLabel)}
            <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.applicantOcc)}</span>
            {toFont(statement.addressLabel)}
            <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.applicantAddress)}</span>
            {toFont(statement.talatiLabel)}
            <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.talatiMoje)}</span>
            {toFont(statement.talukaLabel)}
            <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.taluka)}</span>
            {isAliveMode ? (
              <>
                {toFont(statement.aliveIntro)}
                <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.appDate)}</span>
                {toFont(statement.statementSuffix)}
              </>
            ) : (
              <>
                {toFont(statement.deceasedIntro)}
                <span style={{ fontWeight: 600, fontFamily: dynamicFontFamily }}>{toFont(statement.deceasedName)}</span>
                {toFont(statement.relationIntro)}
                <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.relation)}</span>
                {toFont(statement.deathPlaceIntro)}
                <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.deathPlace)}</span>
                {toFont(statement.deathDateIntro)}
                <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.deathDate)}</span>
                {toFont(statement.purposeIntro)}
                <span style={{ fontFamily: dynamicFontFamily }}>{toFont(statement.appDate)}</span>
                {toFont(statement.statementSuffix)}
              </>
            )}
          </div>

          {/* Title: પેઢીનામું */}
          <div style={{ textAlign: 'center', marginBottom: '3pt' }}>
            <span
              style={{
                fontSize: fontMode === 'ghanshyam' ? '13.5pt' : '12.5pt',
                fontWeight: 700,
                fontFamily: dynamicFontFamily
              }}
            >
              {fmt(template.pedhinamuHeading)}
            </span>
          </div>

          {/* Dynamic Family Tree Canvas */}
          <div style={{ margin: '4pt 0 8pt 0', width: '100%' }}>
            <FamilyTreeCanvas
              tree={tree}
              deceased={deceased}
              pedhinamuType={pedhinamuType}
              onNodeMove={onNodeMove}
              onNodeResize={onNodeResize}
              onNodeFontSizeChange={onNodeFontSizeChange}
              interactive={interactive}
              scale={scale}
              fontMode={fontMode}
              selectedNodeId={selectedNodeId}
              selectedNodeIds={selectedNodeIds}
              onSelectNode={onSelectNode}
            />
          </div>

          {/* Declaration Paragraphs */}
          <div
            style={{
              fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '10pt',
              lineHeight: fontMode === 'ghanshyam' ? 1.5 : 1.55,
              textAlign: 'justify'
            }}
          >
            <p style={{ marginBottom: '6pt', textIndent: '20pt' }}>
              {renderTextWithDynamicAppDate(template.page1Decl1)}
            </p>
            <p style={{ marginBottom: '6pt', textIndent: '20pt' }}>
              {toFont(template.page1Decl2)}
            </p>
            <p style={{ marginBottom: '6pt', textIndent: '20pt' }}>
              {toFont(template.page1Decl3)}
            </p>
          </div>
        </div>

        {/* Bottom Section: Place/Date, Photo, Signature */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingTop: '6pt'
            }}
          >
            {/* Left: Place & Date */}
            <div style={{ fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '10.5pt', lineHeight: 1.7, minWidth: '150pt' }}>
              <div>
                <span>{toFont('સ્થળ : ')}</span>
                <span style={{ fontFamily: dynamicFontFamily }}>{toFont(general.place || '')}</span>
              </div>
              <div>
                <span>{toFont('તારીખ : ')}</span>
                <span style={{ fontFamily: dynamicFontFamily }}>{toFont(general.currentDate || '')}</span>
              </div>
            </div>

            {/* Middle: Photo Box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <PhotoUploadBox
                photoUrl={applicant.photoUrl}
                label="અરજદાર ફોટો"
                editable={false}
                showRemove={false}
                width={85}
                height={105}
              />
            </div>

            {/* Right: Signature line */}
            <div style={{ textAlign: 'center', minWidth: '220pt' }}>
              <div style={{ letterSpacing: '1px', marginBottom: '3pt', fontSize: '9.5pt' }}>
                {template.signatureDottedLine}
              </div>
              <div style={{ fontWeight: 700, fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '10.5pt' }}>
                {toFont(template.applicantSignLabel)}
              </div>
            </div>
          </div>

          {/* Page 1 Footer */}
          <div
            className="pedhinamu-page-footer"
            style={{
              textAlign: 'center',
              fontSize: '9pt',
              marginTop: '3pt',
              color: '#000000',
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          >
            Page 1 of 2
          </div>
        </div>
      </div>

      {/* ================= PAGE 2 ================= */}
      <div
        className="pedhinamu-page pedhinamu-page-2"
        style={{
          width: '1008pt',
          height: '612pt',
          padding: '24pt 36pt 16pt 36pt',
          boxSizing: 'border-box',
          position: 'relative',
          backgroundColor: '#fff',
          display: (activePage === 'all' || activePage === '2') ? 'flex' : 'none',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: docFontFamily
        }}
      >
        <div>
          {/* Header Row */}
          <div style={{ position: 'relative', marginBottom: '8pt', minHeight: '36pt' }}>
            <div
              style={{
                textAlign: 'center',
                fontWeight: fontMode === 'ghanshyam' ? 600 : 700,
                fontSize: fontMode === 'ghanshyam' ? '15pt' : '13.5pt',
                paddingRight: '120pt',
                paddingLeft: '40pt',
                lineHeight: 1.35,
                fontFamily: dynamicFontFamily
              }}
            >
              {toFont(template.headerTitle)}
            </div>

            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                textAlign: 'right',
                fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '11pt',
                fontWeight: 600,
                fontFamily: dynamicFontFamily
              }}
            >
              <div>
                <span>{toFont('રજી. નં.')}</span>
                <span>{toFont(general.registrationNo || '...............')}</span>
                <span>/</span>
                <span>{toFont(general.registrationYear || '૨૦૨૬')}</span>
              </div>
            </div>
          </div>

          {/* Subheading: રૂબરૂ પંચનામું */}
          <div style={{ textAlign: 'center', marginBottom: '8pt' }}>
            <span
              style={{
                fontSize: fontMode === 'ghanshyam' ? '13.5pt' : '12.5pt',
                fontWeight: 700,
                textDecoration: 'underline',
                letterSpacing: '0.5px',
                fontFamily: dynamicFontFamily
              }}
            >
              {toFont(template.page2Subheading)}
            </span>
          </div>

          {/* Panch List (3 Panchas) */}
          <div
            style={{
              fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '10.5pt',
              lineHeight: fontMode === 'ghanshyam' ? 1.85 : 2.1,
              marginBottom: '8pt'
            }}
          >
            {panchas.map((panch, idx) => {
              const guNum = ['(૧)', '(૨)', '(૩)'][idx] || `(${idx + 1})`;
              return (
                <div key={panch.id || idx} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, minWidth: '24pt' }}>{toFont(guNum)}</span>
                  <span style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(panch.name || '...........................................')}</span>
                  <span>................</span>
                  <span>
                    {toFont('ઉ.આ.વ. ')}<span style={{ fontFamily: dynamicFontFamily }}>{toFont(panch.age || '.....')}</span>
                    {toFont(' ....... ધંધો. ')}<span style={{ fontFamily: dynamicFontFamily }}>{toFont(panch.occupation || '.......')}</span>
                    {toFont(' ....... રહે. ')}<span style={{ fontFamily: dynamicFontFamily }}>{toFont(panch.address || '.......................................................................')}</span>
                    {toFont(' ..... મો. ')}<span style={{ fontFamily: dynamicFontFamily }}>{toFont(panch.mobileNumber || '.......................')}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Panch Statement Paragraphs */}
          <div
            style={{
              fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '9.8pt',
              lineHeight: fontMode === 'ghanshyam' ? 1.48 : 1.55,
              textAlign: 'justify'
            }}
          >
            <p style={{ marginBottom: '5pt', textIndent: '20pt' }}>
              {renderPanchDecl1(template.page2Decl1)}
            </p>
            <p style={{ marginBottom: '5pt', textIndent: '20pt' }}>
              {toFont(template.page2Decl2)}
            </p>
            <p style={{ marginBottom: '6pt', textIndent: '20pt' }}>
              {toFont(template.page2Decl3)}
            </p>
          </div>
        </div>

        <div>
          {/* Signatures & Photo Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8pt'
            }}
          >
            {/* Left: Place & Date */}
            <div style={{ fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '11pt', lineHeight: 1.9, minWidth: '110pt' }}>
              <div>
                <span>{toFont('સ્થળ : ')}</span>
                <span style={{ fontFamily: dynamicFontFamily }}>{toFont(general.place || '')}</span>
              </div>
              <div>
                <span>{toFont('તારીખ : ')}</span>
                <span style={{ fontFamily: dynamicFontFamily }}>{toFont(general.currentDate || '')}</span>
              </div>
            </div>

            {/* Middle: 3 Panch Photos */}
            <div style={{ display: 'flex', gap: '90pt', alignItems: 'center' }}>
              {panchas.map((panch, idx) => (
                <PhotoUploadBox
                  key={`panch-photo-${idx}`}
                  photoUrl={panch.photoUrl}
                  label={`પંચ-${idx + 1}`}
                  editable={false}
                  showRemove={false}
                  width={80}
                  height={100}
                />
              ))}
            </div>

            {/* Right: 3 Panch Signature lines */}
            <div
              style={{
                fontSize: fontMode === 'ghanshyam' ? '12.5pt' : '10.5pt',
                minWidth: '320pt',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '105pt'
              }}
            >
              {[
                { label: 'પંચ-૧', showSahi: true },
                { label: 'પંચ-૨', showSahi: false },
                { label: 'પંચ-૩', showSahi: false }
              ].map((row, rIdx) => (
                <div
                  key={`panch-sign-${rIdx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '32pt'
                  }}
                >
                  <span style={{ width: '42pt', flexShrink: 0 }}>
                    {row.showSahi ? toFont('સહિ') : ''}
                  </span>
                  <span style={{ width: '54pt', flexShrink: 0, marginRight: '14pt' }}>
                    {toFont(row.label)}
                  </span>
                  <span style={{ letterSpacing: '1.3px', whiteSpace: 'nowrap' }}>
                    {template.signatureDottedLine.slice(0, 44)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footnotes Bullet List */}
          <div
            style={{
              fontSize: fontMode === 'ghanshyam' ? '9.8pt' : '9pt',
              lineHeight: fontMode === 'ghanshyam' ? 1.4 : 1.5,
              borderTop: '1px solid #e0e0e0',
              paddingTop: '5pt'
            }}
          >
            {template.bulletNotes.map((note, nIdx) => (
              <div key={`note-${nIdx}`} style={{ display: 'flex', marginBottom: '2pt' }}>
                <span style={{ marginRight: '6pt' }}>•</span>
                <span>{renderTextWithDynamicAppDate(note)}</span>
              </div>
            ))}
          </div>

          {/* Page 2 Footer */}
          <div
            className="pedhinamu-page-footer"
            style={{
              textAlign: 'center',
              fontSize: '9.5pt',
              marginTop: '5pt',
              color: '#000000',
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          >
            Page 2 of 2
          </div>
        </div>
      </div>
    </div>
  );
}
