import React, { useState, useEffect } from 'react';
import { Row, Col, Select, Typography, Button, Tooltip, message, Badge } from 'antd';
import { SwapRightOutlined, ClearOutlined, CopyOutlined } from '@ant-design/icons';
import { transliterateLatinRunsToGujarati } from '../../utils/batchTransliterate';
import { convertUnicodeToGhanshyamLegacy } from '../../utils/ghanshyamLegacy';

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
        // 1) If input is English/Latin, first convert to Unicode
        if (uniFrom === 'english') {
          finalOutput = await transliterateLatinRunsToGujarati(finalOutput);
        }
        // 2) Now we have Unicode. Convert to target legacy format if needed
        if (uniTo === 'ghanshyam' || uniTo === 'nilkanth' || uniTo === 'nil_font') {
          finalOutput = convertUnicodeToGhanshyamLegacy(finalOutput);
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
    <div className="universal-tab-wrap" style={{ padding: '8px 0 20px' }}>
      <Paragraph style={{ marginBottom: 16, color: 'var(--text-secondary)', maxWidth: 900 }}>
        Select your source input format and target font format.
        (Note: Ghanshyam, Nilkanth, and Nil Font all share the same Harikrishna keystroke template).
      </Paragraph>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>From:</span>
          <Select value={uniFrom} onChange={setUniFrom} style={{ width: '100%' }}>
            <Select.Option value="english">English (Phonetic)</Select.Option>
            <Select.Option value="unicode">Gujarati Unicode</Select.Option>
          </Select>
        </div>
        <SwapRightOutlined style={{ fontSize: 24, color: 'var(--text-secondary)' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>To:</span>
          <Select value={uniTo} onChange={setUniTo} style={{ width: '100%' }}>
            <Select.Option value="ghanshyam">Ghanshyam</Select.Option>
            <Select.Option value="nilkanth">Nilkanth</Select.Option>
            <Select.Option value="nil_font">Nil Font</Select.Option>
          </Select>
        </div>
      </div>

      <Row gutter={24} style={{ display: 'flex', alignItems: 'stretch' }}>
        <Col span={12}>
          <div className="editor-card" style={{ height: '100%', border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}` }}>
            <div className="editor-header">
              <div className="editor-title">
                <Badge color={currentAccentColor} status={isUniConverting ? "processing" : "default"} />
                <span>Input ({uniFrom === 'english' ? 'English' : 'Unicode'})</span>
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
            <div className="editor-body" style={{ minHeight: 300 }}>
              <textarea
                className="textarea-editor"
                value={uniInput}
                onChange={(e) => setUniInput(e.target.value)}
                placeholder={uniFrom === 'english' ? "Type english phonetics e.g. kem cho" : "Type/paste Gujarati Unicode e.g. કેમ છો"}
                spellCheck={uniFrom === 'english'}
                style={{ height: '100%' }}
              />
            </div>
          </div>
        </Col>

        <Col span={12}>
          <div className="editor-card" style={{ height: '100%', border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`, borderLeft: `4px solid ${currentAccentColor}` }}>
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
            <div className="editor-body" style={{ minHeight: 300 }}>
              <textarea
                readOnly
                value={uniOutput}
                className="textarea-editor font-ghanshyam"
                placeholder="Converted text will appear here..."
                style={{ opacity: isUniConverting ? 0.55 : 1, fontSize: 20, height: '100%' }}
              />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
