import { useState } from 'react';
import { Button, Space } from 'antd';
import { Globe, RotateCw, ExternalLink } from 'lucide-react';

/**
 * AnyRoR Portal – full-page view of https://anyror.gujarat.gov.in/
 *
 * The portal sends `X-Frame-Options: deny`, so it is displayed through the
 * backend proxy (/api/anyror/*) which strips that restriction.
 * Accessible to every logged-in user from the sidebar "AnyRoR Portal" item.
 */

// Derive the backend origin the same way src/services/api.js does.
const API_ORIGIN = (import.meta.env.API_LINK || import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(
  /\/api\/?$/,
  ''
);
const ANYROR_IFRAME_URL = `${API_ORIGIN}/api/anyror/`;
const ANYROR_ORIGINAL_URL = 'https://anyror.gujarat.gov.in/';

export default function AnyRoRPortal() {
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const handleReload = () => {
    setIframeLoaded(false);
    setIframeKey((k) => k + 1);
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Globe size={18} color="#2563eb" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            AnyRoR Portal – Land Records (ખેત મહેસૂલ નોંધ)
          </span>
        </div>
        <Space size="small" style={{ flexShrink: 0 }}>
          <Button size="small" icon={<RotateCw size={14} />} onClick={handleReload} style={{ borderRadius: 8 }}>
            Reload
          </Button>
          <Button
            size="small"
            href={ANYROR_ORIGINAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            icon={<ExternalLink size={14} />}
            style={{ borderRadius: 8 }}
          >
            Open in new tab
          </Button>
        </Space>
      </div>

      {/* Portal frame */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', backgroundColor: '#ffffff' }}>
        {!iframeLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <Globe size={32} color="#94a3b8" />
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Loading AnyRoR portal…</span>
          </div>
        )}
        <iframe
          key={iframeKey}
          src={ANYROR_IFRAME_URL}
          title="AnyRoR Portal"
          onLoad={() => setIframeLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            backgroundColor: '#ffffff',
          }}
          referrerPolicy="no-referrer"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
