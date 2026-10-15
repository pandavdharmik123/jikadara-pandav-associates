import React, { forwardRef } from 'react';
import { extractAliveHeirs, getHeirsSummary } from '../utils/heirsExtractor';
import { toGujaratiNumber } from '../utils/gujaratiNumbers';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';

const ApplicationDocument = forwardRef(function ApplicationDocument(
  { data = {}, scale = 1, fontMode = 'ghanshyam' },
  ref
) {
  const { applicant = {}, deceased = {}, general = {}, tree = {} } = data;

  const toFont = (text) => {
    if (!text) return '';
    const str = String(text);
    if (fontMode !== 'ghanshyam') return str;
    if (str === '(') return '{';
    if (str === ')') return '}';
    if (/[\u0A80-\u0AFF]/.test(str)) {
      return convertUnicodeToGhanshyamLegacy(str);
    }
    return str;
  };

  const docFontFamily = fontMode === 'ghanshyam'
    ? "'Nilkanth', sans-serif"
    : "'Anek Gujarati', 'Noto Sans Gujarati', 'Shruti', system-ui, sans-serif";

  const dynamicFontFamily = fontMode === 'ghanshyam'
    ? "'Ghanshyam', sans-serif"
    : "'Anek Gujarati', 'Noto Sans Gujarati', 'Shruti', system-ui, sans-serif";

  const rawAppName = (applicant.name || '').trim();
  const applicantName = rawAppName.startsWith('શ્રી') ? rawAppName : `શ્રી ${rawAppName || 'ઘોઘારી અનિલકુમાર ધીરૂભાઈ'}`;
  const applicantAddress = applicant.address || 'બી-૨૮ દાનેવ આશિષ સોસાયટી, કતારગામ સુરત.';

  const rawDeceasedName = (deceased.name || '').trim();
  const deceasedNameWithSwa = rawDeceasedName.startsWith('સ્વ.')
    ? rawDeceasedName
    : `સ્વ. ${rawDeceasedName || 'ધીરૂભાઈ લાખાભાઈ ઘોઘારી'}`;

  const deathDate = deceased.deathDate || '૦૩-૦૬-૨૦૨૦';
  const deathPlace = deceased.deathPlace || 'સુરત';

  const district = general.district || 'સુરત';
  const taluka = general.taluka || 'કતારગામ';
  const place = general.place || 'સુરત';
  const applicationDate = general.applicationDate || general.currentDate || '';

  const heirs = extractAliveHeirs(tree);
  const heirsSummary = getHeirsSummary(heirs);

  return (
    <div
      ref={ref}
      className={`application-doc print-document-sheet ${fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}`}
      style={{
        width: '794px',
        minHeight: '1123px',
        height: '1123px',
        maxHeight: '1123px',
        padding: '80px 120px',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: docFontFamily,
        fontSize: fontMode === 'ghanshyam' ? '14px' : '13px',
        lineHeight: '1.45',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'geometricPrecision',
        boxSizing: 'border-box',
        position: 'relative',
        margin: '0 auto',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        borderRadius: '2px',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Header: Applicant Block (Starts from the second half of the page only, 2-column key-value table) */}
      <div style={{ width: '50%', marginLeft: '50%', marginBottom: '8px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: 'none',
            fontSize: fontMode === 'ghanshyam' ? '13.5px' : '12.5px',
            lineHeight: '1.35',
            margin: 0
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  verticalAlign: 'top',
                  whiteSpace: 'nowrap',
                  padding: '0 6px 3px 0',
                  border: 'none',
                  width: '1%'
                }}
              >
                <strong style={{ fontWeight: 700 }}>{toFont('અરજદાર:-')}</strong>
              </td>
              <td style={{ verticalAlign: 'top', padding: '0 0 3px 0', border: 'none' }}>
                <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(applicantName)},</strong>
              </td>
            </tr>
            <tr>
              <td
                style={{
                  verticalAlign: 'top',
                  whiteSpace: 'nowrap',
                  padding: '0 6px 3px 0',
                  border: 'none',
                  width: '1%'
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>{toFont('રહેવાસી :-')}</span>
              </td>
              <td style={{ verticalAlign: 'top', padding: '0 0 3px 0', border: 'none' }}>
                <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(applicantAddress)}</strong>
              </td>
            </tr>
            <tr>
              <td
                style={{
                  verticalAlign: 'top',
                  whiteSpace: 'nowrap',
                  padding: '0 12px 0 0',
                  border: 'none',
                  width: '1%'
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>{toFont('તારીખ :')}</span>
              </td>
              <td style={{ verticalAlign: 'top', padding: '0', border: 'none' }}>
                {applicationDate ? (
                  <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(applicationDate)}</strong>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recipient Block (Left-aligned) */}
      <div style={{ marginBottom: '6px', lineHeight: '1.35', fontSize: fontMode === 'ghanshyam' ? '13.5px' : '12.5px' }}>
        <div style={{ fontWeight: 700 }}>
          {toFont('પ્રતિ,')}
        </div>
        <div>{toFont('તલાટી કમ મંત્રીશ્રી,')}</div>
        <div style={{ fontFamily: dynamicFontFamily }}>{toFont(`${taluka},`)}</div>
        <div style={{ fontFamily: dynamicFontFamily }}>{toFont(`${district}.`)}</div>
      </div>

      {/* Subject Line (Centered) */}
      <div style={{ textAlign: 'center', margin: '4px 0 6px 0' }}>
        <h3
          style={{
            margin: 0,
            fontSize: fontMode === 'ghanshyam' ? '15.5px' : '14.5px',
            fontWeight: 800,
            display: 'inline-block',
            textDecoration: 'underline',
            paddingBottom: '1px',
            fontFamily: dynamicFontFamily
          }}
        >
          {toFont('વિષય:- પેઢીનામું કરી આપવા બાબત.')}
        </h3>
      </div>

      {/* Salutation */}
      <div style={{ marginBottom: '3px', fontWeight: 600 }}>{toFont('મે. સાહેબ,')}</div>

      {/* Intro */}
      <p style={{ margin: '0 0 4px 0', textIndent: '28px', lineHeight: '1.45' }}>
        {toFont('હમો અરજદારની માનસર અરજ છે કે...')}
      </p>

      {/* Paragraph 1 */}
      <p style={{ margin: '0 0 6px 0', textAlign: 'justify', textIndent: '28px', lineHeight: '1.45' }}>
        {toFont('મારા પિતા નામે')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deceasedNameWithSwa)}</strong>{' '}
        <span style={{ whiteSpace: 'nowrap' }}>{toFont('નું અવસાન તા.')}</span>{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deathDate)}</strong>{' '}
        <span style={{ whiteSpace: 'nowrap' }}>{toFont('ના રોજ')}</span>{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deathPlace)}</strong>{' '}
        {toFont('બિનવસિયતે અવસાન થયેલ છે, અને તેમના સીધીલીટીના વારસદારો તરીકે.')}
      </p>

      {/* Heirs Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          margin: '0 0 6px 0',
          fontSize: fontMode === 'ghanshyam' ? '12.5px' : '11.5px',
          border: '1px solid #000000'
        }}
      >
        <thead className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}>
          <tr style={{ backgroundColor: '#ffffff' }}>
            <th
              className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}
              style={{ border: '1px solid #000000', padding: '3px 4px', width: '8%', textAlign: 'center', fontWeight: 700, fontFamily: dynamicFontFamily }}
            >
              {toFont('ક્રમ')}
            </th>
            <th
              className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}
              style={{ border: '1px solid #000000', padding: '3px 8px', width: '62%', textAlign: 'center', fontWeight: 700, fontFamily: dynamicFontFamily }}
            >
              {toFont('નામ')}
            </th>
            <th
              className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}
              style={{ border: '1px solid #000000', padding: '3px 4px', width: '14%', textAlign: 'center', fontWeight: 700, fontFamily: dynamicFontFamily }}
            >
              {toFont('ઉંમર')}
            </th>
            <th
              className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}
              style={{ border: '1px solid #000000', padding: '3px 4px', width: '16%', textAlign: 'center', fontWeight: 700, fontFamily: dynamicFontFamily }}
            >
              {toFont('સબંધ')}
            </th>
          </tr>
        </thead>
        <tbody className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}>
          {heirs && heirs.length > 0 ? (
            heirs.map((heir) => (
              <tr key={heir.id || heir.srNo} className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}>
                <td
                  className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}
                  style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'center', fontFamily: docFontFamily }}
                >
                  {toFont(heir.srNoGujarati)}
                </td>
                <td
                  className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}
                  style={{ border: '1px solid #000000', padding: '2px 8px', textAlign: 'left', fontFamily: docFontFamily }}
                >
                  {toFont(heir.name)}
                </td>
                <td
                  className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}
                  style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'center', fontFamily: docFontFamily }}
                >
                  {toFont(heir.ageGujarati)}
                </td>
                <td
                  className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}
                  style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'center', fontFamily: docFontFamily }}
                >
                  {toFont(heir.relationship)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}
                style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center', color: '#64748b', fontFamily: docFontFamily }}
              >
                {toFont('કોઈ વારસદાર ઉમેરાયેલ નથી (કૃપા કરીને કુટુંબ વૃક્ષમાં સભ્યો ઉમેરો)')}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Paragraph 2 */}
      <p style={{ margin: '0 0 6px 0', textAlign: 'justify', textIndent: '28px', lineHeight: '1.45' }}>
        {toFont('હમો અરજદારના')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deceasedNameWithSwa)}</strong>{' '}
        {toFont('ના હાલ હયાત')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>
          {fontMode === 'ghanshyam' ? (
            <span>{`${toFont(heirsSummary.gujaratiDigits)} { ${toFont(heirsSummary.gujaratiWords)} }`}</span>
          ) : (
            heirsSummary.combinedText
          )}
        </strong>{' '}
        {toFont('સીધીલીટીના વારસદારો છીએ, તે સિવાય બીજા અન્ય કોઈ વારસદારો દર્શાવાના બાકી રહેતા નથી, છતાં ભવિષ્યમાં કોઈ વારસદાર ઉપસ્થિત થાય કે ઉપરોક્ત બતાવેલ વારસદારોમાંથી કોઈ ખોટો વારસદાર સાબિત થાય તો તેની તમામ જવાબદારી મારી રહેશે. અને આ સાથે હમોના પિતા નામે')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deceasedNameWithSwa)}</strong>{' '}
        {toFont('ના સીધીલીટીના વારસદારોની વિગત દર્શાવતુ સ્વ-ઘોષણા તેમજ જરૂરી પુરાવા રજુ કરેલ છે,')}
      </p>

      {/* Paragraph 3 */}
      <p style={{ margin: '0 0 8px 0', textAlign: 'justify', textIndent: '28px', lineHeight: '1.45' }}>
        {toFont('હમો અરજદારના પિતા નામે')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deceasedNameWithSwa)}</strong>{' '}
        {toFont('ના સીધીલીટીના વારસદારોની વિગત તેમજ રજુ કરેલ પુરાવાના આધારે હમોને મારા પિતા નું અવસાન થતા વારસાઈ કરવા માટે જરૂરી હોય જેથી પેઢીનામું કરી આપવા હમો અરજદારની નમ્રતા પુર્વકની અરજ છે.')}
      </p>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ lineHeight: '1.3', fontSize: fontMode === 'ghanshyam' ? '13px' : '12px' }}>
          <div>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block', marginRight: '12px' }}>{toFont('સ્થળ :')}</span>
            <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(place)}.</strong>
          </div>
          <div>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block', marginRight: '12px' }}>{toFont('તારીખ :')}</span>
            {applicationDate ? (
              <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(applicationDate)}</strong>
            ) : null}
          </div>
        </div>

        <div style={{ textAlign: 'center', minWidth: '220px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '1px', color: '#000000', whiteSpace: 'nowrap' }}>
            {fontMode === 'ghanshyam' ? 'sh) ............................................' : 'સહી ............................................'}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ApplicationDocument;
