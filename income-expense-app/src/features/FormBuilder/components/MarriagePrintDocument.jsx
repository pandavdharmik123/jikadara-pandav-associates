import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';
import { formatMarriageDate } from '../constants/marriageData';

const L = (text) => convertUnicodeToGhanshyamLegacy(String(text ?? ''));

/** Static label text. */
function S({ children, bold = false, className = '' }) {
  return (
    <span className={`${bold ? 'mp-gh' : 'mp-nl'} ${className}`.trim()}>
      {L(children)}
    </span>
  );
}

/** Value typed by the user (already in legacy keystrokes, but convert if needed). */
function V({ children, bold = false, className = '' }) {
  return (
    <span className={`${bold ? 'mp-gh' : 'mp-nl'} ${className}`.trim()}>
      {L(children)}
    </span>
  );
}

function Page({ className = '', children }) {
  return <div className={`mp-page ${className}`.trim()}>{children}</div>;
}

function Item({ num, children }) {
  return (
    <div className="mp-item">
      <span className="mp-item-num mp-gh">{L(num)}</span>
      <div className="mp-item-body">{children}</div>
    </div>
  );
}

function SubLine({ letter, children, deep = false }) {
  return (
    <div className={`mp-sub-item${deep ? ' is-deep' : ''}`}>
      <span className="mp-sub-letter mp-nl">{L(letter)}</span>
      <div className="mp-sub-body">{children}</div>
    </div>
  );
}

function SubNote({ children }) {
  return (
    <div className="mp-sub-note">
      <S>{children}</S>
    </div>
  );
}

function ItemSub({ num, letter, children, first }) {
  return (
    <Item num={num}>
      <SubLine letter={letter}>{first}</SubLine>
      {children}
    </Item>
  );
}

function StatusRow({ value, options, trailing = null }) {
  return (
    <div className="mp-status-row">
      {options.map((option) => (
        <span className="mp-status-option" key={option.value}>
          <span className={`mp-box${value === option.value ? ' is-checked' : ''}`}>
            {value === option.value ? '✓' : ''}
          </span>
          <S>{option.gujarati}</S>
        </span>
      ))}
      {trailing ? <S>{trailing}</S> : null}
    </div>
  );
}

function SignatureLine({ label }) {
  return (
    <div className="mp-sub-item">
      <span className="mp-sub-letter" />
      <div className="mp-sub-body">
        <S>{label}</S>
      </div>
    </div>
  );
}

function Page1({ data }) {
  const app = data.application || {};
  const marriage = data.marriage || {};
  const marriageDate = formatMarriageDate(marriage.date, '-');
  const applicationDate = formatMarriageDate(app.date, '/');

  return (
    <Page className="mp-page-1">
      <div className="mp-mobile">
        <S bold>મો. </S>
        <V bold>{app.mobile}</V>
      </div>

      <div className="mp-center mp-sample-title">
        <S bold>નમૂનો-૧</S>
      </div>
      <div className="mp-center mp-sample-rule">
        <S>(જુઓ નિયમ નો પેટા નિયમ-(૧) )</S>
      </div>
      <div className="mp-center mp-page-title">
        <S bold>લગ્ન યાદી ભરીને મોકલવા માટેની અરજી</S>
      </div>

      <div className="mp-letter-head">
        <div><S>પ્રતિ,</S></div>
        <div><S>લગ્ન રજિસ્ટ્રાર સાહેબ,</S></div>
        <div className="mp-short-rule" />
        <div className="mp-short-rule" />
      </div>

      <div className="mp-center mp-subject">
        <S bold>વિષય :- લગ્ન નોંધણી.</S>
      </div>

      <div className="mp-salutation"><S>શ્રીમાન,</S></div>

      <p className="mp-para">
        <V bold>{marriageDate}</V>{' '}
        <S>ના રોજ</S>{' '}
        <V bold>{marriage.place}</V>{' '}
        <S>
          સ્થળે અમારું વિધિપૂર્વક લગ્ન કરવામાં આવ્યું છે. અમારા લગ્નની નીચેની વિગતો લગ્ન
          રજિસ્ટ્રારમાં દાખલ કરવા અને અમને લગ્ન નોંધણી પ્રમાણપત્ર કાઢી આપવા અમારી વિનંતી છે.
        </S>
      </p>

      <p className="mp-para mp-no-indent">
        <S>અમે, આથી જાહેર કરીએ છીએ કે,</S>
      </p>

      <div className="mp-list">
        <div className="mp-list-item">
          <span className="mp-list-num mp-gh">{L('૧.')}</span>
          <div className="mp-list-body">
            <S>
              અમારું લગ્ન કાયદેસર વિધિપૂર્વક કરવામાં આવ્યું હતું અને લગ્ન નોંધણી અધિનિયમ, ૨૦૦૬
              (સન ૨૦૦૬ ના ગુજરાત અધિનિયમ ક્રમાંક-૧૬) ની કલમ-૧૧ હેઠળ નોંધણી માટે સક્ષમ છે.
            </S>
          </div>
        </div>
        <div className="mp-list-item">
          <span className="mp-list-num mp-gh">{L('૨.')}</span>
          <div className="mp-list-body">
            <S>અંગત લગ્ન અધિનિયમમાં મુકવામાં આવેલી શરતોનું પાલન કરવામાં આવ્યું છે.</S>
          </div>
        </div>
        <div className="mp-list-item">
          <span className="mp-list-num mp-gh">{L('૩.')}</span>
          <div className="mp-list-body">
            <S>
              અરજમાં આપવામાં આવેલી વિગતો અમારી ઉત્તમ જાણ અને માન્યતા પ્રમાણે ખરી છે, અને
            </S>
          </div>
        </div>
        <div className="mp-list-item">
          <span className="mp-list-num mp-gh">{L('૪.')}</span>
          <div className="mp-list-body">
            <S>
              આ સાથે, ઠરાવેલી ફી અને દસ્તાવેજો સહિત લગ્નની યાદી, યોગ્ય રીતે ભરીને (બે નકલમાં)
              જોડેલ છે.
            </S>
          </div>
        </div>
      </div>

      <div className="mp-sign-grid">
        <div className="mp-sign-cell">
          <S>સ્થળ : </S>
          <V>{app.place}</V>
        </div>
        <div className="mp-sign-cell">
          <S>સહી : </S>
          <span className="mp-rule mp-sign-rule" />
          <S>(પતિ)</S>
        </div>
        <div className="mp-sign-cell">
          <S>તારીખ : </S>
          <V>{applicationDate}</V>
        </div>
        <div className="mp-sign-cell">
          <S>સહી : </S>
          <span className="mp-rule mp-sign-rule" />
          <S>(પત્ની)</S>
        </div>
      </div>

      <div className="mp-enclosure">
        <div><S>બિડાણ : (૧) લગ્ન યાદી (બે નકલમાં)</S></div>
        <div className="mp-enclosure-sub"><S>(૨) ઠરાવેલી ફી</S></div>
        <div className="mp-enclosure-sub"><S>(૩) બીજા દસ્તાવેજો</S></div>
        <div className="mp-doc-line"><S>(ક)</S><span className="mp-rule mp-doc-rule" /></div>
        <div className="mp-doc-line"><S>(ખ)</S><span className="mp-rule mp-doc-rule" /></div>
        <div className="mp-doc-line"><S>(ગ)</S><span className="mp-rule mp-doc-rule" /></div>
      </div>
    </Page>
  );
}

function Page2({ data }) {
  const marriage = data.marriage || {};
  const groom = data.groom || {};
  const bride = data.bride || {};
  const marriageDate = formatMarriageDate(marriage.date, '-');

  const groomTrailing =
    'પરિણીત અને અમે હાલ તો કેટલી પત્ની હયાત છે?';

  return (
    <Page className="mp-page-2">
      <div className="mp-center mp-doc-title">
        <S bold>લગ્ન નોંધણી યાદી</S>
      </div>
      <div className="mp-center mp-doc-subtitle">
        <S>(ગુજરાત લગ્ન નોંધણી અધિનિયમ ૨૦૦૬ની કલમ-૫)</S>
      </div>

      <div className="mp-items">
        <Item num="૧.">
          <S>લગ્નની તારીખ : </S>
          <V bold>{marriageDate}</V>
        </Item>

        <Item num="૨.">
          <S>લગ્નનું સ્થળ : </S>
          <V bold>{marriage.place}</V>

          <SubLine letter="(ક)">
            <S>વરરાજાનું પૂરું નામ : </S>
            <V bold>{groom.name}</V>
          </SubLine>
          <SubLine letter="(ખ)">
            <S>તેની ઉંમર : </S>
            <V>{groom.age}</V>
            <S>, જન્મ તારીખ : </S>
            <V>{formatMarriageDate(groom.dob, '-')}</V>
          </SubLine>
          <SubNote>
            (જન્મ નોંધણી પ્રમાણપત્ર કે શાળા છોડ્યાના પ્રમાણપત્રની ખરી નકલ જોડવી)
          </SubNote>
          <SubLine letter="(ગ)">
            <S>ધર્મ : </S>
            <V>{groom.religion}</V>
          </SubLine>
          <SubLine letter="(ઘ)">
            <S>રહેઠાણનું સામાન્ય સ્થળ : </S>
            <V>{groom.residence}</V>
          </SubLine>
          <SubLine letter="(ચ)">
            <S>સરનામું : </S>
            <V>{groom.address}</V>
          </SubLine>
          <SubLine letter="(છ)">
            <S>
              લગ્ન સમયે વરરાજાને દરજ્જે. (જે લાગુ પડતું હોય ત્યાં ✓ ની નિશાની કરવી)
            </S>
          </SubLine>
          <StatusRow
            value={groom.maritalStatus}
            options={[
              { value: 'UNMARRIED', gujarati: 'અપરિણીત' },
              { value: 'WIDOWER', gujarati: 'વિધુર' },
              { value: 'DIVORCED', gujarati: 'છૂટાછેડા થયેલ' },
            ]}
            trailing={groomTrailing}
          />
          <SignatureLine label="(જ) તારીખ સાથે વરરાજાની સહી :" />
        </Item>

        <ItemSub
          num="૪."
          letter="(ક)"
          first={(
            <>
              <S>કન્યાનું પૂરું નામ : </S>
              <V bold>{bride.name}</V>
            </>
          )}
        >
          <SubLine letter="(ખ)">
            <S>તેની ઉંમર : </S>
            <V>{bride.age}</V>
            <S>, જન્મ તારીખ : </S>
            <V>{formatMarriageDate(bride.dob, '-')}</V>
          </SubLine>
          <SubNote>
            (જન્મ નોંધણી પ્રમાણપત્ર કે શાળા છોડ્યાના પ્રમાણપત્રની ખરી નકલ જોડવી)
          </SubNote>
          <SubLine letter="(ગ)">
            <S>ધર્મ : </S>
            <V>{bride.religion}</V>
          </SubLine>
          <SubLine letter="(ઘ)">
            <S>રહેઠાણનું સામાન્ય સ્થળ : </S>
            <V>{bride.residence}</V>
          </SubLine>
          <SubLine letter="(ચ)">
            <S>સરનામું : </S>
            <V>{bride.address}</V>
          </SubLine>
          <SubLine letter="(છ)">
            <S>
              લગ્ન સમયે કન્યાનો દરજ્જો. (જે લાગુ પડતું હોય ત્યાં ✓ ની નિશાની કરવી)
            </S>
          </SubLine>
          <StatusRow
            value={bride.maritalStatus}
            options={[
              { value: 'UNMARRIED', gujarati: 'અપરિણીત' },
              { value: 'WIDOW', gujarati: 'વિધવા' },
              { value: 'DIVORCED', gujarati: 'છૂટાછેડા થયેલ' },
            ]}
          />
          <SignatureLine label="(જ) તારીખ સાથે કન્યાની સહી :" />
        </ItemSub>

        <ItemSub
          num="૫."
          letter="(ક)"
          first={(
            <>
              <S>વરના પિતા અથવા માતા અથવા વાલીનું પૂરું નામ : </S>
              <V>{groom.parentName}</V>
            </>
          )}
        >
          <SubLine letter="(ખ)">
            <S>ઉંમર : </S>
            <V>{groom.parentAge}</V>
          </SubLine>
          <SubLine letter="(ગ)">
            <S>રહેઠાણનું સામાન્ય સ્થળ : </S>
            <V>{groom.parentResidence}</V>
          </SubLine>
          <SubLine letter="(ઘ)">
            <S>સરનામું : </S>
            <V>{groom.parentAddress}</V>
          </SubLine>
        </ItemSub>
      </div>
    </Page>
  );
}

function Page3({ data }) {
  const bride = data.bride || {};
  const officiant = data.officiant || {};
  const witnesses = data.witnesses || [];
  const witness1 = witnesses[0] || {};
  const witness2 = witnesses[1] || {};

  return (
    <Page className="mp-page-3">
      <div className="mp-items mp-page-3-items">
        <ItemSub
          num="૬."
          letter="(ક)"
          first={(
            <>
              <S>કન્યાના પિતા અથવા માતા અથવા વાલીનું પૂરું નામ : </S>
              <V>{bride.parentName}</V>
            </>
          )}
        >
          <SubLine letter="(ખ)">
            <S>ઉંમર : </S>
            <V>{bride.parentAge}</V>
          </SubLine>
          <SubLine letter="(ગ)">
            <S>રહેઠાણનું સામાન્ય સ્થળ : </S>
            <V>{bride.parentResidence}</V>
          </SubLine>
          <SubLine letter="(ઘ)">
            <S>સરનામું : </S>
            <V>{bride.parentAddress}</V>
          </SubLine>
        </ItemSub>

        <ItemSub
          num="૭."
          letter="(ક)"
          first={(
            <>
              <S>વિધિ કરાવનારનું પૂરું નામ : </S>
              <V>{officiant.name}</V>
            </>
          )}
        >
          <SubLine letter="(ખ)">
            <S>ઉંમર : </S>
            <V>{officiant.age}</V>
          </SubLine>
          <SubLine letter="(ગ)">
            <S>રહેઠાણનું સામાન્ય સ્થળ : </S>
            <V>{officiant.residence}</V>
          </SubLine>
          <SubLine letter="(ઘ)">
            <S>સરનામું : </S>
            <V>{officiant.address}</V>
          </SubLine>
          <SignatureLine label="(ચ) તારીખ સાથે વિધિ કરાવનારની સહી :" />
        </ItemSub>

        <ItemSub
          num="૮."
          letter="(૧)"
          first={(
            <>
              <S>(ક) પ્રથમ સાક્ષીનું પૂરું નામ : </S>
              <V>{witness1.name}</V>
            </>
          )}
        >
          <SubLine letter="(ખ)" deep>
            <S>ઉંમર : </S>
            <V>{witness1.age}</V>
          </SubLine>
          <SubLine letter="(ગ)" deep>
            <S>સરનામું : </S>
            <V>{witness1.address}</V>
          </SubLine>
          <SignatureLine label="(ઘ) તારીખ સાથે સહી :" />
          <div className="mp-witness-gap" />
          <SubLine letter="(૨)">
            <S>(ક) બીજા સાક્ષીનું પૂરું નામ : </S>
            <V>{witness2.name}</V>
          </SubLine>
          <SubLine letter="(ખ)" deep>
            <S>ઉંમર : </S>
            <V>{witness2.age}</V>
          </SubLine>
          <SubLine letter="(ગ)" deep>
            <S>સરનામું : </S>
            <V>{witness2.address}</V>
          </SubLine>
          <SignatureLine label="(ઘ) તારીખ સાથે સહી :" />
        </ItemSub>
      </div>

      <div className="mp-certificate">
        <p>
          <S bold>લગ્ન નોંધણી યાદી અને રૂ.</S>
          <span className="mp-blank mp-blank-md" />
          <S bold>ની ફી તા.</S>
          <span className="mp-blank mp-blank-sm" />
          <S bold>ના રોજ મળી છે અને ગુજરાત લગ્ન નોંધણી અધિનિયમ - ૨૦૦૬ અન્વયે નિભાવવામાં આવેલ</S>
        </p>
        <p>
          <S bold>લગ્ન રજિસ્ટ્રરના ભાગ</S>
          <span className="mp-blank mp-blank-sm" />
          <S bold>ના</S>
          <span className="mp-blank mp-blank-sm" />
          <S bold>પાના પર</S>
          <span className="mp-blank mp-blank-md" />
          <S bold>ક્રમે તા.</S>
          <span className="mp-blank mp-blank-md" />
          <S bold>ના રોજ ફાઈલ કરવામાં આવી છે.</S>
        </p>
        <div className="mp-cert-sign">
          <div className="mp-cert-sign-cell">
            <S bold>વા.</S>
            <span className="mp-blank mp-blank-lg" />
          </div>
          <div className="mp-cert-sign-cell mp-cert-registrar">
            <div>
              <S bold>સહી :</S>
              <span className="mp-blank mp-blank-lg" />
            </div>
            <div className="mp-cert-registrar-label">
              <S bold>લગ્ન નોંધણી રજિસ્ટ્રાર</S>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

export default function MarriagePrintDocument({ data = {}, pages = 'all' }) {
  const wanted = pages === 'all' ? [1, 2, 3] : [pages];
  return (
    <div className="marriage-print-document">
      {wanted.includes(1) && <Page1 data={data} />}
      {wanted.includes(2) && <Page2 data={data} />}
      {wanted.includes(3) && <Page3 data={data} />}
    </div>
  );
}
