const fs = require('fs');

let appContent = fs.readFileSync('src/App.jsx', 'utf8');

const stateInsert = `
  // Universal Converter State
  const [uniFrom, setUniFrom] = useState('english');
  const [uniTo, setUniTo] = useState('ghanshyam');
  const [uniInput, setUniInput] = useState('');
  const [uniOutput, setUniOutput] = useState('');
  const [isUniConverting, setIsUniConverting] = useState(false);
  const uniTranslitSeq = useRef(0);
  const uniDebounceRef = useRef(null);
`;
appContent = appContent.replace(
  /const enGuDebounceRef = useRef\(null\);/,
  "const enGuDebounceRef = useRef(null);\n" + stateInsert
);

const effectInsert = `
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
`;

appContent = appContent.replace(
  /return \(\) => \{\n      if \(enGuDebounceRef.current\) \{\n        clearTimeout\(enGuDebounceRef.current\);\n        enGuDebounceRef.current = null;\n      \}\n    \};\n  \}, \[enGuEnglish\]\);/,
  "return () => {\n      if (enGuDebounceRef.current) {\n        clearTimeout(enGuDebounceRef.current);\n        enGuDebounceRef.current = null;\n      }\n    };\n  }, [enGuEnglish]);\n" + effectInsert
);

const tabInsert = `
            {
              key: 'universal',
              label: (
                <span>
                  <TranslationOutlined /> Universal Converter
                </span>
              ),
              children: (
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

                  <div className="editors-container">
                    <div className="editor-card glass-panel">
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
                      <div className="editor-body">
                        <textarea
                          className="textarea-editor"
                          value={uniInput}
                          onChange={(e) => setUniInput(e.target.value)}
                          placeholder={uniFrom === 'english' ? "Type english phonetics e.g. kem cho" : "Type/paste Gujarati Unicode e.g. કેમ છો"}
                          spellCheck={uniFrom === 'english'}
                        />
                      </div>
                    </div>

                    <div className="editor-card glass-panel" style={{ borderLeft: \`2px solid \${currentAccentColor}\` }}>
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
                      <div className="editor-body">
                        <textarea
                          readOnly
                          value={uniOutput}
                          className="textarea-editor font-ghanshyam"
                          placeholder="Converted text will appear here..."
                          style={{ opacity: isUniConverting ? 0.55 : 1, fontSize: 20 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
`;
appContent = appContent.replace(
  /              \),\n            \},\n          \]\}\n        \/>/g,
  "              ),\n            },\n" + tabInsert + "          ]}\n        />"
);

// We need SwapRightOutlined imported
if (!appContent.includes('SwapRightOutlined')) {
  appContent = appContent.replace(
    /MoonOutlined\n\} from '@ant-design\/icons';/,
    "MoonOutlined,\n  SwapRightOutlined\n} from '@ant-design/icons';"
  );
}

fs.writeFileSync('src/App.jsx', appContent, 'utf8');
console.log('App.jsx updated!');
