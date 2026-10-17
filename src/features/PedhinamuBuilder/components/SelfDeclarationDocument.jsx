import React, { forwardRef } from 'react';
import { extractAliveHeirs, getHeirsSummary } from '../utils/heirsExtractor';
import { toGujaratiNumber } from '../utils/gujaratiNumbers';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';

const ROMAN_NUMERALS = ['(I)', '(II)', '(III)', '(IV)', '(V)', '(VI)', '(VII)', '(VIII)', '(IX)', '(X)', '(XI)', '(XII)', '(XIII)', '(XIV)', '(XV)'];

const SelfDeclarationDocument = forwardRef(function SelfDeclarationDocument(
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
  const applicantAge = toGujaratiNumber(applicant.age || '૩૬');
  const caste = applicant.caste || 'હિન્દુ';
  const occupation = applicant.occupation || 'વેપાર';
  const applicantAddress = applicant.address || 'બી-૨૮ દાનેવ આશિષ સોસાયટી, કતારગામ સુરતના.';

  const rawDeceasedName = (deceased.name || '').trim();
  const deceasedNameWithSwa = rawDeceasedName.startsWith('સ્વ.')
    ? rawDeceasedName
    : `સ્વ. ${rawDeceasedName || 'ધીરૂભાઈ લાખાભાઈ ઘોઘારી'}`;

  const deathDate = deceased.deathDate || '૦૩-૦૬-૨૦૨૦';
  const deathPlace = deceased.deathPlace || 'સુરત';

  const district = general.district || 'સુરત';
  const taluka = general.taluka || 'કતારગામ';
  const moje = general.moje || general.talatiMoje || 'કતારગામ';
  const place = general.place || 'સુરત';
  const applicationDate = general.applicationDate || general.currentDate || '';

  const selfDeclaration = data.selfDeclaration || {};
  let properties = selfDeclaration.properties;
  if (!properties || !Array.isArray(properties) || properties.length === 0) {
    const fallbackDistrict =
      applicant.propertyDistrict || general.propertyDistrict || general.district || 'સુરત';
    const fallbackTaluka =
      applicant.propertyTaluka || general.propertyTaluka || general.taluka || 'કતારગામ';
    const fallbackMoje =
      applicant.propertyMoje || general.propertyMoje || general.moje || general.talatiMoje || 'કતારગામ';
    const fallbackDetails =
      applicant.propertyDetails ||
      general.propertyDetails ||
      'દાનેવ આશિષ સોસાયટીમાં આવેલ મકાન નં. ૨૮';

    properties = [
      {
        district: fallbackDistrict,
        taluka: fallbackTaluka,
        moje: fallbackMoje,
        details: fallbackDetails
      }
    ];
  }

  const heirs = extractAliveHeirs(tree);
  const heirsSummary = getHeirsSummary(heirs);

  return (
    <div
      ref={ref}
      className={`self-declaration-doc print-document-sheet ${fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}`}
      style={{
        width: '794px',
        minHeight: '1123px',
        padding: '40px 55px 30px 55px',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: docFontFamily,
        fontSize: '20px',
        lineHeight: '1.4',
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
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            color: '#000000',
            display: 'inline-block'
          }}
        >
          <span style={{ fontFamily: dynamicFontFamily }}>{toFont('-:: સ્વ-ઘોષણા')}</span>
          {' '}
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '24px', fontWeight: 700 }}>
            (Self-Declaration)
          </span>
          {' '}
          <span style={{ fontFamily: dynamicFontFamily }}>{toFont('::-')}</span>
        </h2>
      </div>

      {/* Paragraph 1 */}
      <p style={{ margin: '0 0 6px 0', textAlign: 'justify', textIndent: '28px', lineHeight: '1.4', fontSize: '20px' }}>
        {toFont('આથી અમો નીચે સહી કરનાર')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(applicantName)}</strong>
        <span style={{ whiteSpace: 'nowrap' }}>{toFont(', ઉ.આ.વ. :-')}</span>{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(applicantAge)}</strong>
        <span style={{ whiteSpace: 'nowrap' }}>{toFont(', જાતના :-')}</span>{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(caste)}</strong>
        <span style={{ whiteSpace: 'nowrap' }}>{toFont(', ધંધો :')}</span>{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(occupation)}</strong>
        <span style={{ whiteSpace: 'nowrap' }}>{toFont(', રહેવાસી :-')}</span>{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(applicantAddress)}</strong>{' '}
        {toFont('અમારા ધર્મના સોગંદ ઉપર આજરોજ')}{' '}
        <span style={{ whiteSpace: 'nowrap' }}>{toFont('જાહેર કરીએ છીએ કે :-')}</span>
      </p>

      {/* Paragraph 2 */}
      <p style={{ margin: '0 0 6px 0', textAlign: 'justify', textIndent: '28px', lineHeight: '1.4', fontSize: '20px' }}>
        {toFont('મારા પિતા નામે')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deceasedNameWithSwa)}</strong>{' '}
        <span style={{ whiteSpace: 'nowrap' }}>{toFont('નું અવસાન તા.')}</span>{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deathDate)}</strong>{' '}
        <span style={{ whiteSpace: 'nowrap' }}>{toFont('ના રોજ')}</span>{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deathPlace)}</strong>{' '}
        {toFont('મુકામે અવસાન થયેલ છે, અને તેમના સીધીલીટીના વારસદારો')}{' '}
        <span style={{ whiteSpace: 'nowrap' }}>{toFont('નીચે મુજબ છે.')}</span>
      </p>

      {/* Heading before table */}
      <div style={{ textAlign: 'center', margin: '4px 0 6px 0', fontWeight: 600, fontSize: '20px' }}>
        {toFont('પિતા નામે')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deceasedNameWithSwa)}</strong>{' '}
        {toFont('ના વારસદારો :-')}
      </div>

      {/* Heirs Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          margin: '0 0 6px 0',
          fontSize: '20px',
          border: '1px solid #000000'
        }}
      >
        <thead className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}>
          <tr style={{ backgroundColor: '#ffffff' }}>
            <th
              className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}
              style={{ border: '1px solid #000000', padding: '3px 4px', width: '8%', textAlign: 'center', fontWeight: 700, fontFamily: dynamicFontFamily, fontSize: '20px' }}
            >
              {toFont('ક્રમ')}
            </th>
            <th
              className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}
              style={{ border: '1px solid #000000', padding: '3px 8px', width: '62%', textAlign: 'center', fontWeight: 700, fontFamily: dynamicFontFamily, fontSize: '20px' }}
            >
              {toFont('નામ')}
            </th>
            <th
              className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}
              style={{ border: '1px solid #000000', padding: '3px 4px', width: '14%', textAlign: 'center', fontWeight: 700, fontFamily: dynamicFontFamily, fontSize: '20px' }}
            >
              {toFont('ઉંમર')}
            </th>
            <th
              className={fontMode === 'ghanshyam' ? 'font-ghanshyam' : ''}
              style={{ border: '1px solid #000000', padding: '3px 4px', width: '16%', textAlign: 'center', fontWeight: 700, fontFamily: dynamicFontFamily, fontSize: '20px' }}
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
                  style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'center', fontFamily: docFontFamily, fontSize: '20px' }}
                >
                  {toFont(heir.srNoGujarati)}
                </td>
                <td
                  className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}
                  style={{ border: '1px solid #000000', padding: '2px 8px', textAlign: 'left', fontFamily: docFontFamily, fontSize: '20px' }}
                >
                  {toFont(heir.name)}
                </td>
                <td
                  className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}
                  style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'center', fontFamily: docFontFamily, fontSize: '20px' }}
                >
                  {toFont(heir.ageGujarati)}
                </td>
                <td
                  className={fontMode === 'ghanshyam' ? 'font-nilkanth' : ''}
                  style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'center', fontFamily: docFontFamily, fontSize: '20px' }}
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
                style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center', color: '#64748b', fontFamily: docFontFamily, fontSize: '20px' }}
              >
                {toFont('કોઈ વારસદાર ઉમેરાયેલ નથી (કૃપા કરીને કુટુંબ વૃક્ષમાં સભ્યો ઉમેરો)')}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Paragraph 3 */}
      <p style={{ margin: '0 0 6px 0', textAlign: 'justify', textIndent: '28px', lineHeight: '1.4', fontSize: '20px' }}>
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deceasedNameWithSwa)}</strong>{' '}
        {toFont('ના ઉપરોક્ત વારસદારો સિવાય અન્ય કોઈ વારસદાર નથી અને જે અંગેની ખરાઈ માટે આ સ્વ-ઘોષણા કરવામાં આવેલ છે.')}
      </p>

      {/* Paragraph 4 */}
      <p style={{ margin: '0 0 6px 0', textAlign: 'justify', textIndent: '28px', lineHeight: '1.4', fontSize: '20px' }}>
        {toFont('ઉપર મુજબ પેઢીનામાનું સ્વ-ઘોષણા મારા લખાવ્યા મુજબનું છે, જેમાં બતાવેલ')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(deceasedNameWithSwa)}</strong>{' '}
        {toFont('ના કુલ હયાત')}{' '}
        <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>
          {fontMode === 'ghanshyam' ? (
            <span>{`${toFont(heirsSummary.gujaratiDigits)} { ${toFont(heirsSummary.gujaratiWords)} }`}</span>
          ) : (
            heirsSummary.combinedText
          )}
        </strong>{' '}
        {toFont('વારસદારો છે. અને આ સિવાય અન્ય બીજા કોઈ વારસદારો દર્શાવાના બાકી રહેતા નથી, છતાં ભવિષ્યમાં કોઈ વારસદાર ઉપસ્થિત થાય કે ઉપર પેઢીનામામાં બતાવેલ વારસદારોમાંથી કોઈ ખોટો વારસદાર સાબિત થાય તો તેની તમામ જવાબદારી મારી રહેશે.')}
      </p>

      {/* Sections: (I), (II), (III)... */}
      {properties.map((prop, idx) => {
        const roman = ROMAN_NUMERALS[idx] || `(${idx + 1})`;
        const pDistrict = prop.district || '';
        const pTaluka = prop.taluka || '';
        const pMoje = prop.mojeVillage || prop.moje || '';
        const rawDetails = (prop.details || '').trim();
        const cleanDetails = rawDetails
          .replace(/\s*માં\s*વારસાઈ\s*કરવા\s*માટે\s*કરેલ\s*છે\.?$/g, '')
          .trim();

        return (
          <div
            key={idx}
            style={{
              margin: '0 0 6px 0',
              textAlign: 'justify',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
              lineHeight: '1.4',
              fontSize: '20px'
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: '20px',
                minWidth: '28px',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {roman}
            </div>
            <div style={{ flex: 1, fontSize: '20px', lineHeight: '1.4' }}>
              {toFont('સદરહું સ્વ-ઘોષણા')}{' '}
              <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>
                {toFont(`ડીસ્ટ્રીકટ : ${pDistrict}, સબ ડિસ્ટ્રીકટ : ${pTaluka}ના મોજે ગામ : ${pMoje}`)}
              </strong>{' '}
              {toFont('ખાતે આવેલ')}{' '}
              <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(cleanDetails)}</strong>{' '}
              {toFont('માં વારસાઈ કરવા માટે કરેલ છે.')}
            </div>
          </div>
        );
      })}

      {/* Penal warning */}
      <p style={{ margin: '0 0 8px 0', textAlign: 'justify', lineHeight: '1.4', fontSize: '20px' }}>
        {toFont('ખોટું સ્વ-ઘોષણા કરવુ, કરાવવુ કે લખાવવુ ફોજદારી ગુનો બને છે, જેની મને ખબર છે.')}
      </p>

      {/* Footer layout */}
      <div style={{ marginTop: '70px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '20px' }}>
        <div style={{ lineHeight: '1.35', fontSize: '20px' }}>
          <div>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block', marginRight: '12px' }}>{toFont('સ્થળ :')}</span>
            <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(place)}</strong>
          </div>
          <div>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block', marginRight: '12px' }}>{toFont('તારીખ :')}</span>
            <strong style={{ fontWeight: 700, fontFamily: dynamicFontFamily }}>{toFont(applicationDate)}</strong>
          </div>
        </div>

        <div style={{ textAlign: 'center', minWidth: '240px' }}>
          <div style={{ fontSize: '18px', letterSpacing: '1px', color: '#000000', marginBottom: '4px' }}>
            ..................................................
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {fontMode === 'ghanshyam' ? (
              <span>{`{ ${toFont('સ્વ-ઘોષણા કરનારની સહી')} }`}</span>
            ) : (
              '(સ્વ-ઘોષણા કરનારની સહી)'
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default SelfDeclarationDocument;
