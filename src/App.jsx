import React, { useState, useEffect } from 'react';
import {
  ConfigProvider,
  Layout,
  Menu,
  Button,
  Typography,
  Drawer,
  Input,
  Modal,
  theme,
  message
} from 'antd';
import {
  TranslationOutlined,
  BgColorsOutlined,
  CalculatorOutlined,
  FormatPainterOutlined
} from '@ant-design/icons';
import { COLOR_PALETTES } from './utils/constants';

import FontStudio from './features/FontStudio/FontStudio';
import Translator from './features/Translator/Translator';
import UniversalConverter from './features/UniversalConverter/UniversalConverter';
import JantriCalculator from './features/JantriCalculator/JantriCalculator';
import RentAgreementCalculator from './features/RentAgreementCalculator/RentAgreementCalculator';

import './styles/main.scss';

// Intercept fetch calls for AI4Bharat API (same as before)
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
const { Title, Paragraph } = Typography;

export default function App() {
  // Global State
  const themeMode = 'light';
  const [activeColor, setActiveColor] = useState(() => localStorage.getItem('font-conv-accent') || 'indigo');
  const [mainTab, setMainTab] = useState('translator');
  const [collapsed, setCollapsed] = useState(false);

  // Text state for FontStudio
  const [studioText, setStudioText] = useState('');

  const currentAccentColor = COLOR_PALETTES[activeColor].primary;
  const { defaultAlgorithm, darkAlgorithm } = theme;

  useEffect(() => {
    document.body.className = 'light-theme';
    document.documentElement.style.setProperty('--accent-color', currentAccentColor);
    localStorage.setItem('font-conv-accent', activeColor);
  }, [activeColor, currentAccentColor]);

  const menuItems = [
    {
      key: 'translator',
      icon: <TranslationOutlined style={{ fontSize: 18 }} />,
      label: 'Eng to Guj',
    },
    {
      key: 'universal',
      icon: <BgColorsOutlined style={{ fontSize: 18 }} />,
      label: 'Universal Converter',
    },
    {
      key: 'jantri',
      icon: <CalculatorOutlined style={{ fontSize: 18 }} />,
      label: 'Jantri Calculator',
    },
    {
      key: 'rent-agreement',
      icon: <CalculatorOutlined style={{ fontSize: 18 }} />,
      label: 'Rent Agreement Calculator',
    }
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: themeMode === 'dark' ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: currentAccentColor,
          fontFamily: '"Anek Gujarati", Inter, system-ui, sans-serif',
          colorBgContainer: themeMode === 'dark' ? '#141414' : '#ffffff',
          colorBgElevated: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
          borderRadius: 8,
          boxShadowSecondary: themeMode === 'dark'
            ? '0 6px 16px 0 rgba(0, 0, 0, 0.4), 0 3px 6px -4px rgba(0, 0, 0, 0.2), 0 9px 28px 8px rgba(0, 0, 0, 0.3)'
            : '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
        },
        components: {
          Layout: {
            headerBg: themeMode === 'dark' ? '#0d1117' : '#ffffff',
            bodyBg: themeMode === 'dark' ? '#000000' : '#f5f7fa',
            siderBg: themeMode === 'dark' ? '#0d1117' : '#ffffff',
          },
          Card: {
            headerBg: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          }
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', display: 'flex' }}>
        <Header className={`app-header ${themeMode === 'dark' ? 'dark' : 'light'}`} style={{
          position: 'fixed',
          zIndex: 100,
          width: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#30363d' : '#e1e4e8'}`,
          height: 64,
          zIndex: 999,
          top: 0
        }}>
          <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 40, width: 'auto' }} />
            <div className='d-flex flex-column'>
              <h2 style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>
                JIKADARA & PANDAV ASSOCIATES
              </h2>
              <span>Advocate and Legal Consultants</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          </div>
        </Header>

        <Layout style={{ marginTop: 64 }}>
          <Sider
            width={260}
            theme={themeMode}
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            style={{
              overflow: 'auto',
              height: 'calc(100vh - 64px)',
              position: 'fixed',
              left: 0,
              top: 64,
              bottom: 0,
              borderRight: `1px solid ${themeMode === 'dark' ? '#30363d' : '#e1e4e8'}`,
              zIndex: 90
            }}
          >
            <Menu
              theme={themeMode}
              mode="inline"
              selectedKeys={[mainTab]}
              onClick={(e) => setMainTab(e.key)}
              items={menuItems}
              style={{ padding: '16px 8px', borderRight: 0 }}
            />
          </Sider>

          <Layout style={{
            marginLeft: collapsed ? 80 : 260,
            transition: 'all 0.2s',
            padding: '8px 24px',
            minHeight: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Content style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {mainTab === 'studio' && (
                <FontStudio
                  themeMode={themeMode}
                  currentAccentColor={currentAccentColor}
                  activeColor={activeColor}
                  setActiveColor={setActiveColor}
                  text={studioText}
                  setText={setStudioText}
                />
              )}

              {mainTab === 'translator' && (
                <Translator themeMode={themeMode} currentAccentColor={currentAccentColor} />
              )}

              {mainTab === 'universal' && (
                <UniversalConverter themeMode={themeMode} currentAccentColor={currentAccentColor} />
              )}

              {mainTab === 'jantri' && (
                <JantriCalculator themeMode={themeMode} currentAccentColor={currentAccentColor} />
              )}

              {mainTab === 'rent-agreement' && (
                <RentAgreementCalculator themeMode={themeMode} currentAccentColor={currentAccentColor} />
              )}
            </Content>

            {/* <Footer style={{ textAlign: 'center', padding: '24px 50px', background: 'transparent' }}>
              <Paragraph style={{ margin: 0, color: 'var(--text-secondary)' }}>
                Jikadara & Pandav Associates © {new Date().getFullYear()} — Indic Type & Conversion Suite
              </Paragraph>
              <Paragraph style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
                Transliteration powered by AI4Bharat API
              </Paragraph>
            </Footer> */}
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
