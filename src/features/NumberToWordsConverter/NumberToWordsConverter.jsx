import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Checkbox, Select, Typography, Space, Tooltip, message, Row, Col, Divider, Radio } from 'antd';
import { CopyOutlined, DownloadOutlined, FieldStringOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const scalesIndian = ["", "Thousand", "Lakh", "Crore", "Arab", "Kharab", "Nil", "Padma", "Shankh", "Mahashankh"];
const scalesIntl = ["", "Thousand", "Million", "Billion", "Trillion", "Quadrillion", "Quintillion", "Sextillion"];

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

      let scale = scalesIndian[i] || "Crore ".repeat(i - 2).trim(); // Fallback if huge
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
  const [inputText, setInputText] = useState('12345678902318712');
  const [outputWords, setOutputWords] = useState('');

  const [autoConvert, setAutoConvert] = useState(true);
  const [currencySystem, setCurrencySystem] = useState('indian_rupees');
  const [showCurrency, setShowCurrency] = useState(true);
  const [writingCheck, setWritingCheck] = useState(true);
  const [multiline, setMultiline] = useState(false);
  const [textCase, setTextCase] = useState('title'); // title, upper, lower, sentence

  const handleConvert = () => {
    let lines = inputText.split('\n');
    if (!multiline) {
      lines = [inputText.replace(/\n/g, '')];
    }

    const results = lines.map(line => {
      let numStr = line.replace(/[^0-9]/g, '');
      if (!numStr) return '';

      // Trim leading zeros
      numStr = numStr.replace(/^0+/, '');
      if (numStr === '') numStr = '0';

      let words = '';
      if (currencySystem.startsWith('indian')) {
        words = numberToWordsIndian(numStr);
      } else {
        words = numberToWordsIntl(numStr);
      }

      if (showCurrency) {
        if (currencySystem === 'indian_rupees') words += ' Rupees';
        else if (currencySystem === 'intl_dollars') words += ' Dollars';
      }

      if (writingCheck && words.length > 0) {
        words += ' Only';
      }

      return words;
    });

    let finalStr = results.join('\n').trim();

    // Apply Case
    if (textCase === 'upper') finalStr = finalStr.toUpperCase();
    else if (textCase === 'lower') finalStr = finalStr.toLowerCase();
    else if (textCase === 'sentence') {
      finalStr = finalStr.charAt(0).toUpperCase() + finalStr.slice(1).toLowerCase();
    }

    setOutputWords(finalStr);
  };

  useEffect(() => {
    if (autoConvert) {
      handleConvert();
    }
  }, [inputText, currencySystem, showCurrency, writingCheck, multiline, textCase, autoConvert]);

  const getFormattedInput = () => {
    let numStr = inputText.replace(/[^0-9]/g, '');
    if (!numStr) return '';
    return currencySystem.startsWith('indian') ? formatIndianNumber(numStr) : formatIntlNumber(numStr);
  };

  const formattedStr = getFormattedInput();
  const inputBytes = new Blob([inputText]).size;
  const inputChars = inputText.length;

  const outputBytes = new Blob([outputWords]).size;
  const outputChars = outputWords.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(outputWords);
    message.success('Copied to clipboard!');
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([outputWords], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "ConvertedWords.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };


  return (
    <div style={{ padding: '4px 0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <FieldStringOutlined style={{ fontSize: 20, color: currentAccentColor }} />
        <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>Numbers to Words</Title>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Input Number</span>}>
            <TextArea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              style={{
                fontSize: 20,
                padding: '12px',
                borderRadius: 8,
                marginBottom: 8
              }}
              autoSize={{ minRows: 6, maxRows: 12 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 13 }}>
              <Text style={{ color: 'inherit' }}>Format: {formattedStr}</Text>
              <Text style={{ color: 'inherit' }}>{inputChars} Chars</Text>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <Select
                value={currencySystem}
                onChange={setCurrencySystem}
                style={{ flex: 1, minWidth: 150 }}
              >
                <Option value="indian_rupees">Indian Rupees</Option>
                <Option value="indian_number">Indian Number</Option>
                <Option value="intl_dollars">Intl Dollars</Option>
                <Option value="intl_number">Intl Number</Option>
              </Select>

              <Checkbox checked={writingCheck} onChange={e => setWritingCheck(e.target.checked)}>Add 'Only'</Checkbox>
              <Checkbox checked={autoConvert} onChange={e => setAutoConvert(e.target.checked)}>Auto Convert</Checkbox>
            </div>

            {!autoConvert && (
              <Button type="primary" block onClick={handleConvert} style={{ marginTop: 16, backgroundColor: currentAccentColor }}>
                Convert to Words
              </Button>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Converted Output</span>}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              <Button type="text" size="small" style={{ color: textCase === 'upper' ? currentAccentColor : 'var(--text-secondary)' }} onClick={() => setTextCase('upper')}>UPPER</Button>
              <Button type="text" size="small" style={{ color: textCase === 'lower' ? currentAccentColor : 'var(--text-secondary)' }} onClick={() => setTextCase('lower')}>lower</Button>
              <Button type="text" size="small" style={{ color: textCase === 'title' ? currentAccentColor : 'var(--text-secondary)' }} onClick={() => setTextCase('title')}>Title</Button>
              <Button type="text" size="small" style={{ color: textCase === 'sentence' ? currentAccentColor : 'var(--text-secondary)' }} onClick={() => setTextCase('sentence')}>Sentence</Button>
            </div>

            <TextArea
              value={outputWords}
              readOnly
              style={{
                fontSize: 18,
                padding: '12px',
                borderRadius: 8,
                marginBottom: 8
              }}
              autoSize={{ minRows: 6, maxRows: 12 }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-secondary)', fontSize: 13 }}>
              <Text style={{ color: 'inherit' }}>{outputChars} Chars</Text>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ display: 'flex', gap: 12 }}>
              <Button block icon={<CopyOutlined />} onClick={handleCopy}>Copy</Button>
              <Button block icon={<DownloadOutlined />} onClick={handleDownload}>Download</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
