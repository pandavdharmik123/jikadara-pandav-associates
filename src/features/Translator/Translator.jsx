import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Space, Tooltip, Badge, Typography, message } from 'antd';
import { CopyOutlined, ClearOutlined } from '@ant-design/icons';
import { transliterateLatinRunsToGujarati } from '../../utils/batchTransliterate';
import { convertUnicodeToGhanshyamLegacy } from '../../utils/ghanshyamLegacy';

const { Paragraph, Text } = Typography;

export default function Translator({ themeMode, currentAccentColor }) {
  const [enGuEnglish, setEnGuEnglish] = useState('');
  const [enGuGujarati, setEnGuGujarati] = useState('');
  const [enGuTransliterating, setEnGuTransliterating] = useState(false);
  const enGuTranslitSeq = useRef(0);
  const enGuDebounceRef = useRef(null);

  const enGuGhanshyamLegacy = useMemo(
    () => convertUnicodeToGhanshyamLegacy(enGuGujarati),
    [enGuGujarati]
  );

  const handleEnGuConvertNow = async () => {
    if (!enGuEnglish.trim()) {
      return;
    }
    if (enGuDebounceRef.current) {
      clearTimeout(enGuDebounceRef.current);
      enGuDebounceRef.current = null;
    }
    const seq = ++enGuTranslitSeq.current;
    setEnGuTransliterating(true);
    try {
      const converted = await transliterateLatinRunsToGujarati(enGuEnglish, 'gu');
      if (seq === enGuTranslitSeq.current) {
        setEnGuGujarati(converted);
      }
    } catch (err) {
      console.error('Immediate translation error:', err);
      if (seq === enGuTranslitSeq.current) {
        message.error('Translation failed. Please try again.');
      }
    } finally {
      if (seq === enGuTranslitSeq.current) {
        setEnGuTransliterating(false);
      }
    }
  };

  const copyEnGuUnicode = () => {
    if (!enGuGujarati.trim()) {
      return message.warning('Nothing to copy');
    }
    navigator.clipboard.writeText(enGuGujarati);
    message.success('Gujarati Unicode text copied!');
  };

  const copyEnGuGhanshyam = () => {
    if (!enGuGhanshyamLegacy.trim()) {
      return message.warning('Nothing to copy');
    }
    navigator.clipboard.writeText(enGuGhanshyamLegacy);
    message.success('Ghanshyam keystrokes copied! Paste into Word with Ghanshyam font.');
  };

  const clearEnGuTab = () => {
    if (!enGuEnglish && !enGuGujarati) return;
    enGuTranslitSeq.current += 1;
    if (enGuDebounceRef.current) {
      clearTimeout(enGuDebounceRef.current);
      enGuDebounceRef.current = null;
    }
    setEnGuEnglish('');
    setEnGuGujarati('');
    setEnGuTransliterating(false);
  };

  const onEnGuEnglishChange = (e) => {
    setEnGuEnglish(e.target.value);
  };

  useEffect(() => {
    if (enGuDebounceRef.current) {
      clearTimeout(enGuDebounceRef.current);
      enGuDebounceRef.current = null;
    }

    if (!enGuEnglish.trim()) {
      enGuTranslitSeq.current += 1;
      setEnGuGujarati('');
      setEnGuTransliterating(false);
      return;
    }

    const seq = ++enGuTranslitSeq.current;
    setEnGuTransliterating(true);
    enGuDebounceRef.current = setTimeout(() => {
      transliterateLatinRunsToGujarati(enGuEnglish, 'gu')
        .then((converted) => {
          if (seq === enGuTranslitSeq.current) {
            setEnGuGujarati(converted);
            setEnGuTransliterating(false);
          }
        })
        .catch((err) => {
          if (seq === enGuTranslitSeq.current) {
            console.error('Translation error:', err);
            setEnGuTransliterating(false);
          }
        });
    }, 420);

    return () => {
      if (enGuDebounceRef.current) {
        clearTimeout(enGuDebounceRef.current);
        enGuDebounceRef.current = null;
      }
    };
  }, [enGuEnglish]);

  return (
    <div className="translator-tab-wrap" style={{ padding: '8px 0 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Paragraph style={{ marginBottom: 16, color: 'var(--text-secondary)', maxWidth: 900 }}>
        Three steps: <Text strong>English</Text> → <Text strong>Unicode Gujarati</Text> (auto) → <Text strong>Harikrishna keystrokes</Text> for <Text code>Ghanshyam.ttf</Text> / Nilkanth (Latin letters that render as Gujarati when the font is applied). Put <Text code>Ghanshyam.ttf</Text> in <Text code>public/</Text> so it loads as <Text code>/Ghanshyam.ttf</Text>. Copy step 3 for Word / PageMaker with the font installed.
      </Paragraph>
      <div className="editors-container translator-tab-editors" style={{ flex: 1, minHeight: 0 }}>
        <div className="editor-card glass-panel">
          <div className="editor-header">
            <div className="editor-title">
              <Badge color={currentAccentColor} status="processing" />
              <span>English / Roman (input only)</span>
            </div>
            <Space size="small">
              <Tooltip title="Transliterate to Gujarati immediately">
                <Button
                  type="primary"
                  size="small"
                  loading={enGuTransliterating}
                  onClick={handleEnGuConvertNow}
                  disabled={!enGuEnglish.trim()}
                >
                  Convert now
                </Button>
              </Tooltip>
              <Tooltip title="Clear all three panels">
                <Button
                  type="text"
                  shape="circle"
                  icon={<ClearOutlined />}
                  onClick={clearEnGuTab}
                  disabled={!enGuEnglish && !enGuGujarati && !enGuGhanshyamLegacy}
                />
              </Tooltip>
            </Space>
          </div>
          <div className="editor-body">
            <textarea
              className="textarea-editor"
              value={enGuEnglish}
              onChange={onEnGuEnglishChange}
              placeholder="Type in English only, e.g. hello hello kem cho"
              spellCheck={true}
              lang="en"
              aria-label="English input"
            />
          </div>
          <div className="editor-footer">
            <span>Characters: {enGuEnglish.length}</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>Gujarati script is not kept here</span>
          </div>
        </div>
        <div className="editor-card glass-panel" style={{ borderLeft: `2px solid ${currentAccentColor}` }}>
          <div className="editor-header">
            <div className="editor-title">
              <span style={{ color: currentAccentColor }}>●</span>
              <span>Unicode Gujarati (output only)</span>
            </div>
            <Tooltip title="Copy Gujarati text">
              <Button
                type="text"
                shape="circle"
                icon={<CopyOutlined />}
                onClick={copyEnGuUnicode}
                disabled={!enGuGujarati.trim()}
              />
            </Tooltip>
          </div>
          <div className="editor-body">
            <textarea
              readOnly
              value={enGuGujarati}
              className="textarea-editor font-noto-sans"
              placeholder="હેલો — Gujarati Unicode appears here…"
              aria-label="Unicode Gujarati output"
              style={{ opacity: enGuTransliterating ? 0.55 : 1 }}
            />
          </div>
          <div className="editor-footer">
            <span>
              Characters: {enGuGujarati.length}
              {enGuTransliterating ? ' · updating…' : ''}
            </span>
            <span style={{ fontStyle: 'italic' }}>Noto Sans Gujarati · auto-updates while typing</span>
          </div>
        </div>
        <div
          className="editor-card glass-panel translator-tab-ghanshyam-card"
          style={{ borderLeft: `2px solid ${currentAccentColor}` }}
        >
          <div className="editor-header">
            <div className="editor-title">
              <span style={{ color: currentAccentColor }}>●</span>
              <span>Ghanshyam.ttf (legacy view)</span>
            </div>
            <Tooltip title="Copy legacy-encoded text for apps using Ghanshyam font">
              <Button
                type="text"
                shape="circle"
                icon={<CopyOutlined />}
                onClick={copyEnGuGhanshyam}
                disabled={!enGuGhanshyamLegacy.trim()}
              />
            </Tooltip>
          </div>
          <div className="editor-body">
            {/* <div className="legacy-alert-banner" style={{ margin: '0 12px 8px', flexShrink: 0 }}>
              <span className="legacy-alert-tag">Encoding</span>
              <span className="legacy-alert-message">
                This column is <Text strong>ASCII / Latin keystrokes</Text> in the Harikrishna font template (e.g. કેમ → <Text code>k[m</Text>), not Gopika-style bytes. Paste into Word or PageMaker with <Text code>Ghanshyam.ttf</Text> applied so the letters render as Gujarati. If a rare conjunct looks wrong, compare with the same font typed by hand.
              </span>
            </div> */}
            <textarea
              readOnly
              value={enGuGhanshyamLegacy}
              className="textarea-editor font-ghanshyam"
              placeholder="હેલો કેમ છો? — same look, Ghanshyam mapping…"
              aria-label="Ghanshyam legacy text"
              style={{
                opacity: enGuTransliterating ? 0.55 : 1,
                fontSize: 20,
              }}
            />
          </div>
          <div className="editor-footer">
            <span>Characters: {enGuGhanshyamLegacy.length}</span>
            <span style={{ fontStyle: 'italic' }}>Ghanshyam.ttf</span>
          </div>
        </div>
      </div>
    </div>
  );
}
