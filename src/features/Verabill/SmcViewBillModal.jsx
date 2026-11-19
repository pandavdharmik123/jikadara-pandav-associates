import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Button, Space, Tooltip } from 'antd';
import { Sk } from '../../components/skeletons';
import { ExternalLink, RotateCcw, Building2, Maximize2, Minimize2, X, Printer } from 'lucide-react';
import { SmcTenementBadge } from './SmcTenementInput';

const OFFICIAL_SMC_URL = 'https://www.suratmunicipal.gov.in/OnlineServices/PropertyTax/Enroll';

export default function SmcViewBillModal({ open, onClose, tenementNo = '' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const iframeRef = useRef(null);

  const apiBase = import.meta.env.API_LINK || import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
  const iframeSrc = tenementNo
    ? `${apiBase}/verabill/smc-viewbill-proxy?tenementNo=${encodeURIComponent(tenementNo)}`
    : `${apiBase}/verabill/smc-viewbill-proxy`;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let timer;
    if (open) {
      setIsLoading(true);
      setIframeKey((k) => k + 1);
      // Failsafe: stop loading after 8s so iframe content or fallback is visible
      timer = setTimeout(() => {
        setIsLoading(false);
      }, 8000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, tenementNo]);

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((k) => k + 1);
  };

  const handleOpenExternal = () => {
    window.open(OFFICIAL_SMC_URL, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;

      // 1. Post message to iframe (handled by our injected proxy script)
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'PRINT_SMC_PAGE' }, '*');
      }

      // 2. Direct focus and print if accessible
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        // Handled cleanly via postMessage listener
      }
    } catch (err) {
      console.error('Print iframe error:', err);
    }
  };

  const drawerWidth = isFullscreen ? '100%' : isMobile ? '100%' : '50%';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={drawerWidth}
      closable={false}
      destroyOnClose={false}
      styles={{
        wrapper: {
          borderTopLeftRadius: 20,
          borderBottomLeftRadius: 20,
          overflow: 'hidden',
        },
        section: {
          borderTopLeftRadius: 20,
          borderBottomLeftRadius: 20,
          overflow: 'hidden',
        },
        content: {
          borderTopLeftRadius: 20,
          borderBottomLeftRadius: 20,
          overflow: 'hidden',
        },
        header: {
          padding: '12px 18px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 20,
        },
        body: {
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#f8fafc',
        },
      }}
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 8 : 12,
            width: '100%',
          }}
        >
          {/* Left Title & Tenement Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: isMobile ? 13.5 : 15, fontWeight: 700, color: '#0f172a' }}>
                  SMC Property Tax
                </span>
                {tenementNo && (
                  <SmcTenementBadge
                    tenementNo={tenementNo}
                    style={{ fontSize: 10, padding: '1px 6px' }}
                  />
                )}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                સુરત મહાનગરપાલિકા પોર્ટલ
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <Space size={isMobile ? 3 : 6} style={{ flexShrink: 0 }}>
            <Tooltip title="Print SMC Bill">
              <Button
                icon={<Printer size={13} color="#0f172a" />}
                onClick={handlePrint}
                size="small"
                style={{
                  borderRadius: 6,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  borderColor: '#cbd5e1',
                  color: '#0f172a',
                  padding: isMobile ? '0 6px' : '0 8px',
                }}
              >
                {!isMobile && 'Print'}
              </Button>
            </Tooltip>

            <Tooltip title="Reload page">
              <Button
                icon={<RotateCcw size={13} />}
                onClick={handleReload}
                size="small"
                style={{ borderRadius: 6, padding: isMobile ? '0 6px' : '0 8px' }}
              />
            </Tooltip>

            {!isMobile && (
              <Tooltip title={isFullscreen ? 'Restore to 50% width' : 'Expand to full screen'}>
                <Button
                  icon={isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  size="small"
                  style={{ borderRadius: 6 }}
                >
                  {isFullscreen ? '50%' : 'Full'}
                </Button>
              </Tooltip>
            )}

            <Tooltip title="Open in official SMC website">
              <Button
                type="primary"
                icon={<ExternalLink size={13} />}
                onClick={handleOpenExternal}
                size="small"
                style={{
                  background: '#2563eb',
                  borderRadius: 6,
                  fontWeight: 600,
                  padding: isMobile ? '0 8px' : '0 10px',
                }}
              >
                {!isMobile ? 'SMC Portal' : 'Open'}
              </Button>
            </Tooltip>

            <Tooltip title="Close Drawer">
              <Button
                type="text"
                icon={<X size={18} />}
                onClick={onClose}
                size="small"
                style={{ borderRadius: 6, color: '#64748b', padding: '0 4px', minWidth: 26 }}
              />
            </Tooltip>
          </Space>
        </div>
      }
    >
      {/* Direct official SMC banner */}
      <div
        style={{
          padding: '6px 12px',
          background: '#eff6ff',
          borderBottom: '1px solid #dbeafe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 11.5,
          color: '#1e40af',
          flexShrink: 0,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          💡 સત્તાવાર સુરત મહાનગરપાલિકા (SMC) પોર્ટલ
        </span>
        <button
          type="button"
          onClick={handleOpenExternal}
          style={{
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          સાઈટ ખોલો <ExternalLink size={10} />
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              zIndex: 10,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 'min(360px, 78%)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <Sk w={180} h={18} r={7} />
              <Sk w="100%" h={12} />
              <Sk w="84%" h={12} />
              <Sk w="66%" h={12} />
              <Sk w="100%" h={110} r={10} style={{ marginTop: 6 }} />
            </div>
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
              Connecting to Surat Municipal Corporation portal...
            </span>
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={iframeSrc}
          title="Surat Municipal Corporation Property Tax"
          width="100%"
          height="100%"
          style={{
            border: 'none',
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
          }}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </Drawer>
  );
}
