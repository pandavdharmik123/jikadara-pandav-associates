import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ConfigProvider,
  Layout,
  Row,
  Col,
  Card,
  Button,
  Select,
  Slider,
  Space,
  Typography,
  Switch,
  Tooltip,
  Badge,
  Drawer,
  Input,
  Modal,
  theme,
  message,
  Divider,
  Tabs,
  Menu
} from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  ClearOutlined,
  SoundOutlined,
  HistoryOutlined,
  SaveOutlined,
  BulbOutlined,
  BulbFilled,
  SettingOutlined,
  TranslationOutlined,
  UndoOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  CheckOutlined,
  PlusOutlined,
  DeleteOutlined,
  SunOutlined,
  MoonOutlined,
  SwapRightOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import { convertUnicodeToGhanshyamLegacy } from './utils/ghanshyamLegacy';
import { transliterateLatinRunsToGujarati } from './utils/batchTransliterate';
import JantriCalculator from './components/JantriCalculator';

import './App.css';

// Intercept fetch calls to redirect the dead AI4Bharat API requests to the active Google Input Tools API
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) ? input.url : '';

  if (url && (url.includes('xlit-api.ai4bharat.org') || url.includes('/tl/'))) {
    try {
      const parts = url.split('/');
      const tlIndex = parts.indexOf('tl');
      if (tlIndex !== -1 && parts.length > tlIndex + 2) {
        const lang = parts[tlIndex + 1];
        const word = decodeURIComponent(parts[tlIndex + 2]);

        const googleUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&ime=transliteration_en_${lang}&num=5&cp=0&cs=0&ie=utf-8&oe=utf-8&app=jsapi`;
        const googleResponse = await originalFetch(googleUrl);
        const googleData = await googleResponse.json();

        let suggestions = [];
        if (googleData && googleData[0] === 'SUCCESS' && googleData[1] && googleData[1][0]) {
          suggestions = googleData[1][0][1] || [];
        }

        const mockData = { result: suggestions };
        return new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (err) {
      console.error('Failed to intercept and transliterate via Google API:', err);
    }
  }

  return originalFetch.apply(this, arguments);
};

const { Header, Sider, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

const COLOR_PALETTES = {
  indigo: { primary: '#6366f1', name: 'Indigo Aura' },
  violet: { primary: '#8b5cf6', name: 'Violet Spark' },
  emerald: { primary: '#10b981', name: 'Emerald Glow' },
  rose: { primary: '#f43f5e', name: 'Rose Petal' },
  amber: { primary: '#f59e0b', name: 'Amber Sun' }
};

const GUJARATI_FONTS = [
  { value: 'font-noto-sans', label: 'Noto Sans Gujarati (Clean)' },
  { value: 'font-noto-serif', label: 'Noto Serif Gujarati (Traditional)' },
  { value: 'font-baloo', label: 'Baloo Bhai 2 (Rounded / Soft)' },
  { value: 'font-mogra', label: 'Mogra (Artistic / Bold)' },
  { value: 'font-farsan', label: 'Farsan (Calligraphic / Script)' },
  { value: 'font-ghanshyam', label: 'Ghanshyam (Legacy Font - Conversion Active)' }
];

const EN_GU_DEBOUNCE_MS = 420;
/** Gujarati Unicode block — stripped from the English pane so that side stays Roman-only. */
const GUJARATI_UNICODE_RE = /[\u0A80-\u0AFF]/g;

function App() {
  // Theme and Styling State
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('font-conv-theme') || 'dark';
  });
  const [activeColor, setActiveColor] = useState(() => {
    return localStorage.getItem('font-conv-accent') || 'indigo';
  });

  // Main navigation: full studio vs. English → Unicode only
  const [mainTab, setMainTab] = useState('studio');
  const [collapsed, setCollapsed] = useState(false);

  // Editor Text State (canonical Unicode Gujarati once converted; may contain Roman while typing)
  const [text, setText] = useState('');
  const [batchConverting, setBatchConverting] = useState(false);

  // English → Unicode tab: left = English/Roman only, right = Gujarati Unicode only
  const [enGuEnglish, setEnGuEnglish] = useState('');
  const [enGuGujarati, setEnGuGujarati] = useState('');
  const [enGuTransliterating, setEnGuTransliterating] = useState(false);
  const enGuTranslitSeq = useRef(0);
  const enGuDebounceRef = useRef(null);

  // Universal Converter State
  const [uniFrom, setUniFrom] = useState('english');
  const [uniTo, setUniTo] = useState('ghanshyam');
  const [uniInput, setUniInput] = useState('');
  const [uniOutput, setUniOutput] = useState('');
  const [isUniConverting, setIsUniConverting] = useState(false);
  const uniTranslitSeq = useRef(0);
  const uniDebounceRef = useRef(null);


  // Font Typography States
  const [activeFont, setActiveFont] = useState('font-baloo');
  const [fontSize, setFontSize] = useState(24);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [letterSpacing, setLetterSpacing] = useState(0);

  const isGhanshyam = activeFont === 'font-ghanshyam';
  const outputText = isGhanshyam ? convertUnicodeToGhanshyamLegacy(text) : text;

  const enGuGhanshyamLegacy = useMemo(
    () => convertUnicodeToGhanshyamLegacy(enGuGujarati),
    [enGuGujarati]
  );

  const handleBatchLatinToUnicode = async () => {
    if (!text.trim()) {
      message.warning('Type or paste Roman text first (e.g. Kem Chho?).');
      return;
    }
    setBatchConverting(true);
    try {
      const converted = await transliterateLatinRunsToGujarati(text, 'gu');
      setText(converted);
      message.success('Latin text converted to Unicode Gujarati.');
    } catch (err) {
      console.error(err);
      message.error('Batch transliteration failed. Check your network and try again.');
    } finally {
      setBatchConverting(false);
    }
  };

  const handleEnGuConvertNow = async () => {
    if (!enGuEnglish.trim()) {
      message.warning('Type or paste English / Roman text first (e.g. hello kem cho).');
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
        message.success('Gujarati text updated.');
      }
    } catch (err) {
      console.error(err);
      if (seq === enGuTranslitSeq.current) {
        message.error('Transliteration failed. Check your network and try again.');
      }
    } finally {
      if (seq === enGuTranslitSeq.current) {
        setEnGuTransliterating(false);
      }
    }
  };

  const copyEnGuUnicode = () => {
    if (!enGuGujarati.trim()) {
      message.warning('Nothing to copy yet — type English on the left and wait for Gujarati here.');
      return;
    }
    navigator.clipboard.writeText(enGuGujarati);
    message.success({ content: 'Unicode Gujarati copied.', icon: <CheckOutlined style={{ color: '#10b981' }} /> });
  };

  const copyEnGuGhanshyam = () => {
    if (!enGuGhanshyamLegacy.trim()) {
      message.warning('Nothing to copy yet — add Gujarati Unicode in step 2 first.');
      return;
    }
    navigator.clipboard.writeText(enGuGhanshyamLegacy);
    message.success({
      content: 'Ghanshyam-encoded text copied. Paste with Ghanshyam.ttf applied.',
      icon: <CheckOutlined style={{ color: '#10b981' }} />,
    });
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
    message.info('Cleared.');
  };

  const onEnGuEnglishChange = (e) => {
    const raw = e.target.value;
    const v = raw.replace(GUJARATI_UNICODE_RE, '');
    setEnGuEnglish(v);
  };

  // History and Saved Snippets State
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('font-conv-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');

  // Sync theme with document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    localStorage.setItem('font-conv-theme', themeMode);
  }, [themeMode]);

  // Sync primary color with localStorage
  useEffect(() => {
    localStorage.setItem('font-conv-accent', activeColor);
  }, [activeColor]);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('font-conv-history', JSON.stringify(history));
  }, [history]);

  // English → Unicode tab: debounced transliteration (English-only → Gujarati-only)
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

    enGuDebounceRef.current = setTimeout(() => {
      setEnGuTransliterating(true);
      transliterateLatinRunsToGujarati(enGuEnglish, 'gu')
        .then((converted) => {
          if (seq === enGuTranslitSeq.current) {
            setEnGuGujarati(converted);
          }
        })
        .catch((err) => {
          console.error(err);
          if (seq === enGuTranslitSeq.current) {
            message.error('Transliteration failed. Check your network and try again.');
          }
        })
        .finally(() => {
          if (seq === enGuTranslitSeq.current) {
            setEnGuTransliterating(false);
          }
        });
    }, EN_GU_DEBOUNCE_MS);

    return () => {
      if (enGuDebounceRef.current) {
        clearTimeout(enGuDebounceRef.current);
        enGuDebounceRef.current = null;
      }
    };
  }, [enGuEnglish]);

  // Universal Converter Effect
  useEffect(() => {
    if (uniDebounceRef.current) {
      clearTimeout(uniDebounceRef.current);
      uniDebounceRef.current = null;
    }

    if (!uniInput.trim()) {
      uniTranslitSeq.current += 1;
      setUniOutput('');
      setIsUniConverting(false);
      return;
    }

    const seq = ++uniTranslitSeq.current;

    if (uniFrom === 'unicode') {
      // Direct synchronous conversion
      const converted = convertUnicodeToGhanshyamLegacy(uniInput);
      setUniOutput(converted);
      setIsUniConverting(false);
    } else {
      // English (Phonetic) -> Unicode -> Legacy
      setIsUniConverting(true);
      uniDebounceRef.current = setTimeout(() => {
        transliterateLatinRunsToGujarati(uniInput, 'gu')
          .then((unicodeText) => {
            if (seq === uniTranslitSeq.current) {
              const legacy = convertUnicodeToGhanshyamLegacy(unicodeText);
              setUniOutput(legacy);
            }
          })
          .catch((err) => {
            console.error(err);
            if (seq === uniTranslitSeq.current) {
              message.error('Universal conversion failed.');
            }
          })
          .finally(() => {
            if (seq === uniTranslitSeq.current) {
              setIsUniConverting(false);
            }
          });
      }, EN_GU_DEBOUNCE_MS);
    }

    return () => {
      if (uniDebounceRef.current) {
        clearTimeout(uniDebounceRef.current);
        uniDebounceRef.current = null;
      }
    };
  }, [uniInput, uniFrom, uniTo]);


  // Handle dark/light theme switch
  const toggleTheme = (checked) => {
    setThemeMode(checked ? 'dark' : 'light');
  };

  // Copy Gujarati text to clipboard
  const copyToClipboard = () => {
    if (!outputText) {
      message.warning('No text to copy!');
      return;
    }
    navigator.clipboard.writeText(outputText);
    message.success({
      content: isGhanshyam
        ? 'Ghanshyam legacy text copied to clipboard! Ready to paste.'
        : 'Gujarati text copied to clipboard!',
      icon: <CheckOutlined style={{ color: '#10b981' }} />,
    });
  };

  // Clear Editor
  const clearWorkspace = () => {
    if (!text) return;
    Modal.confirm({
      title: 'Clear Workspace?',
      content: 'Are you sure you want to clear your current text?',
      okText: 'Yes, Clear',
      cancelText: 'Cancel',
      okType: 'danger',
      centered: true,
      onOk() {
        setText('');
        message.info('Workspace cleared');
      }
    });
  };

  // Download text file
  const downloadTextFile = () => {
    if (!outputText) {
      message.warning('No text to download!');
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = isGhanshyam ? `ghanshyam_text_${Date.now()}.txt` : `gujarati_text_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    message.success('Text downloaded successfully!');
  };

  // Text to Speech
  const handleSpeak = () => {
    if (!text) {
      message.warning('No text to speak!');
      return;
    }
    if ('speechSynthesis' in window) {
      // Cancel previous speak tasks
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'gu-IN';

      // Look for a Gujarati voice
      const voices = window.speechSynthesis.getVoices();
      const guVoice = voices.find(voice =>
        voice.lang.includes('gu') || voice.lang.includes('GU')
      );

      if (guVoice) {
        utterance.voice = guVoice;
      }

      window.speechSynthesis.speak(utterance);
      message.info('Reading Gujarati text aloud...');
    } else {
      message.error('Text-to-speech is not supported in this browser.');
    }
  };

  // Save Snippet to local history
  const handleSaveSnippet = () => {
    if (!text.trim()) {
      message.warning('Cannot save empty text!');
      return;
    }
    const title = newSnippetTitle.trim() || `Snippet ${new Date().toLocaleTimeString()}`;
    const newSnippet = {
      id: Date.now().toString(),
      title,
      text,
      font: activeFont,
      timestamp: new Date().toLocaleString()
    };

    setHistory([newSnippet, ...history]);
    setNewSnippetTitle('');
    setSaveModalVisible(false);
    message.success(`Saved "${title}" to history!`);
  };

  // Load a snippet from history
  const loadSnippet = (snippet) => {
    setText(snippet.text);
    if (snippet.font) {
      setActiveFont(snippet.font);
    }
    message.success(`Loaded snippet: ${snippet.title}`);
    setIsHistoryOpen(false);
  };

  // Delete a history snippet
  const deleteSnippet = (id, e) => {
    e.stopPropagation(); // Avoid loading the snippet
    setHistory(history.filter(item => item.id !== id));
    message.info('Snippet deleted from history');
  };

  // Counters helper
  const getStats = () => {
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    return { chars, words };
  };

  const { chars, words } = getStats();

  // Antd Theme Token Overrides
  const currentAccentColor = COLOR_PALETTES[activeColor].primary;

  return (
    <ConfigProvider
      theme={{
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: currentAccentColor,
          borderRadius: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        components: {
          Card: {
            colorBgContainer: themeMode === 'dark' ? 'rgba(20, 26, 43, 0.65)' : 'rgba(255, 255, 255, 0.85)',
          },
          Layout: {
            colorBgHeader: 'transparent',
            colorBgBody: 'transparent',
          }
        }
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* Fixed Header */}
        <Header style={{
          position: 'fixed',
          zIndex: 100,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: themeMode === 'dark' ? '#141414' : '#ffffff',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="logo" style={{ height: 32 }} />
            <Title level={4} style={{ margin: 0, color: currentAccentColor }}>
              Jikadara & Pandav Associates
            </Title>
          </div>

          <Space size="large">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => setIsHistoryOpen(true)}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              Saved History ({history.length})
            </Button>
            <Divider type="vertical" style={{ height: 20 }} />
            <Space size="middle">
              <SunOutlined style={{ color: themeMode === 'light' ? currentAccentColor : 'gray' }} />
              <Switch
                checked={themeMode === 'dark'}
                onChange={toggleTheme}
                checkedChildren="Dark"
                unCheckedChildren="Light"
              />
              <MoonOutlined style={{ color: themeMode === 'dark' ? currentAccentColor : 'gray' }} />
            </Space>
          </Space>
        </Header>

        <Layout style={{ marginTop: 64 }}>
          {/* Collapsible Sidebar */}
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            width={260}
            theme={themeMode === 'dark' ? 'dark' : 'light'}
            style={{
              overflow: 'auto',
              height: 'calc(100vh - 64px)',
              position: 'fixed',
              left: 0,
              top: 64,
              bottom: 0,
              borderRight: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Menu
              theme={themeMode === 'dark' ? 'dark' : 'light'}
              mode="inline"
              selectedKeys={[mainTab]}
              onClick={(e) => setMainTab(e.key)}
              style={{ borderRight: 0, marginTop: 16 }}
              items={[
                { key: 'studio', icon: <FontSizeOutlined />, label: 'Font Studio' },
                { key: 'translator', icon: <TranslationOutlined />, label: 'English → Gujarati' },
                { key: 'universal', icon: <TranslationOutlined />, label: 'Universal Converter' },
                { key: 'jantri', icon: <CalculatorOutlined />, label: 'Jantri Calculator' }
              ]}
            />
          </Sider>

          {/* Main Content Area */}
          <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'all 0.2s', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            <Content style={{
              background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
              padding: '12px 24px',
              margin: 0,
              flex: 1,
              // borderRadius: 8,
              // border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`
            }}>
              {mainTab === 'studio' && (
                <div className="dashboard-grid" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                    <div className="editors-container studio-editors-container">
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
                            <Tooltip title="Save Snippet">
                              <Button
                                type="text"
                                shape="circle"
                                icon={<SaveOutlined />}
                                onClick={() => setSaveModalVisible(true)}
                                disabled={!text}
                              />
                            </Tooltip>
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

                    <Divider style={{ margin: '12px 0' }} />

                    <div style={{ display: 'flex', justifySelf: 'flex-start', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                      <HistoryOutlined /> Recent Workspace Snippets
                    </div>

                    <div className="history-list">
                      {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                          No saved snippets yet. Use the Save button in the editor toolbar!
                        </div>
                      ) : (
                        history.slice(0, 5).map((item) => (
                          <div key={item.id} className="history-card" onClick={() => loadSnippet(item)}>
                            <div className="history-card-header">
                              <span>{item.timestamp}</span>
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={(e) => deleteSnippet(item.id, e)}
                                style={{ height: 18, width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              />
                            </div>
                            <div className="history-card-snippet">{item.title}</div>
                            <div className="history-card-translation">{item.text}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {mainTab === 'translator' && (
                <div className="translator-tab-wrap" style={{ padding: '8px 0 20px' }}>
                  <Paragraph style={{ marginBottom: 16, color: 'var(--text-secondary)', maxWidth: 900 }}>
                    Three steps: <Text strong>English</Text> → <Text strong>Unicode Gujarati</Text> (auto) → <Text strong>Harikrishna keystrokes</Text> for <Text code>Ghanshyam.ttf</Text> / Nilkanth (Latin letters that render as Gujarati when the font is applied). Put <Text code>Ghanshyam.ttf</Text> in <Text code>public/</Text> so it loads as <Text code>/Ghanshyam.ttf</Text>. Copy step 3 for Word / PageMaker with the font installed.
                  </Paragraph>
                  <div className="editors-container translator-tab-editors">
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
                        <div className="legacy-alert-banner" style={{ margin: '0 12px 8px', flexShrink: 0 }}>
                          <span className="legacy-alert-tag">Encoding</span>
                          <span className="legacy-alert-message">
                            This column is <Text strong>ASCII / Latin keystrokes</Text> in the Harikrishna font template (e.g. કેમ → <Text code>k[m</Text>), not Gopika-style bytes. Paste into Word or PageMaker with <Text code>Ghanshyam.ttf</Text> applied so the letters render as Gujarati. If a rare conjunct looks wrong, compare with the same font typed by hand.
                          </span>
                        </div>
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
              )}

              {mainTab === 'universal' && (
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
              )}

              {mainTab === 'jantri' && (
                <JantriCalculator currentAccentColor={currentAccentColor} />
              )}
            </Content>

            {/* Global Footer */}
            <Footer style={{ textAlign: 'center', padding: '16px 24px', background: 'transparent' }}>
              Jikadara & Pandav Associates &copy; {new Date().getFullYear()}. All Rights Reserved.
            </Footer>
          </Layout>
        </Layout>

        {/* History Drawer */}
        <Drawer
          title="Full Snippets History log"
          placement="right"
          onClose={() => setIsHistoryOpen(false)}
          open={isHistoryOpen}
          width={400}
          bodyStyle={{ background: themeMode === 'dark' ? '#0d121f' : '#f1f5f9' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Your saved history log is empty.
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="history-card" onClick={() => loadSnippet(item)} style={{ background: themeMode === 'dark' ? 'rgba(20,26,43,0.8)' : 'rgba(255,255,255,0.9)' }}>
                  <div className="history-card-header">
                    <span>{item.timestamp}</span>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => deleteSnippet(item.id, e)}
                    />
                  </div>
                  <div className="history-card-snippet" style={{ fontWeight: 'bold' }}>{item.title}</div>
                  <div className="history-card-translation" style={{ fontSize: 16 }}>{item.text}</div>
                </div>
              ))
            )}
          </div>
        </Drawer>

        {/* Save Snippet Dialog Modal */}
        <Modal
          title="Save Current Gujarati Snippet"
          open={saveModalVisible}
          onOk={handleSaveSnippet}
          onCancel={() => setSaveModalVisible(false)}
          okText="Save"
          cancelText="Cancel"
          centered
        >
          <div style={{ padding: '10px 0' }}>
            <p style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>Give this snippet a title for easy reference later:</p>
            <Input
              placeholder="e.g. My Welcome Message"
              value={newSnippetTitle}
              onChange={(e) => setNewSnippetTitle(e.target.value)}
              onPressEnter={handleSaveSnippet}
              autoFocus
            />
          </div>
        </Modal>

      </Layout>
    </ConfigProvider>
  );
}

export default App;
