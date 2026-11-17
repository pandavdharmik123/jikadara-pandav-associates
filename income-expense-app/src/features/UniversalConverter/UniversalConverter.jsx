import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Select, Typography, Button, Tooltip, message, Badge } from 'antd';
import { ArrowLeftRight, XCircle, Copy } from 'lucide-react';
import { transliterateLatinRunsToGujarati } from '../../utils/batchTransliterate';
import { convertUnicodeToGhanshyamLegacy } from '../../utils/ghanshyamLegacy';
import { convertHarikrishnaTemplateToUnicode } from '../../utils/reverseHarikrishnaTemplate';
import { convertUnicodeToPhonetic } from '../../utils/gujaratiToPhonetic';

async function performConversion(inputText, fromType, toType) {
  if (!inputText) return '';
  if (fromType === toType) return inputText;

  let result = inputText;

  if (fromType === 'ghanshyam') {
    // Convert Ghanshyam legacy to Unicode first
    result = convertHarikrishnaTemplateToUnicode(result);

    if (toType === 'english') {
      result = convertUnicodeToPhonetic(result);
    }
    // if toType === 'unicode', result is already Unicode
  } else if (fromType === 'english') {
    // English (phonetic) to Unicode
    result = await transliterateLatinRunsToGujarati(result);

    if (toType === 'ghanshyam') {
      result = convertUnicodeToGhanshyamLegacy(result);
    }
    // if toType === 'unicode', result is already Unicode
  } else if (fromType === 'unicode') {
    if (toType === 'ghanshyam') {
      result = convertUnicodeToGhanshyamLegacy(result);
    } else if (toType === 'english') {
      result = convertUnicodeToPhonetic(result);
    }
  }

  return result;
}

export default function UniversalConverter({ themeMode, currentAccentColor }) {
  const [uniFrom, setUniFrom] = useState('unicode');
  const [uniTo, setUniTo] = useState('ghanshyam');
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [activeSide, setActiveSide] = useState('left'); // 'left' | 'right'
  const [isConverting, setIsConverting] = useState(false);

  // Debounced conversion depending on which side was last edited
  useEffect(() => {
    if (!activeSide) return;

    const delay = setTimeout(async () => {
      setIsConverting(true);
      try {
        if (activeSide === 'left') {
          if (!leftText) {
            setRightText('');
          } else {
            const converted = await performConversion(leftText, uniFrom, uniTo);
            setRightText(converted);
          }
        } else if (activeSide === 'right') {
          if (!rightText) {
            setLeftText('');
          } else {
            const converted = await performConversion(rightText, uniTo, uniFrom);
            setLeftText(converted);
          }
        }
      } catch (err) {
        console.error('Universal Converter error:', err);
      } finally {
        setIsConverting(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [leftText, rightText, activeSide, uniFrom, uniTo]);

  // When uniFrom or uniTo changes, trigger re-conversion from left side
  const handleFromChange = (newFrom) => {
    setUniFrom(newFrom);
    setActiveSide('left');
  };

  const handleToChange = (newTo) => {
    setUniTo(newTo);
    setActiveSide('left');
  };

  const handleLeftChange = (e) => {
    setLeftText(e.target.value);
    setActiveSide('left');
  };

  const handleRightChange = (e) => {
    setRightText(e.target.value);
    setActiveSide('right');
  };

  const handleSwap = () => {
    const nextFrom = uniTo;
    const nextTo = uniFrom;
    setUniFrom(nextFrom);
    setUniTo(nextTo);

    // Swap contents so user keeps their current text in the respective sides
    const prevLeft = leftText;
    const prevRight = rightText;
    setLeftText(prevRight);
    setRightText(prevLeft);
    setActiveSide('left');
  };

  const handleClearLeft = () => {
    setLeftText('');
    setRightText('');
    setActiveSide('left');
  };

  const handleClearRight = () => {
    setRightText('');
    setLeftText('');
    setActiveSide('right');
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard!`);
  };

  const getFontLabel = (key) => {
    if (key === 'unicode') return 'Gujarati Unicode';
    if (key === 'ghanshyam') return 'Ghanshyam (Legacy)';
    if (key === 'english') return 'English (Phonetic)';
    return key;
  };

  const getPlaceholder = (fontKey) => {
    if (fontKey === 'unicode') {
      return "Type or paste Gujarati Unicode here (e.g. કેમ છો, નમસ્તે)...";
    }
    if (fontKey === 'ghanshyam') {
      return "Type or paste Ghanshyam font keystrokes here (e.g. k[m Ci[, nmAt[)...";
    }
    return "Type English phonetics here (e.g. kem cho, namaste)...";
  };

  return (
    <div className="universal-tab-wrap" style={{ padding: '8px 0 20px', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* <span style={{ fontWeight: 600, minWidth: 42 }}>Side 1:</span> */}
          <Select value={uniFrom} onChange={handleFromChange} style={{ width: '100%' }}>
            <Select.Option value="unicode">Gujarati Unicode</Select.Option>
            <Select.Option value="ghanshyam">Ghanshyam (Legacy Font)</Select.Option>
            <Select.Option value="english">English (Phonetic)</Select.Option>
          </Select>
        </div>

        <Tooltip title="Swap font directions and content">
          <Button
            type="text"
            shape="circle"
            icon={<ArrowLeftRight size={18} style={{ color: currentAccentColor }} />}
            onClick={handleSwap}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </Tooltip>

        <div style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* <span style={{ fontWeight: 600, minWidth: 42 }}>Side 2:</span> */}
          <Select value={uniTo} onChange={handleToChange} style={{ width: '100%' }}>
            <Select.Option value="ghanshyam">Ghanshyam (Legacy Font)</Select.Option>
            <Select.Option value="unicode">Gujarati Unicode</Select.Option>
            <Select.Option value="english">English (Phonetic)</Select.Option>
          </Select>
        </div>
      </div>

      <Row gutter={[24, 24]} style={{ display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
        {/* Left Section (Editable) */}
        <Col xs={24} md={12}>
          <div className="editor-card" style={{ height: '100%', minHeight: '340px', border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}` }}>
            <div className="editor-header">
              <div className="editor-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge color={activeSide === 'left' ? currentAccentColor : '#8c8c8c'} status={isConverting && activeSide === 'left' ? "processing" : "default"} />
                <span>{getFontLabel(uniFrom)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(Editable)</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Tooltip title="Copy text">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<Copy size={15} />}
                    onClick={() => handleCopy(leftText, getFontLabel(uniFrom))}
                    disabled={!leftText}
                  />
                </Tooltip>
                <Tooltip title="Clear text">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<XCircle size={15} />}
                    onClick={handleClearLeft}
                    disabled={!leftText && !rightText}
                  />
                </Tooltip>
              </div>
            </div>
            <div className="editor-body" style={{ minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <textarea
                className={`textarea-editor ${uniFrom === 'ghanshyam' ? 'font-ghanshyam' : ''}`}
                value={leftText}
                onChange={handleLeftChange}
                placeholder={getPlaceholder(uniFrom)}
                spellCheck={uniFrom === 'english'}
                style={{
                  height: '100%',
                  flex: 1,
                  fontSize: uniFrom === 'ghanshyam' ? 20 : 16,
                  lineHeight: 1.6
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', borderTop: `1px solid ${themeMode === 'dark' ? '#262626' : '#f5f5f5'}` }}>
                <span>{uniFrom === 'ghanshyam' ? 'Displays in Ghanshyam font' : 'Unicode text'}</span>
                <span>{leftText.length} Chars</span>
              </div>
            </div>
          </div>
        </Col>

        {/* Right Section (Editable) */}
        <Col xs={24} md={12}>
          <div className="editor-card" style={{ height: '100%', minHeight: '340px', border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`, borderLeft: `4px solid ${currentAccentColor}` }}>
            <div className="editor-header">
              <div className="editor-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge color={activeSide === 'right' ? currentAccentColor : '#8c8c8c'} status={isConverting && activeSide === 'right' ? "processing" : "default"} />
                <span>{getFontLabel(uniTo)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(Editable)</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Tooltip title="Copy text">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<Copy size={15} />}
                    onClick={() => handleCopy(rightText, getFontLabel(uniTo))}
                    disabled={!rightText}
                  />
                </Tooltip>
                <Tooltip title="Clear text">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<XCircle size={15} />}
                    onClick={handleClearRight}
                    disabled={!leftText && !rightText}
                  />
                </Tooltip>
              </div>
            </div>
            <div className="editor-body" style={{ minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <textarea
                className={`textarea-editor ${uniTo === 'ghanshyam' ? 'font-ghanshyam' : ''}`}
                value={rightText}
                onChange={handleRightChange}
                placeholder={getPlaceholder(uniTo)}
                spellCheck={uniTo === 'english'}
                style={{
                  height: '100%',
                  flex: 1,
                  fontSize: uniTo === 'ghanshyam' ? 20 : 16,
                  lineHeight: 1.6
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', borderTop: `1px solid ${themeMode === 'dark' ? '#262626' : '#f5f5f5'}` }}>
                <span>{uniTo === 'ghanshyam' ? 'Displays in Ghanshyam font' : 'Unicode text'}</span>
                <span>{rightText.length} Chars</span>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
