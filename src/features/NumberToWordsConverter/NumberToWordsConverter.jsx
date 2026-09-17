import React, { useState, useEffect, useMemo } from 'react';
import { Card, Input, Button, Checkbox, Select, Typography, Space, Tooltip, message, Row, Col, Divider, Segmented, Tag } from 'antd';
import { Copy, Download, Hash, Languages, Check } from 'lucide-react';
import { convertUnicodeToGhanshyamLegacy } from '../../utils/ghanshyamLegacy';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// English Constants
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const scalesIndian = ["", "Thousand", "Lakh", "Crore", "Arab", "Kharab", "Nil", "Padma", "Shankh", "Mahashankh"];
const scalesIntl = ["", "Thousand", "Million", "Billion", "Trillion", "Quadrillion", "Quintillion", "Sextillion"];

// Gujarati Constants
const guDigits = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];

const guWords0to99 = [
  "શૂન્ય", "એક", "બે", "ત્રણ", "ચાર", "પાંચ", "છ", "સાત", "આઠ", "નવ",
  "દસ", "અગિયાર", "બાર", "તેર", "ચૌદ", "પંદર", "સોળ", "સત્તર", "અઢાર", "ઓગણીસ",
  "વીસ", "એકવીસ", "બાવીસ", "તેવીસ", "ચોવીસ", "પચીસ", "છવીસ", "સત્તાવીસ", "અઠ્ઠાવીસ", "ઓગણત્રીસ",
  "ત્રીસ", "એકત્રીસ", "બત્રીસ", "તેત્રીસ", "ચોત્રીસ", "પાંત્રીસ", "છત્રીસ", "સાડત્રીસ", "આડત્રીસ", "ઓગણચાલીસ",
  "ચાલીસ", "એકતાલીસ", "બેતાલીસ", "તેતાલીસ", "ચુંમાલીસ", "પિસ્તાલીસ", "છેતાલીસ", "સુડતાલીસ", "અડતાલીસ", "ઓગણપચાસ",
  "પચાસ", "એકાવન", "બાવન", "ત્રેપન", "ચોપન", "પંચાવન", "છપ્પન", "સત્તાવન", "અઠ્ઠાવન", "ઓગણસાઈઠ",
  "સાઈઠ", "એકસઠ", "બાસઠ", "ત્રેસઠ", "ચોસઠ", "પાંસઠ", "છાસઠ", "સડસઠ", "અડસઠ", "અગણોસિત્તેર",
  "સિત્તેર", "એકોતેર", "બોતેર", "તોતેર", "ચોંતેર", "પંચોતેર", "છોતેર", "સીંતોતેર", "ઈઠોતેર", "ઓગણાએંસી",
  "એંસી", "એક્યાસી", "બ્યાસી", "ત્યાસી", "ચોર્યાસી", "પંચાસી", "છ્યાસી", "સિત્યાસી", "ઇઠ્યાસી", "નેવ્યાસી",
  "નેવું", "એકાણું", "બાણું", "ત્રાણું", "ચોરાણું", "પંચાણું", "છન્નું", "સત્તાણું", "અઠ્ઠાણું", "નવ્વાણું"
];

const guHundreds = ["", "એકસો", "બસો", "ત્રણસો", "ચારસો", "પાંચસો", "છસો", "સાતસો", "આઠસો", "નવસો"];
const guScalesIndianDefault = ["", "હજાર", "લાખ", "કરોડ", "અરબ", "ખરબ", "નીલ", "પદ્મ", "શંખ", "મહાશંખ"];
const guScalesIntl = ["", "હજાર", "મિલિયન", "બિલિયન", "ટ્રિલિયન", "ક્વોડ્રિલિયન", "ક્વિન્ટિલિયન", "સેક્સટિલિયન"];

// Helper: Normalize Gujarati numerals to standard digits
function normalizeToDigits(str) {
  if (!str) return '';
  return String(str).replace(/[૦-૯]/g, d => {
    const idx = guDigits.indexOf(d);
    return idx !== -1 ? idx : d;
  });
}

// Helper: Convert standard digits to Gujarati numerals
function toGujaratiDigits(str) {
  if (!str) return '';
  return String(str).replace(/[0-9]/g, d => guDigits[parseInt(d, 10)]);
}

function numberToWordsIndian(numStr) {
  if (numStr === '0') return 'Zero';

  let n = numStr;
  let chunks = [];

  let last3 = n.slice(-3);
  chunks.push(last3);
  n = n.slice(0, -3);

  while (n.length > 0) {
    let next2 = n.slice(-2);
    chunks.push(next2);
    n = n.slice(0, -2);
  }

  let words = [];

  for (let i = chunks.length - 1; i >= 0; i--) {
    let chunk = parseInt(chunks[i], 10);
    if (chunk === 0) continue;

    let chunkWords = [];
    if (i === 0) {
      let h = Math.floor(chunk / 100);
      let rem = chunk % 100;
      if (h > 0) chunkWords.push(ones[h] + " Hundred");
      if (rem > 0) {
        if (rem < 20) chunkWords.push(ones[rem]);
        else {
          let t = Math.floor(rem / 10);
          let u = rem % 10;
          chunkWords.push(tens[t] + (u > 0 ? " " + ones[u] : ""));
        }
      }
    } else {
      if (chunk < 20) chunkWords.push(ones[chunk]);
      else {
        let t = Math.floor(chunk / 10);
        let u = chunk % 10;
        chunkWords.push(tens[t] + (u > 0 ? " " + ones[u] : ""));
      }

      let scale = scalesIndian[i] || "Crore ".repeat(i - 2).trim();
      chunkWords.push(scale);
    }

    words.push(chunkWords.join(" "));
  }

  return words.join(" ");
}

function numberToWordsIntl(numStr) {
  if (numStr === '0') return 'Zero';

  let n = numStr;
  let chunks = [];

  while (n.length > 0) {
    let next3 = n.slice(-3);
    chunks.push(next3);
    n = n.slice(0, -3);
  }

  let words = [];

  for (let i = chunks.length - 1; i >= 0; i--) {
    let chunk = parseInt(chunks[i], 10);
    if (chunk === 0) continue;

    let chunkWords = [];
    let h = Math.floor(chunk / 100);
    let rem = chunk % 100;
    if (h > 0) chunkWords.push(ones[h] + " Hundred");
    if (rem > 0) {
      if (rem < 20) chunkWords.push(ones[rem]);
      else {
        let t = Math.floor(rem / 10);
        let u = rem % 10;
        chunkWords.push(tens[t] + (u > 0 ? " " + ones[u] : ""));
      }
    }

    let scale = scalesIntl[i] || "Zillion";
    if (scale) chunkWords.push(scale);

    words.push(chunkWords.join(" "));
  }

  return words.join(" ");
}

function numberToWordsGujaratiIndian(numStr, arabScale = 'arab') {
  if (numStr === '0') return guWords0to99[0];

  let n = numStr;
  let chunks = [];

  let last3 = n.slice(-3);
  chunks.push(last3);
  n = n.slice(0, -3);

  while (n.length > 0) {
    let next2 = n.slice(-2);
    chunks.push(next2);
    n = n.slice(0, -2);
  }

  const scales = [...guScalesIndianDefault];
  if (arabScale === 'abaj') {
    scales[4] = "અબજ";
  }

  let words = [];

  for (let i = chunks.length - 1; i >= 0; i--) {
    let chunk = parseInt(chunks[i], 10);
    if (chunk === 0) continue;

    let chunkWords = [];
    if (i === 0) {
      let h = Math.floor(chunk / 100);
      let rem = chunk % 100;
      if (h > 0) chunkWords.push(guHundreds[h]);
      if (rem > 0) {
        chunkWords.push(guWords0to99[rem]);
      }
    } else {
      chunkWords.push(guWords0to99[chunk]);
      let scale = scales[i] || (arabScale === 'abaj' ? "અબજ" : "કરોડ");
      chunkWords.push(scale);
    }

    words.push(chunkWords.join(" "));
  }

  return words.join(" ");
}

function numberToWordsGujaratiIntl(numStr) {
  if (numStr === '0') return guWords0to99[0];

  let n = numStr;
  let chunks = [];

  while (n.length > 0) {
    let next3 = n.slice(-3);
    chunks.push(next3);
    n = n.slice(0, -3);
  }

  let words = [];

  for (let i = chunks.length - 1; i >= 0; i--) {
    let chunk = parseInt(chunks[i], 10);
    if (chunk === 0) continue;

    let chunkWords = [];
    let h = Math.floor(chunk / 100);
    let rem = chunk % 100;
    if (h > 0) chunkWords.push(guHundreds[h]);
    if (rem > 0) chunkWords.push(guWords0to99[rem]);

    let scale = guScalesIntl[i] || "";
    if (scale) chunkWords.push(scale);

    words.push(chunkWords.join(" "));
  }

  return words.join(" ");
}

function formatIndianNumber(str) {
  if (!str) return '';
  let last3 = str.slice(-3);
  let other = str.slice(0, -3);
  if (other !== '') {
    last3 = ',' + last3;
  }
  return other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + last3;
}

function formatIntlNumber(str) {
  if (!str) return '';
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function NumberToWordsConverter({ currentAccentColor }) {
  const [inputText, setInputText] = useState('1234567890');
  const [outputWordsGu, setOutputWordsGu] = useState('');
  const [outputWordsEn, setOutputWordsEn] = useState('');

  const [languageMode, setLanguageMode] = useState('both'); // 'both', 'gu', 'en'
  const [gujaratiFont, setGujaratiFont] = useState('both_fonts'); // 'both_fonts', 'unicode', 'ghanshyam'
  const [autoConvert, setAutoConvert] = useState(true);
  const [currencySystem, setCurrencySystem] = useState('indian_rupees');
  const [showCurrency, setShowCurrency] = useState(true);
  const [writingCheck, setWritingCheck] = useState(true);
  const [gujaratiSuffix, setGujaratiSuffix] = useState('pura'); // 'pura', 'poora', 'rupees_pura', 'rupees_poora', 'none'
  const [gujaratiScale, setGujaratiScale] = useState('arab'); // 'arab', 'abaj'
  const [multiline, setMultiline] = useState(false);
  const [textCase, setTextCase] = useState('title'); // title, upper, lower, sentence

  const convertSingleLine = (line, lang) => {
    let normalized = normalizeToDigits(line.trim().replace(/,/g, ''));
    if (!normalized) return '';

    let parts = normalized.split('.');
    let intPart = parts[0].replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (intPart === '') intPart = '0';

    let decPart = parts.length > 1 ? parts[1].replace(/[^0-9]/g, '').slice(0, 2) : '';
    let decNum = decPart ? parseInt(decPart.padEnd(2, '0'), 10) : 0;

    const isIndian = currencySystem.startsWith('indian');

    if (lang === 'gu') {
      let intWords = isIndian
        ? numberToWordsGujaratiIndian(intPart, gujaratiScale)
        : numberToWordsGujaratiIntl(intPart);

      let decWords = decNum > 0 ? guWords0to99[decNum] : '';
      let res = intWords;

      if (currencySystem === 'indian_rupees') {
        if (decWords) {
          res += ` રૂપિયા અને ${decWords} પૈસા`;
        } else if (showCurrency && (gujaratiSuffix === 'rupees_pura' || gujaratiSuffix === 'rupees_poora')) {
          res += ' રૂપિયા';
        }
      } else if (currencySystem === 'intl_dollars') {
        if (decWords) {
          res += ` ડૉલર અને ${decWords} સેન્ટ`;
        } else if (showCurrency && (gujaratiSuffix === 'rupees_pura' || gujaratiSuffix === 'rupees_poora')) {
          res += ' ડૉલર';
        }
      } else if (decNum > 0) {
        res += ` પોઇન્ટ ${decWords}`;
      }

      // Add Gujarati Suffix
      if (gujaratiSuffix === 'pura') {
        res += ' પુરા';
      } else if (gujaratiSuffix === 'poora') {
        res += ' પૂરા';
      } else if (gujaratiSuffix === 'rupees_pura') {
        if (!res.includes('રૂપિયા') && !res.includes('ડૉલર')) {
          res += ' રૂપિયા પુરા';
        } else if (!res.endsWith('પુરા') && !res.endsWith('પૂરા')) {
          res += ' પુરા';
        }
      } else if (gujaratiSuffix === 'rupees_poora') {
        if (!res.includes('રૂપિયા') && !res.includes('ડૉલર')) {
          res += ' રૂપિયા પૂરા';
        } else if (!res.endsWith('પુરા') && !res.endsWith('પૂરા')) {
          res += ' પૂરા';
        }
      }

      return res.trim();
    } else {
      // English
      let intWords = isIndian
        ? numberToWordsIndian(intPart)
        : numberToWordsIntl(intPart);

      let decWords = decNum > 0
        ? (decNum < 20 ? ones[decNum] : tens[Math.floor(decNum / 10)] + (decNum % 10 > 0 ? " " + ones[decNum % 10] : ""))
        : '';

      let res = intWords;
      if (showCurrency) {
        if (currencySystem === 'indian_rupees') {
          if (decWords) res += ` Rupees and ${decWords} Paise`;
          else res += ' Rupees';
        } else if (currencySystem === 'intl_dollars') {
          if (decWords) res += ` Dollars and ${decWords} Cents`;
          else res += ' Dollars';
        }
      } else if (decNum > 0) {
        res += ` Point ${decWords}`;
      }

      if (writingCheck && res.length > 0 && !res.endsWith('Only')) {
        res += ' Only';
      }

      // Apply English Case
      if (textCase === 'upper') res = res.toUpperCase();
      else if (textCase === 'lower') res = res.toLowerCase();
      else if (textCase === 'sentence') {
        res = res.charAt(0).toUpperCase() + res.slice(1).toLowerCase();
      }

      return res.trim();
    }
  };

  const handleConvert = () => {
    let lines = inputText.split('\n');
    if (!multiline) {
      lines = [inputText.replace(/\n/g, '')];
    }

    const guResults = lines.map(line => convertSingleLine(line, 'gu'));
    const enResults = lines.map(line => convertSingleLine(line, 'en'));

    setOutputWordsGu(guResults.join('\n').trim());
    setOutputWordsEn(enResults.join('\n').trim());
  };

  useEffect(() => {
    if (autoConvert) {
      handleConvert();
    }
  }, [
    inputText,
    languageMode,
    currencySystem,
    showCurrency,
    writingCheck,
    gujaratiSuffix,
    gujaratiScale,
    multiline,
    textCase,
    autoConvert
  ]);

  // Derived Ghanshyam legacy conversion
  const outputWordsGhanshyam = useMemo(() => {
    if (!outputWordsGu) return '';
    return outputWordsGu
      .split('\n')
      .map(line => convertUnicodeToGhanshyamLegacy(line))
      .join('\n');
  }, [outputWordsGu]);

  const getFormattedInput = () => {
    let rawDigits = normalizeToDigits(inputText.replace(/[^0-9૦-૯]/g, ''));
    if (!rawDigits) return { en: '', gu: '' };

    let en = currencySystem.startsWith('indian') ? formatIndianNumber(rawDigits) : formatIntlNumber(rawDigits);
    let gu = toGujaratiDigits(en);
    return { en, gu };
  };

  const formattedStr = getFormattedInput();
  const inputChars = inputText.length;

  const handleCopy = (text, label = 'Copied') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard!`);
  };

  const handleCopyAll = () => {
    let parts = [];
    if (languageMode === 'both' || languageMode === 'gu') {
      if (gujaratiFont === 'unicode' || gujaratiFont === 'both_fonts') {
        parts.push(`ગુજરાતી (Unicode):\n${outputWordsGu}`);
      }
      if (gujaratiFont === 'ghanshyam' || gujaratiFont === 'both_fonts') {
        parts.push(`Ghanshyam (Legacy Font Keystrokes):\n${outputWordsGhanshyam}`);
      }
    }
    if (languageMode === 'both' || languageMode === 'en') {
      parts.push(`English:\n${outputWordsEn}`);
    }

    navigator.clipboard.writeText(parts.join('\n\n'));
    message.success('All text copied to clipboard!');
  };

  const handleDownload = () => {
    let parts = [];
    if (languageMode === 'both' || languageMode === 'gu') {
      if (gujaratiFont === 'unicode' || gujaratiFont === 'both_fonts') {
        parts.push(`ગુજરાતી (Unicode):\n${outputWordsGu}`);
      }
      if (gujaratiFont === 'ghanshyam' || gujaratiFont === 'both_fonts') {
        parts.push(`Ghanshyam (Legacy Font Keystrokes):\n${outputWordsGhanshyam}`);
      }
    }
    if (languageMode === 'both' || languageMode === 'en') {
      parts.push(`English:\n${outputWordsEn}`);
    }

    const content = parts.join('\n\n');
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = "ConvertedNumbers.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div style={{ padding: '4px 0 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Hash size={20} style={{ color: currentAccentColor }} />
          <div>
            <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>Numbers to Words Converter</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>English, ગુજરાતી (Unicode) & Ghanshyam Font</Text>
          </div>
        </div>

        {/* Language Selection Segmented */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Languages size={16} style={{ color: currentAccentColor }} />
          <Segmented
            value={languageMode}
            onChange={setLanguageMode}
            options={[
              { label: 'બંને (Both)', value: 'both' },
              { label: 'ગુજરાતી', value: 'gu' },
              { label: 'English', value: 'en' }
            ]}
          />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {/* Left Column: Input & Options */}
        <Col xs={24} lg={11}>
          <Card
            size="small"
            className="glass-panel"
            bordered={false}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: currentAccentColor, fontSize: 13, fontWeight: 600 }}>Input Number / રકમ</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Supports 0-9 & ૦-૯</span>
              </div>
            }
          >
            <TextArea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="e.g. 1234567890 or ૧૨૩૪૫૬૭૮૯૦"
              style={{
                fontSize: 19,
                fontWeight: 500,
                padding: '12px',
                borderRadius: 8,
                marginBottom: 8
              }}
              autoSize={{ minRows: 5, maxRows: 10 }}
            />

            {/* Formatted display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, color: 'var(--text-secondary)', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>EN: <Text strong style={{ color: 'var(--text-primary)' }}>{formattedStr.en || '-'}</Text></span>
                <span>{inputChars} Chars</span>
              </div>
              {formattedStr.gu && (
                <div>
                  GU: <Text strong style={{ color: currentAccentColor }}>{formattedStr.gu}</Text>
                </div>
              )}
            </div>

            <Divider style={{ margin: '14px 0' }} />

            {/* Conversion Controls */}
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              {/* Row 1: System */}
              <Row gutter={8} align="middle">
                <Col span={10}>
                  <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>System / પદ્ધતિ:</Text>
                </Col>
                <Col span={14}>
                  <Select
                    value={currencySystem}
                    onChange={setCurrencySystem}
                    style={{ width: '100%' }}
                    size="small"
                  >
                    <Option value="indian_rupees">Indian Rupees (ભારતીય રૂપિયા)</Option>
                    <Option value="indian_number">Indian Number (સંખ્યા માત્ર)</Option>
                    <Option value="intl_dollars">Intl Dollars (ડૉલર)</Option>
                    <Option value="intl_number">Intl Number (આંતરરાષ્ટ્રીય સંખ્યા)</Option>
                  </Select>
                </Col>
              </Row>

              {/* Row 2: Gujarati Font Option */}
              {(languageMode === 'both' || languageMode === 'gu') && (
                <Row gutter={8} align="middle">
                  <Col span={10}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Gujarati Font / ફોન્ટ:</Text>
                  </Col>
                  <Col span={14}>
                    <Select
                      value={gujaratiFont}
                      onChange={setGujaratiFont}
                      style={{ width: '100%' }}
                      size="small"
                    >
                      <Option value="unicode">Gujarati Unicode</Option>
                      <Option value="ghanshyam">Ghanshyam (Legacy Font)</Option>
                      <Option value="both_fonts">Both (Unicode + Ghanshyam)</Option>
                    </Select>
                  </Col>
                </Row>
              )}

              {/* Row 3: Gujarati Scale Unit (Arab vs Abaj) */}
              {(languageMode === 'both' || languageMode === 'gu') && currencySystem.startsWith('indian') && (
                <Row gutter={8} align="middle">
                  <Col span={10}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>100 Crore Scale (10⁹):</Text>
                  </Col>
                  <Col span={14}>
                    <Select
                      value={gujaratiScale}
                      onChange={setGujaratiScale}
                      style={{ width: '100%' }}
                      size="small"
                    >
                      <Option value="arab">અરબ (Arab)</Option>
                      <Option value="abaj">અબજ (Abaj)</Option>
                    </Select>
                  </Col>
                </Row>
              )}

              {/* Row 4: Gujarati Suffix */}
              {(languageMode === 'both' || languageMode === 'gu') && (
                <Row gutter={8} align="middle">
                  <Col span={10}>
                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Gujarati Suffix:</Text>
                  </Col>
                  <Col span={14}>
                    <Select
                      value={gujaratiSuffix}
                      onChange={setGujaratiSuffix}
                      style={{ width: '100%' }}
                      size="small"
                    >
                      <Option value="pura">... પુરા</Option>
                      <Option value="poora">... પૂરા</Option>
                      <Option value="rupees_pura">... રૂપિયા પુરા</Option>
                      <Option value="rupees_poora">... રૂપિયા પૂરા</Option>
                      <Option value="none">કંઈ નહીં (None)</Option>
                    </Select>
                  </Col>
                </Row>
              )}

              {/* Checkboxes Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, paddingTop: 4 }}>
                <Checkbox
                  checked={autoConvert}
                  onChange={e => setAutoConvert(e.target.checked)}
                >
                  Auto Convert
                </Checkbox>

                <Checkbox
                  checked={multiline}
                  onChange={e => setMultiline(e.target.checked)}
                >
                  Multiline
                </Checkbox>

                {(languageMode === 'both' || languageMode === 'en') && (
                  <Checkbox
                    checked={writingCheck}
                    onChange={e => setWritingCheck(e.target.checked)}
                  >
                    Add 'Only' (EN)
                  </Checkbox>
                )}
              </div>

              {!autoConvert && (
                <Button
                  type="primary"
                  block
                  onClick={handleConvert}
                  style={{ marginTop: 8, backgroundColor: currentAccentColor }}
                >
                  Convert to Words
                </Button>
              )}
            </Space>
          </Card>
        </Col>

        {/* Right Column: Converted Words Output */}
        <Col xs={24} lg={13}>
          <Card
            size="small"
            className="glass-panel"
            bordered={false}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: currentAccentColor, fontSize: 13, fontWeight: 600 }}>Converted Words / શબ્દોમાં રકમ</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="small" icon={<Copy size={13} />} onClick={handleCopyAll}>
                    Copy All
                  </Button>
                  <Button size="small" icon={<Download size={13} />} onClick={handleDownload}>
                    Download
                  </Button>
                </div>
              </div>
            }
          >
            {/* GUJARATI OUTPUT BLOCK */}
            {(languageMode === 'both' || languageMode === 'gu') && (
              <div style={{ marginBottom: languageMode === 'both' ? 16 : 0 }}>
                {/* Header with Font Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: currentAccentColor }}>
                      ગુજરાતી:
                    </span>
                    <Segmented
                      size="small"
                      value={gujaratiFont}
                      onChange={setGujaratiFont}
                      options={[
                        { label: 'Unicode', value: 'unicode' },
                        { label: 'Ghanshyam', value: 'ghanshyam' },
                        { label: 'Both Fonts', value: 'both_fonts' }
                      ]}
                    />
                  </div>
                </div>

                {/* Sub-block 1: Gujarati Unicode */}
                {(gujaratiFont === 'unicode' || gujaratiFont === 'both_fonts') && (
                  <div style={{ marginBottom: gujaratiFont === 'both_fonts' ? 12 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Gujarati Unicode:
                      </span>
                      <Button
                        type="link"
                        size="small"
                        icon={<Copy size={13} />}
                        onClick={() => handleCopy(outputWordsGu, 'Gujarati Unicode text')}
                      >
                        Copy Unicode
                      </Button>
                    </div>
                    <TextArea
                      value={outputWordsGu}
                      readOnly
                      style={{
                        fontSize: 17,
                        lineHeight: 1.6,
                        padding: '12px',
                        borderRadius: 8,
                        color: 'var(--text-primary)',
                        background: 'rgba(255, 255, 255, 0.03)'
                      }}
                      autoSize={{ minRows: 3, maxRows: 8 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>
                      <span>{outputWordsGu.length} Chars</span>
                    </div>
                  </div>
                )}

                {/* Sub-block 2: Ghanshyam Legacy Font */}
                {(gujaratiFont === 'ghanshyam' || gujaratiFont === 'both_fonts') && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          Ghanshyam (Legacy Font):
                        </span>
                        <Tag color="cyan" style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px' }}>
                          Word / PageMaker Keystrokes
                        </Tag>
                      </div>
                      <Button
                        type="link"
                        size="small"
                        icon={<Copy size={13} />}
                        onClick={() => handleCopy(outputWordsGhanshyam, 'Ghanshyam keystrokes')}
                      >
                        Copy Ghanshyam
                      </Button>
                    </div>
                    <TextArea
                      value={outputWordsGhanshyam}
                      readOnly
                      className="font-ghanshyam"
                      style={{
                        fontSize: 20,
                        lineHeight: 1.6,
                        padding: '12px',
                        borderRadius: 8,
                        color: 'var(--text-primary)',
                        background: 'rgba(255, 255, 255, 0.03)'
                      }}
                      autoSize={{ minRows: 3, maxRows: 8 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>
                      <span style={{ fontStyle: 'italic' }}>Displays in Ghanshyam font · Copies ASCII keys</span>
                      <span>{outputWordsGhanshyam.length} Chars</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ENGLISH OUTPUT BLOCK */}
            {(languageMode === 'both' || languageMode === 'en') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: currentAccentColor }}>
                    English:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Button
                      type="text"
                      size="small"
                      style={{ fontSize: 11, padding: '0 4px', color: textCase === 'upper' ? currentAccentColor : 'var(--text-secondary)' }}
                      onClick={() => setTextCase('upper')}
                    >
                      UPPER
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      style={{ fontSize: 11, padding: '0 4px', color: textCase === 'lower' ? currentAccentColor : 'var(--text-secondary)' }}
                      onClick={() => setTextCase('lower')}
                    >
                      lower
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      style={{ fontSize: 11, padding: '0 4px', color: textCase === 'title' ? currentAccentColor : 'var(--text-secondary)' }}
                      onClick={() => setTextCase('title')}
                    >
                      Title
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      style={{ fontSize: 11, padding: '0 4px', color: textCase === 'sentence' ? currentAccentColor : 'var(--text-secondary)' }}
                      onClick={() => setTextCase('sentence')}
                    >
                      Sentence
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<Copy size={13} />}
                      onClick={() => handleCopy(outputWordsEn, 'English text')}
                    >
                      Copy English
                    </Button>
                  </div>
                </div>
                <TextArea
                  value={outputWordsEn}
                  readOnly
                  style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    padding: '12px',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    background: 'rgba(255, 255, 255, 0.03)'
                  }}
                  autoSize={{ minRows: languageMode === 'both' ? 3 : 6, maxRows: 10 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>
                  <span>{outputWordsEn.length} Chars</span>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
