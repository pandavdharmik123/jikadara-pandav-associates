import React from 'react';
import FamilyTreeCanvas from './FamilyTreeCanvas';
import PhotoUploadBox from './PhotoUploadBox';
import { PEDHINAMU_STATIC_TEXT } from '../constants/pedhinamuTemplate';
import { calculateAliveHeirs } from '../utils/gujaratiNumbers';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';

export default function PedhinamuPrintDocument({
  data,
  onNodeMove,
  interactive = false,
  scale = 1,
  fontMode = 'ghanshyam', // 'ghanshyam' | 'unicode'
  activePage = 'all', // 'all' | '1' | '2'
  selectedNodeId,
  selectedNodeIds,
  onSelectNode
}) {
  const { general, applicant, deceased, tree, panchas } = data;
  const totalHeirs = calculateAliveHeirs(tree);

  const toFont = (text) => {
    if (!text) return '';
    const str = String(text);
    if (fontMode !== 'ghanshyam') return str;
    // Only convert if it actually contains Gujarati Unicode (U+0A80 to U+0AFF)
    if (/[\u0A80-\u0AFF]/.test(str)) {
      return convertUnicodeToGhanshyamLegacy(str);
    }
    // If it's already Ghanshyam keystrokes, return as-is without corrupting matras
    return str;
  };
  const fmt = toFont;

  const formatDecl1 = (text) => {
    return text.replace(/{applicationDate}/g, general.applicationDate || '૨૧-૧૦-૨૦૨૪');
  };

  const formatPanchDecl1 = (text) => {
    return text
      .replace(/{talatiMoje}/g, general.talatiMoje || general.moje || '')
      .replace(/{taluka}/g, general.taluka || '')
      .replace(/{totalHeirsCountGujarati}/g, totalHeirs.gujaratiDigits)
      .replace(/{totalHeirsCountWords}/g, totalHeirs.gujaratiWords);
  };

  const docFontFamily = fontMode === 'ghanshyam'
    ? "'Ghanshyam', sans-serif"
    : "'Anek Gujarati', 'Noto Sans Gujarati', system-ui, sans-serif";

  return (
    <div
      className={`pedhinamu-print-document ${fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}`}
      style={{
        width: '1008pt',
        margin: '0 auto',
        fontFamily: docFontFamily,
        color: '#000',
        backgroundColor: '#fff'
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
                lineHeight: 1.3
              }}
            >
              {toFont(PEDHINAMU_STATIC_TEXT.headerTitle)}
            </div>

            {/* Right Meta Column */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                textAlign: 'right',
                fontSize: fontMode === 'ghanshyam' ? '11.5pt' : '10.5pt',
                fontWeight: 600,
                lineHeight: 1.3
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
                fontSize: fontMode === 'ghanshyam' ? '13pt' : '12pt',
                fontWeight: 700,
                textDecoration: 'underline',
                letterSpacing: '0.5px'
              }}
            >
              {toFont(PEDHINAMU_STATIC_TEXT.page1Subheading)}
            </span>
          </div>

          {/* Applicant Statement Paragraph */}
          <div
            style={{
              fontSize: fontMode === 'ghanshyam' ? '11pt' : '10pt',
              lineHeight: fontMode === 'ghanshyam' ? 1.45 : 1.5,
              textAlign: 'justify',
              marginBottom: '5pt',
              color: '#000'
            }}
          >
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {toFont('હું નીચે સહી કરનાર ')}
            <span style={{ fontWeight: 600 }}>{toFont(applicant.name || '...................................................')}</span>
            {toFont(' ઉ.આ. ')}
            <span>{toFont(applicant.age || '.....')}</span>
            {toFont(' ધંધો. ')}
            <span>{toFont(applicant.occupation || '.......')}</span>
            {toFont(' રહે. ')}
            <span>{toFont(applicant.address || '.......................................................................')}</span>
            {toFont(' આજરોજ તલાટી ')}
            <span>{toFont(general.talatiMoje || general.moje || '................')}</span>
            {toFont(', તા. ')}
            <span>{toFont(general.taluka || '................')}</span>
            {toFont(' રૂબરૂ હાજર થઈ પુછવાથી લખાવું છું કે, સ્વ. ')}
            <span style={{ fontWeight: 600 }}>{toFont(deceased.name || '...................................................')}</span>
            {toFont(' કે જેઓ ')}
            <span>{toFont(applicant.relationWithDeceased ? `${applicant.relationWithDeceased} થાય` : 'મારા પિતા થાય')}</span>
            {toFont('. તેઓનું ')}
            <span>{toFont(deceased.deathPlace || 'સુરત')}</span>
            {toFont(' મુકામે તા. ')}
            <span>{toFont(deceased.deathDate || '................')}</span>
            {toFont(' ના રોજ અવસાન થયેલુ છે. વારસાઈ કામે તેમના પેઢીનામાની જરૂર હોઈ પેઢીનામું મેળવવા માટે તા. ')}
            <span>{toFont(general.applicationDate || general.currentDate || '................')}</span>
            {toFont(' ના રોજ અરજી કરેલી છે. તે સંદર્ભે આજ રોજ લખાવું છું કે, વારસદારો જાહેર કરતું પેઢીનામું નીચે પ્રમાણે છે. જે હકીકત છે.')}
          </div>

          {/* Title: પેઢીનામું */}
          <div style={{ textAlign: 'center', marginBottom: '3pt' }}>
            <span style={{ fontSize: fontMode === 'ghanshyam' ? '13.5pt' : '12.5pt', fontWeight: 700 }}>
              {fmt(PEDHINAMU_STATIC_TEXT.pedhinamuHeading)}
            </span>
          </div>

          {/* Dynamic Family Tree Canvas */}
          <div style={{ margin: '4pt 0 8pt 0', width: '100%' }}>
            <FamilyTreeCanvas
              tree={tree}
              deceased={deceased}
              onNodeMove={onNodeMove}
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
              fontSize: fontMode === 'ghanshyam' ? '11pt' : '10pt',
              lineHeight: fontMode === 'ghanshyam' ? 1.5 : 1.55,
              textAlign: 'justify'
            }}
          >
            <p style={{ marginBottom: '6pt', textIndent: '20pt' }}>
              {toFont(formatDecl1(PEDHINAMU_STATIC_TEXT.page1Decl1))}
            </p>
            <p style={{ marginBottom: '6pt', textIndent: '20pt' }}>
              {toFont(PEDHINAMU_STATIC_TEXT.page1Decl2)}
            </p>
            <p style={{ marginBottom: '6pt', textIndent: '20pt' }}>
              {toFont(PEDHINAMU_STATIC_TEXT.page1Decl3)}
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
            <div style={{ fontSize: fontMode === 'ghanshyam' ? '11.5pt' : '10.5pt', lineHeight: 1.7, minWidth: '150pt' }}>
              <div>
                <span>{toFont('સ્થળ : ')}</span>
                <span>{toFont(general.place || '')}</span>
              </div>
              <div>
                <span>{toFont('તારીખ : ')}</span>
                <span>{toFont(general.currentDate || '')}</span>
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
                {PEDHINAMU_STATIC_TEXT.signatureDottedLine}
              </div>
              <div style={{ fontWeight: 700, fontSize: fontMode === 'ghanshyam' ? '11.5pt' : '10.5pt' }}>
                {toFont(PEDHINAMU_STATIC_TEXT.applicantSignLabel)}
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
                fontSize: fontMode === 'ghanshyam' ? '14.5pt' : '13.5pt',
                paddingRight: '120pt',
                paddingLeft: '40pt',
                lineHeight: 1.35
              }}
            >
              {toFont(PEDHINAMU_STATIC_TEXT.headerTitle)}
            </div>

            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                textAlign: 'right',
                fontSize: fontMode === 'ghanshyam' ? '12pt' : '11pt',
                fontWeight: 600
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
                letterSpacing: '0.5px'
              }}
            >
              {toFont(PEDHINAMU_STATIC_TEXT.page2Subheading)}
            </span>
          </div>

          {/* Panch List (3 Panchas) */}
          <div
            style={{
              fontSize: fontMode === 'ghanshyam' ? '11.5pt' : '10.5pt',
              lineHeight: fontMode === 'ghanshyam' ? 1.85 : 2.1,
              marginBottom: '8pt'
            }}
          >
            {panchas.map((panch, idx) => {
              const guNum = ['(૧)', '(૨)', '(૩)'][idx] || `(${idx + 1})`;
              return (
                <div key={panch.id || idx} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, minWidth: '24pt' }}>{toFont(guNum)}</span>
                  <span style={{ fontWeight: 700 }}>{toFont(panch.name || '...........................................')}</span>
                  <span>................</span>
                  <span>
                    {toFont('ઉ.આ.વ. ')}<span>{toFont(panch.age || '.....')}</span>
                    {toFont(' ....... ધંધો. ')}<span>{toFont(panch.occupation || '.......')}</span>
                    {toFont(' ....... રહે. ')}<span>{toFont(panch.address || '.......................................................................')}</span>
                    {toFont(' ..... મો. ')}<span>{toFont(panch.mobileNumber || '.......................')}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Panch Statement Paragraphs */}
          <div
            style={{
              fontSize: fontMode === 'ghanshyam' ? '10.8pt' : '9.8pt',
              lineHeight: fontMode === 'ghanshyam' ? 1.48 : 1.55,
              textAlign: 'justify'
            }}
          >
            <p style={{ marginBottom: '5pt', textIndent: '20pt' }}>
              {toFont('અમો નીચે સહી કરનાર પંચો આજ રોજ તલાટી ')}
              <span>{toFont(general.talatiMoje || general.moje || '')}</span>
              {toFont(' તા. ')}
              <span>{toFont(general.taluka || '')}</span>
              {toFont(' રૂબરૂ હાજર થઈ લખાવીએ છીએ કે, અમો અરજદાર તથા તેમના કુટુંબીજનોને અને વારસદારોને સારી રીતે ઓળખીએ છીએ. અરજદારનો જવાબ અમારી રૂબરૂ લેવામાં આવ્યો છે. જેમાં તેમણે પાના નં.૧ ઉપર લખાવેલ પેઢીનામાની ખાત્રી કરતાં તેમાં દર્શાવેલ કુલ ')}
              <span>{toFont(totalHeirs.gujaratiDigits)}</span>
              {toFont(' (')}
              <span>{toFont(totalHeirs.gujaratiWords)}</span>
              {toFont(') હયાત વારસદારો છે. જેમાં કોઈ કાયદેસરના વારસદારો લખાવવાના રહી જતાં નથી. અને તેમાં કોઈ ખોટા વારસદારો દર્શાવેલા નથી. તેની અમો ખાત્રી આપીએ છીએ. ખોટું પેઢીનામું લખાવવું ફોજદારી ગુન્હો બને છે. જેની અમોને સમજ છે.')}
            </p>
            <p style={{ marginBottom: '5pt', textIndent: '20pt' }}>
              {toFont(PEDHINAMU_STATIC_TEXT.page2Decl2)}
            </p>
            <p style={{ marginBottom: '6pt', textIndent: '20pt' }}>
              {toFont(PEDHINAMU_STATIC_TEXT.page2Decl3)}
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
            <div style={{ fontSize: fontMode === 'ghanshyam' ? '12pt' : '11pt', lineHeight: 1.9, minWidth: '110pt' }}>
              <div>{fmt(`સ્થળ : ${general.place || ''}`)}</div>
              <div>{fmt(`તારીખ : ${general.currentDate || ''}`)}</div>
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
            <div style={{ fontSize: fontMode === 'ghanshyam' ? '11.5pt' : '10.5pt', lineHeight: 2.1, minWidth: '220pt' }}>
              {[
                { label: 'પંચ-૧', showSahi: true },
                { label: 'પંચ-૨', showSahi: false },
                { label: 'પંચ-૩', showSahi: false }
              ].map((row, rIdx) => (
                <div key={`panch-sign-${rIdx}`} style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '36pt', flexShrink: 0 }}>
                    {row.showSahi ? toFont('સહિ') : ''}
                  </span>
                  <span style={{ width: '48pt', flexShrink: 0 }}>
                    {toFont(row.label)}
                  </span>
                  <span style={{ letterSpacing: '1px' }}>
                    {PEDHINAMU_STATIC_TEXT.signatureDottedLine.slice(0, 26)}
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
            {PEDHINAMU_STATIC_TEXT.bulletNotes.map((note, nIdx) => (
              <div key={`note-${nIdx}`} style={{ display: 'flex', marginBottom: '2pt' }}>
                <span style={{ marginRight: '6pt' }}>•</span>
                <span>{fmt(formatDecl1(note))}</span>
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
