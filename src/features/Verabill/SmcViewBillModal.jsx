import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Button, Space, Tooltip, Spin } from 'antd';
import { ExternalLink, RotateCcw, Building2, Maximize2, Minimize2, X, Printer } from 'lucide-react';
import { SmcTenementBadge } from './SmcTenementInput';

const OFFICIAL_SMC_URL = 'https://www.suratmunicipal.gov.in/OnlineServices/PropertyTax/Enroll';

export default function SmcViewBillModal({ open, onClose, tenementNo = '' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const iframeRef = useRef(null);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
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
    if (open) {
      setIsLoading(true);
      setIframeKey((k) => k + 1);
    }
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
            gap: 12,
            width: '100%',
          }}
        >
          {/* Left Title & Tenement Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  SMC Property Tax
                </span>
                {tenementNo && (
                  <SmcTenementBadge
                    tenementNo={tenementNo}
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  />
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                સુરત મહાનગરપાલિકા પોર્ટલ (Surat Municipal Corp)
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <Space size={6} style={{ flexShrink: 0 }}>
            <Tooltip title="Print SMC Bill (Iframe Only)">
              <Button
                icon={<Printer size={14} color="#0f172a" />}
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
                }}
              >
                Print
              </Button>
            </Tooltip>

            <Tooltip title="Reload page">
              <Button
                icon={<RotateCcw size={14} />}
                onClick={handleReload}
                size="small"
                style={{ borderRadius: 6 }}
              />
            </Tooltip>

            <Tooltip title={isFullscreen ? 'Restore to 50% width' : 'Expand to full screen'}>
              <Button
                icon={isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                onClick={() => setIsFullscreen(!isFullscreen)}
                size="small"
                style={{ borderRadius: 6 }}
              >
                {!isMobile && (isFullscreen ? '50%' : 'Full')}
              </Button>
            </Tooltip>

            <Tooltip title="Open in official SMC website">
              <Button
                type="primary"
                icon={<ExternalLink size={13} />}
                onClick={handleOpenExternal}
                size="small"
                style={{ background: '#2563eb', borderRadius: 6, fontWeight: 600 }}
              >
                {!isMobile && 'SMC Portal'}
              </Button>
            </Tooltip>

            <Tooltip title="Close Drawer">
              <Button
                type="text"
                icon={<X size={16} />}
                onClick={onClose}
                size="small"
                style={{ borderRadius: 6, color: '#64748b' }}
              />
            </Tooltip>
          </Space>
        </div>
      }
    >
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
            <Spin size="large" />
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
