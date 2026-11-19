import React from 'react';
import usePrivacyStore from '../store/privacyStore';
import { formatCurrency } from '../utils/currency';

export default function PrivacyAmount({
  amount,
  isRevealed: explicitRevealed,
  style = {},
  className = '',
  maskedText = '••••••',
  color,
}) {
  const storeRevealed = usePrivacyStore((state) => state.isRevealed);
  const isRevealed = explicitRevealed !== undefined ? explicitRevealed : storeRevealed;

  if (isRevealed) {
    return (
      <span
        className={`privacy-amount revealed ${className}`}
        style={{
          fontVariantNumeric: 'tabular-nums',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          color: color || 'inherit',
          ...style,
        }}
      >
        {formatCurrency(amount)}
      </span>
    );
  }

  return (
    <span
      className={`privacy-amount masked ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        letterSpacing: '2px',
        userSelect: 'none',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        color: color || 'inherit',
        opacity: 0.85,
        ...style,
      }}
      title="Secured by PIN - Click Eye to view"
    >
      <span style={{ fontSize: '0.9em', letterSpacing: '0.5px' }}>₹</span>
      <span style={{ fontSize: '1.1em', fontWeight: 900, lineHeight: 1 }}>{maskedText}</span>
    </span>
  );
}
