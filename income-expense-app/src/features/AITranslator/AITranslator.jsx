import { useMemo, useState } from 'react';
import { Button, Card, Select, Space, Tag, Tooltip, Typography, message } from 'antd';
import {
  ArrowRightLeft,
  Copy,
  Eraser,
  Languages,
  Loader2,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;

const MAX_TEXT_LENGTH = 10000;

const DIRECTIONS = [
  { value: 'auto-gu', label: 'Auto detect → Gujarati' },
  { value: 'auto-en', label: 'Auto detect → English' },
  { value: 'en-gu', label: 'English → Gujarati' },
  { value: 'gu-en', label: 'Gujarati → English' },
];

export default function AITranslator({ currentAccentColor = '#2563eb' }) {
  const [direction, setDirection] = useState('auto-gu');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [model, setModel] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');

  const { sourceLang, targetLang, inputLabel, outputLabel, placeholder } = useMemo(() => {
    const [sourcePart, targetPart] = direction.split('-');
    const isAuto = sourcePart === 'auto';
    const isEnglishTarget = targetPart === 'en';

    return {
      sourceLang: isAuto ? 'auto' : sourcePart,
      targetLang: targetPart,
      inputLabel: isAuto ? 'Source text (English or Gujarati)' : isEnglishTarget ? 'ગુજરાતી ટેક્સ્ટ (Gujarati text)' : 'English text',
      outputLabel: isEnglishTarget ? 'English translation' : 'ગુજરાતી અનુવાદ (Gujarati translation)',
      placeholder: isEnglishTarget
        ? 'ગુજરાતી ટેક્સ્ટ અહીં પેસ્ટ કરો, દા.ત. "આ વેચાણ દસ્તાવેજ સબ-રજિસ્ટ્રાર કચેરી, સુરતમાં નોંધાયેલ છે."'
        : 'Paste or type English text here, e.g. "This sale deed is registered at the Sub-Registrar office, Surat."',
    };
  }, [direction]);

  const canTranslate = inputText.trim().length > 0 && !isTranslating;

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      message.warning('Please enter some text to translate.');
      return;
    }
    if (inputText.length > MAX_TEXT_LENGTH) {
      message.error(`Please keep the text under ${MAX_TEXT_LENGTH.toLocaleString('en-IN')} characters.`);
      return;
    }

    setIsTranslating(true);
    setError('');
    try {
      const { data } = await api.post('/translate', {
        text: inputText,
        sourceLang,
        targetLang,
      });

      setOutputText(data.translation || '');
      setModel(data.model && data.model !== 'none' ? data.model : '');
    } catch (err) {
      const apiMessage = err.response?.data?.error || err.message || 'Translation failed.';
      setError(apiMessage);
      message.error(apiMessage);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwap = () => {
    setDirection((current) => {
      const [sourcePart, targetPart] = current.split('-');
      if (sourcePart === 'auto') return targetPart === 'en' ? 'auto-gu' : 'auto-en';
      return targetPart === 'en' ? 'gu-en' : 'en-gu';
    });
    setInputText(outputText);
    setOutputText(inputText);
    setModel('');
    setError('');
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setModel('');
    setError('');
  };

  const handleCopy = async () => {
    if (!outputText.trim()) {
      message.warning('Nothing to copy yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(outputText);
      message.success('Translation copied.');
    } catch {
      message.error('Could not copy to the clipboard.');
    }
  };

  const handleKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleTranslate();
    }
  };

  return (
    <div className="advocate-module" style={{ paddingBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>
            <Space size={8}>
              <Languages size={26} color={currentAccentColor} />
              <span>AI Translator</span>
            </Space>
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Legal translation between English and Gujarati using Gemini AI, following the office's expert legal-translation brief.
          </Text>
        </div>

        <Space wrap>
          <Tag color="purple" icon={<Sparkles size={13} />} style={{ padding: '3px 10px', borderRadius: 999 }}>
            Gemini AI
          </Tag>
          <Select
            aria-label="Translation direction"
            value={direction}
            onChange={setDirection}
            options={DIRECTIONS}
            style={{ width: 220 }}
          />
          <Tooltip title="Swap languages and text">
            <Button
              aria-label="Swap languages and text"
              title="Swap languages and text"
              icon={<ArrowRightLeft size={16} />}
              onClick={handleSwap}
            />
          </Tooltip>
        </Space>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        <Card
          bordered={false}
          className="glass-panel"
          style={{ flex: '1 1 440px', minWidth: 0, borderRadius: 16 }}
          styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', gap: 10 } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text strong>{inputLabel}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {inputText.length.toLocaleString('en-IN')} / {MAX_TEXT_LENGTH.toLocaleString('en-IN')}
            </Text>
          </div>

          <textarea
            aria-label={inputLabel}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 320,
              flex: 1,
              resize: 'vertical',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 15,
              lineHeight: 1.6,
              color: '#0f172a',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Space size={8}>
              <Button onClick={handleClear} disabled={!inputText && !outputText} icon={<Eraser size={15} />}>
                Clear
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Ctrl/⌘ + Enter to translate
              </Text>
            </Space>

            <Button
              type="primary"
              onClick={handleTranslate}
              loading={isTranslating}
              disabled={!canTranslate}
              icon={isTranslating ? <Loader2 size={16} /> : <Sparkles size={16} />}
              style={{ backgroundColor: currentAccentColor, borderColor: currentAccentColor }}
            >
              Translate
            </Button>
          </div>
        </Card>

        <Card
          bordered={false}
          className="glass-panel"
          style={{ flex: '1 1 440px', minWidth: 0, borderRadius: 16, borderTop: `3px solid ${currentAccentColor}` }}
          styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', gap: 10 } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text strong>{outputLabel}</Text>
            <Space size={8}>
              {model ? <Tag style={{ marginInlineEnd: 0 }}>{model}</Tag> : null}
              <Tooltip title="Copy translation">
                <Button
                  aria-label="Copy translation"
                  title="Copy translation"
                  icon={<Copy size={15} />}
                  onClick={handleCopy}
                  disabled={!outputText.trim()}
                />
              </Tooltip>
            </Space>
          </div>

          <textarea
            aria-label={outputLabel}
            value={outputText}
            readOnly
            placeholder="Translation appears here…"
            style={{
              width: '100%',
              minHeight: 320,
              flex: 1,
              resize: 'vertical',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 15,
              lineHeight: 1.6,
              color: '#0f172a',
              backgroundColor: '#f8fafc',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {outputText.length.toLocaleString('en-IN')} characters
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Output is Gujarati Unicode when translating into Gujarati.
            </Text>
          </div>
        </Card>
      </div>

      {error ? (
        <Card
          bordered={false}
          style={{ marginTop: 16, borderRadius: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Text style={{ color: '#b91c1c' }}>{error}</Text>
        </Card>
      ) : null}

      <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
        AI output can be imperfect. Always verify names, amounts, survey numbers, and legal terms before
        using a translation in a filed document.
      </Paragraph>
    </div>
  );
}
