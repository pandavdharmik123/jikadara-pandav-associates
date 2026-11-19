import React from 'react';
import { PageSkeleton, MobileListSkeleton } from './skeletons';

export default function Loader({ size = 150, type = 'skeleton', count = 5 }) {
  if (type === 'logo') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 20px',
          width: '100%',
          height: '100%',
        }}
      >
        <div className="custom-loader-logo">
          <img src="/logo.png" alt="Loading" style={{ width: size, height: 'auto' }} />
        </div>
        <style>{`
          .custom-loader-logo img {
            animation: logo-pulse 1.5s infinite ease-in-out;
          }
          @keyframes logo-pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div style={{ padding: '10px 0', width: '100%' }}>
        <MobileListSkeleton count={count} />
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 2px', width: '100%' }}>
      <PageSkeleton stats={2} tableRows={5} />
    </div>
  );
}
