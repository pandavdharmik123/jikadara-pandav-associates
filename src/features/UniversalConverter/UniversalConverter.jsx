import React, { useState, useEffect } from 'react';
import { Row, Col, Select, Typography, Button, Tooltip, message, Badge } from 'antd';
import { SwapRightOutlined, ClearOutlined, CopyOutlined } from '@ant-design/icons';
import { transliterateLatinRunsToGujarati } from '../../utils/batchTransliterate';
import { convertUnicodeToGhanshyamLegacy } from '../../utils/ghanshyamLegacy';
import { convertHarikrishnaTemplateToUnicode } from '../../utils/reverseHarikrishnaTemplate';
import { convertUnicodeToPhonetic } from '../../utils/gujaratiToPhonetic';

const { Paragraph } = Typography;

export default function UniversalConverter({ themeMode, currentAccentColor }) {
  const [uniFrom, setUniFrom] = useState('english');
  const [uniTo, setUniTo] = useState('ghanshyam');
  const [uniInput, setUniInput] = useState('');
  const [uniOutput, setUniOutput] = useState('');
  const [isUniConverting, setIsUniConverting] = useState(false);

  useEffect(() => {
    if (!uniInput) {
      setUniOutput('');
      return;
    }
    const delay = setTimeout(async () => {
      setIsUniConverting(true);
      try {
        let finalOutput = uniInput;

        const isFromLegacy = uniFrom === 'ghanshyam' || uniFrom === 'nilkanth' || uniFrom === 'nil_font';
        const isToLegacy = uniTo === 'ghanshyam' || uniTo === 'nilkanth' || uniTo === 'nil_font';

        if (isFromLegacy) {
          // Convert legacy to Unicode first
          finalOutput = convertHarikrishnaTemplateToUnicode(finalOutput);
          
          if (uniTo === 'english') {
            finalOutput = convertUnicodeToPhonetic(finalOutput);
          } else if (uniTo === 'unicode') {
            // Already converted to Unicode, do nothing more
          } else if (isToLegacy) {
            // Legacy to Legacy (noop)
            finalOutput = uniInput;
          }
        } else {
          // From English or Unicode
          if (uniFrom === 'english') {
            // English to Unicode
            finalOutput = await transliterateLatinRunsToGujarati(finalOutput);
          }

          if (isToLegacy) {
            // Unicode to Legacy
            finalOutput = convertUnicodeToGhanshyamLegacy(finalOutput);
          } else if (uniTo === 'english' && uniFrom === 'unicode') {
            // Unicode to English
            finalOutput = convertUnicodeToPhonetic(finalOutput);
          } else if (uniFrom === 'english' && uniTo === 'english') {
            // English to English (noop)
            finalOutput = uniInput;
          } else if (uniFrom === 'unicode' && uniTo === 'unicode') {
            // Unicode to Unicode (noop)
            finalOutput = uniInput;
          }
        }

        setUniOutput(finalOutput);
      } catch (err) {
        console.error('Universal Converter error:', err);
      } finally {
        setIsUniConverting(false);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(delay);
  }, [uniInput, uniFrom, uniTo]);

  return (
    <div className="universal-tab-wrap" style={{ padding: '8px 0 20px', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      <Paragraph style={{ marginBottom: 16, color: 'var(--text-secondary)', maxWidth: 900 }}>
        Select your source input format and target font format.
        (Note: Ghanshyam, Nilkanth, and Nil Font all share the same Harikrishna keystroke template).
      </Paragraph>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>From:</span>
          <Select value={uniFrom} onChange={setUniFrom} style={{ width: '100%' }}>
            <Select.Option value="english">English (Phonetic)</Select.Option>
            <Select.Option value="unicode">Gujarati Unicode</Select.Option>
            <Select.Option value="ghanshyam">Ghanshyam</Select.Option>
            <Select.Option value="nilkanth">Nilkanth</Select.Option>
            <Select.Option value="nil_font">Nil Font</Select.Option>
          </Select>
        </div>
        <SwapRightOutlined style={{ fontSize: 24, color: 'var(--text-secondary)', display: window.innerWidth < 768 ? 'none' : 'block' }} />
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>To:</span>
          <Select value={uniTo} onChange={setUniTo} style={{ width: '100%' }}>
            <Select.Option value="ghanshyam">Ghanshyam</Select.Option>
            <Select.Option value="nilkanth">Nilkanth</Select.Option>
            <Select.Option value="nil_font">Nil Font</Select.Option>
            <Select.Option value="english">English (Phonetic)</Select.Option>
            <Select.Option value="unicode">Gujarati Unicode</Select.Option>
          </Select>
        </div>
      </div>

      <Row gutter={[24, 24]} style={{ display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
        <Col xs={24} md={12}>
          <div className="editor-card" style={{ height: '100%', minHeight: '300px', border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}` }}>
            <div className="editor-header">
              <div className="editor-title">
                <Badge color={currentAccentColor} status={isUniConverting ? "processing" : "default"} />
                <span>Input ({uniFrom.replace('_', ' ')})</span>
              </div>
              <Tooltip title="Clear Input">
                <Button
                  type="text"
                  shape="circle"
                  icon={<ClearOutlined />}
                  onClick={() => { setUniInput(''); setUniOutput(''); }}
                  disabled={!uniInput}
                />
              </Tooltip>
            </div>
            <div className="editor-body" style={{ minHeight: 0, display: 'flex', flex: 1 }}>
              <textarea
                className={`textarea-editor ${['ghanshyam', 'nilkanth', 'nil_font'].includes(uniFrom) ? 'font-ghanshyam' : ''}`}
                value={uniInput}
                onChange={(e) => setUniInput(e.target.value)}
                placeholder={uniFrom === 'english' ? "Type english phonetics e.g. kem cho" : (uniFrom === 'unicode' ? "Type/paste Gujarati Unicode e.g. કેમ છો" : "Paste legacy font text here...")}
                spellCheck={uniFrom === 'english'}
                style={{ height: '100%', fontSize: ['ghanshyam', 'nilkanth', 'nil_font'].includes(uniFrom) ? 20 : 'inherit' }}
              />
            </div>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div className="editor-card" style={{ height: '100%', minHeight: '300px', border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`, borderLeft: `4px solid ${currentAccentColor}` }}>
            <div className="editor-header">
              <div className="editor-title">
                <span style={{ color: currentAccentColor }}>●</span>
                <span>Output ({uniTo} encoding)</span>
              </div>
              <Tooltip title="Copy converted text">
                <Button
                  type="text"
                  shape="circle"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(uniOutput);
                    message.success('Copied!');
                  }}
                  disabled={!uniOutput}
                />
              </Tooltip>
            </div>
            <div className="editor-body" style={{ minHeight: 0, display: 'flex', flex: 1 }}>
              <textarea
                readOnly
                value={uniOutput}
                className={`textarea-editor ${['ghanshyam', 'nilkanth', 'nil_font'].includes(uniTo) ? 'font-ghanshyam' : ''}`}
                placeholder="Converted text will appear here..."
                style={{ opacity: isUniConverting ? 0.55 : 1, fontSize: ['ghanshyam', 'nilkanth', 'nil_font'].includes(uniTo) ? 20 : 'inherit', height: '100%' }}
              />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
