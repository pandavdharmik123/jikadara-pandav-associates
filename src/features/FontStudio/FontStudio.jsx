import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Button, Select, Slider, Space, Typography, Tooltip, Badge, Divider, message } from 'antd';
import { CopyOutlined, DownloadOutlined, ClearOutlined, SoundOutlined, SettingOutlined, TranslationOutlined, BgColorsOutlined, FontSizeOutlined } from '@ant-design/icons';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import { convertUnicodeToGhanshyamLegacy } from '../../utils/ghanshyamLegacy';
import { transliterateLatinRunsToGujarati } from '../../utils/batchTransliterate';
import { COLOR_PALETTES, GUJARATI_FONTS } from '../../utils/constants';

const { Paragraph, Text } = Typography;

export default function FontStudio({ 
  themeMode, 
  currentAccentColor, 
  activeColor, 
  setActiveColor, 
  text,
  setText
}) {
  const [activeFont, setActiveFont] = useState('font-noto-sans');
  const [fontSize, setFontSize] = useState(24);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [batchConverting, setBatchConverting] = useState(false);

  const isGhanshyam = activeFont === 'font-ghanshyam';

  const outputText = useMemo(() => {
    if (!text) return '';
    return isGhanshyam ? convertUnicodeToGhanshyamLegacy(text) : text;
  }, [text, isGhanshyam]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;

  const handleBatchLatinToUnicode = async () => {
    if (!text.trim()) return;
    setBatchConverting(true);
    try {
      const converted = await transliterateLatinRunsToGujarati(text, 'gu');
      setText(converted);
      message.success('Latin words converted to Gujarati!');
    } catch (err) {
      console.error('Batch convert failed:', err);
      message.error('Conversion failed.');
    } finally {
      setBatchConverting(false);
    }
  };

  const clearWorkspace = () => {
    setText('');
    message.info('Workspace cleared');
  };

  const copyToClipboard = () => {
    if (!outputText) {
      return message.warning('Nothing to copy!');
    }
    navigator.clipboard.writeText(outputText);
    message.success(isGhanshyam ? 'Copied legacy Harikrishna keys!' : 'Copied standard Unicode Gujarati!');
  };

  const downloadTextFile = () => {
    if (!outputText) {
      return message.warning('Nothing to download!');
    }
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gujarati-text-${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('File downloaded!');
  };

  const handleSpeak = () => {
    if (!text) return message.warning('No text to read!');
    if (!('speechSynthesis' in window)) return message.error('Text-to-speech not supported');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'gu-IN';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="dashboard-grid" style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Theme / Palette Customizer Bar */}
        <div className="controls-panel glass-panel">
          <div className="control-group">
            <span className="control-label">
              <BgColorsOutlined style={{ marginRight: 6 }} />
              Accent Aura:
            </span>
            <Space size="small">
              {Object.entries(COLOR_PALETTES).map(([key, value]) => (
                <Tooltip key={key} title={value.name}>
                  <button
                    onClick={() => setActiveColor(key)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: value.primary,
                      border: activeColor === key ? '2px solid var(--text-primary)' : 'none',
                      cursor: 'pointer',
                      boxShadow: activeColor === key ? '0 0 10px ' + value.primary : 'none',
                      transform: activeColor === key ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </Tooltip>
              ))}
            </Space>
          </div>

          <div className="control-group">
            <span className="control-label">
              <FontSizeOutlined style={{ marginRight: 6 }} />
              Font Style Preview:
            </span>
            <Select
              value={activeFont}
              onChange={(val) => setActiveFont(val)}
              options={GUJARATI_FONTS}
              style={{ width: 280 }}
              popupClassName="custom-select-popup"
            />
          </div>
        </div>

        {/* Pipeline: Roman → Unicode → preview / Ghanshyam legacy */}
        <div className="editors-container studio-editors-container" style={{ flex: 1, minHeight: 0 }}>
          {/* Step 1: English / Roman phonetic input */}
          <div className="editor-card glass-panel">
            <div className="editor-header">
              <div className="editor-title">
                <Badge color={currentAccentColor} status="processing" />
                <span>1 · Roman / English (phonetic)</span>
              </div>
              <Space size="small">
                <Tooltip title="Convert every Latin word to Unicode at once (good for pasted text like Kem Chho?)">
                  <Button
                    type="primary"
                    size="small"
                    loading={batchConverting}
                    onClick={handleBatchLatinToUnicode}
                    disabled={!text.trim()}
                  >
                    Latin → Unicode
                  </Button>
                </Tooltip>
                <Tooltip title="Clear Input">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<ClearOutlined />}
                    onClick={clearWorkspace}
                    disabled={!text}
                  />
                </Tooltip>
              </Space>
            </div>

            <div className="editor-body">
              <IndicTransliterate
                renderComponent={(props) => (
                  <textarea
                    {...props}
                    className="textarea-editor"
                    placeholder="Type phonetically, Space to pick Gujarati (e.g. kem cho), or paste Kem Chho? and use Latin → Unicode."
                  />
                )}
                value={text}
                onChangeText={(val) => setText(val)}
                lang="gu"
              />
            </div>

            <div className="editor-footer">
              <span>Live transliteration: finish each word with Space / Enter / Tab, or batch-convert the whole line.</span>
              <span style={{ fontSize: 11, opacity: 0.8 }}>Suggestions appear under the active word</span>
            </div>
          </div>

          {/* Step 2: Standard Unicode Gujarati (always Noto Sans Gujarati for clarity) */}
          <div className="editor-card glass-panel">
            <div className="editor-header">
              <div className="editor-title">
                <span style={{ color: currentAccentColor }}>●</span>
                <span>2 · Unicode Gujarati (standard)</span>
              </div>
            </div>
            <div className="editor-body">
              <textarea
                readOnly
                value={text}
                className="textarea-editor font-noto-sans"
                placeholder="કેમ છો? appears here after you transliterate…"
                aria-label="Unicode Gujarati preview"
              />
            </div>
            <div className="editor-footer">
              <span>Unicode codepoints (UTF-8). Same string as step 1 once Roman is converted.</span>
              <span style={{ fontStyle: 'italic' }}>Read-only</span>
            </div>
          </div>

          {/* Step 3: Chosen display font or Ghanshyam legacy bytes */}
          <div className="editor-card glass-panel" style={{ borderLeft: `2px solid ${currentAccentColor}` }}>
            <div className="editor-header">
              <div className="editor-title">
                <span style={{ color: currentAccentColor }}>●</span>
                <span>3 · Preview & export</span>
              </div>
              <Space>
                <Tooltip title="Read Aloud">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<SoundOutlined />}
                    onClick={handleSpeak}
                    disabled={!text}
                  />
                </Tooltip>
                <Tooltip title="Copy to Clipboard">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<CopyOutlined />}
                    onClick={copyToClipboard}
                    disabled={!text}
                  />
                </Tooltip>
                <Tooltip title="Download Text File">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<DownloadOutlined />}
                    onClick={downloadTextFile}
                    disabled={!text}
                  />
                </Tooltip>
              </Space>
            </div>

            <div className="editor-body">
              {isGhanshyam && (
                <div className="legacy-alert-banner">
                  <span className="legacy-alert-tag">Ghanshyam.ttf</span>
                  <span className="legacy-alert-message">
                    Step 2 Unicode is converted to <Text strong>Harikrishna-style</Text> Latin keystrokes (same template as Nilkanth / Ghanshyam). Apply <Text code>Ghanshyam.ttf</Text> here so those keys draw the same Gujarati shapes as step 2.
                  </span>
                </div>
              )}
              <textarea
                readOnly
                value={outputText}
                className={`textarea-editor ${activeFont}`}
                placeholder="Transliterated Gujarati text will dynamically mirror here in your chosen font..."
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  letterSpacing: `${letterSpacing}px`,
                }}
              />
            </div>

            <div className="editor-footer">
              <span>Words: {words} | Characters: {chars}</span>
              <span style={{ fontStyle: 'italic' }}>Live Display</span>
            </div>
          </div>
        </div>

        {/* Typography Detailed Controllers */}
        <Card className="glass-panel" title={<div style={{ fontSize: 14, fontWeight: 600 }}><SettingOutlined /> Fine-Tune Typography Metrics</div>} bordered={false}>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={8}>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Font Size ({fontSize}px)</Text>
              <Slider
                min={14}
                max={72}
                value={fontSize}
                onChange={(val) => setFontSize(val)}
                tooltip={{ formatter: (v) => `${v}px` }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Line Height ({lineHeight})</Text>
              <Slider
                min={1.1}
                max={3.0}
                step={0.1}
                value={lineHeight}
                onChange={(val) => setLineHeight(val)}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Letter Spacing ({letterSpacing}px)</Text>
              <Slider
                min={-2}
                max={12}
                value={letterSpacing}
                onChange={(val) => setLetterSpacing(val)}
                tooltip={{ formatter: (v) => `${v}px` }}
              />
            </Col>
          </Row>
        </Card>
      </div>

      {/* Right Column/Sidebar Widget: Quick History & Instructions */}
      <div className="sidebar-panel glass-panel">
        <div className="sidebar-header">
          <span className="sidebar-title">
            <TranslationOutlined style={{ color: currentAccentColor }} /> Quick Ref Sheets
          </span>
        </div>

        <Paragraph style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Pipeline: Roman (step 1) → Unicode Gujarati (step 2) → your chosen font or Ghanshyam legacy encoding (step 3). Use <Text strong>Latin → Unicode</Text> after pasting phrases like <Text code>Kem Chho?</Text>.
        </Paragraph>

        <div style={{ background: 'rgba(0,0,0,0.1)', padding: 12, borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Examples:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
            <Text type="secondary">Kem Chho?</Text> <Text strong style={{ color: currentAccentColor }}>કેમ છો?</Text>
            <Text type="secondary">kem cho</Text> <Text strong style={{ color: currentAccentColor }}>કેમ છો</Text>
            <Text type="secondary">namaste</Text> <Text strong style={{ color: currentAccentColor }}>નમસ્તે</Text>
            <Text type="secondary">bharat</Text> <Text strong style={{ color: currentAccentColor }}>ભારત</Text>
            <Text type="secondary">gujarati</Text> <Text strong style={{ color: currentAccentColor }}>ગુજરાતી</Text>
          </div>
        </div>

      </div>
    </div>
  );
}
