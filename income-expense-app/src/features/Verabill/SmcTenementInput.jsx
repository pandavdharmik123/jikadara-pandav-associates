import React, { useState, useEffect, useRef } from 'react';
import { Select, Tooltip } from 'antd';
import { X, Building2 } from 'lucide-react';

const SMC_SUBWARDS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'M', 'Q', 'V',
];

export function parseTenementParts(val) {
  if (!val || typeof val !== 'string') {
    return { ward: '', subWard: '', location: '', owner: '', subOwner: '', occupier: '' };
  }
  const raw = val.trim();
  if (!raw) {
    return { ward: '', subWard: '', location: '', owner: '', subOwner: '', occupier: '' };
  }

  // 1. Hyphen / space / slash separated: e.g. "19-F-07-9371-0-001" or "016-D-01-0001-0-000"
  const parts = raw.split(/[-/\s]+/).filter(Boolean);
  if (parts.length === 6) {
    return {
      ward: parts[0].replace(/[^\d]/g, '').slice(0, 3),
      subWard: (parts[1] || '').toUpperCase().slice(0, 2),
      location: parts[2].replace(/[^\d]/g, '').slice(0, 2),
      owner: parts[3].replace(/[^\d]/g, '').slice(0, 4),
      subOwner: parts[4].replace(/[^\d]/g, '').slice(0, 1),
      occupier: parts[5].replace(/[^\d]/g, '').slice(0, 3),
    };
  }

  // 2. 5 parts (e.g. "016D-01-0001-0-000" or "19F-07-9371-0-001")
  if (parts.length === 5) {
    const match = parts[0].match(/^(\d{1,3})([A-Za-z]+)$/);
    if (match) {
      return {
        ward: match[1].slice(0, 3),
        subWard: match[2].toUpperCase().slice(0, 2),
        location: parts[1].replace(/[^\d]/g, '').slice(0, 2),
        owner: parts[2].replace(/[^\d]/g, '').slice(0, 4),
        subOwner: parts[3].replace(/[^\d]/g, '').slice(0, 1),
        occupier: parts[4].replace(/[^\d]/g, '').slice(0, 3),
      };
    }
  }

  // 3. Contiguous alphanumeric (e.g. "016D0100010000" or "019F0793710001")
  const clean = raw.replace(/[^A-Za-z0-9]/g, '');
  if (clean.length >= 13) {
    const match = clean.match(/^(\d{2,3})([A-Za-z])(\d{2})(\d{4})(\d{1})(\d{3})$/);
    if (match) {
      return {
        ward: match[1],
        subWard: match[2].toUpperCase(),
        location: match[3],
        owner: match[4],
        subOwner: match[5],
        occupier: match[6],
      };
    }
  }

  // Fallback: fill whatever was found
  return {
    ward: parts[0] || '',
    subWard: (parts[1] || '').toUpperCase(),
    location: parts[2] || '',
    owner: parts[3] || '',
    subOwner: parts[4] || '',
    occupier: parts[5] || '',
  };
}

export function formatTenementDisplay(val) {
  if (!val) return '—';
  const parts = parseTenementParts(val);
  if (!parts.ward && !parts.subWard && !parts.location && !parts.owner && !parts.subOwner && !parts.occupier) {
    return val;
  }
  return `${parts.ward || '???'}-${parts.subWard || '?'}-${parts.location || '??'}-${parts.owner || '????'}-${parts.subOwner || '?'}-${parts.occupier || '???'}`;
}

/**
 * SmcTenementInput Component
 * Renders multiple segmented inputs identical to the SMC Property Tax Enrollment website.
 * Supports auto-advance, backspace navigation, smart full-string paste, and clear.
 */
export default function SmcTenementInput({ value = '', onChange, disabled = false }) {
  const [parts, setParts] = useState(() => parseTenementParts(value));

  const wardRef = useRef(null);
  const subWardRef = useRef(null);
  const locRef = useRef(null);
  const ownerRef = useRef(null);
  const subOwnerRef = useRef(null);
  const occRef = useRef(null);

  // Sync state if external value changes (e.g. form reset or initial edit load)
  useEffect(() => {
    const parsed = parseTenementParts(value);
    setParts(parsed);
  }, [value]);

  const emitChange = (newParts) => {
    setParts(newParts);
    const { ward, subWard, location, owner, subOwner, occupier } = newParts;
    const hasAny = Boolean(ward || subWard || location || owner || subOwner || occupier);
    if (!hasAny) {
      onChange?.('');
      return;
    }
    const combined = `${ward || ''}-${subWard || ''}-${location || ''}-${owner || ''}-${subOwner || ''}-${occupier || ''}`;
    onChange?.(combined);
  };

  const handleSmartPaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    const cleanPasted = pasted.trim();
    // If it contains hyphens, slashes, or is longer than 5 chars, treat as full tenement number
    if (cleanPasted.includes('-') || cleanPasted.includes('/') || cleanPasted.length >= 10) {
      e.preventDefault();
      const parsed = parseTenementParts(cleanPasted);
      emitChange(parsed);
      setTimeout(() => {
        occRef.current?.focus();
      }, 50);
    }
  };

  const handleClear = () => {
    const cleared = { ward: '', subWard: '', location: '', owner: '', subOwner: '', occupier: '' };
    emitChange(cleared);
    wardRef.current?.focus();
  };

  const hasValue = Boolean(
    parts.ward || parts.subWard || parts.location || parts.owner || parts.subOwner || parts.occupier
  );

  const inputStyle = {
    height: 32,
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    textAlign: 'center',
    fontWeight: 600,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: disabled ? '#f8fafc' : '#ffffff',
    outline: 'none',
    transition: 'all 0.15s ease',
    padding: '0 2px',
  };

  const hyphenStyle = {
    color: '#94a3b8',
    fontWeight: 700,
    fontSize: 13,
    userSelect: 'none',
    padding: '0 1px',
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'nowrap',
      }}
      onPaste={handleSmartPaste}
    >
      {/* 1. Ward (maxlength 3) */}
      <Tooltip title="Ward No (e.g. 19 or 016)">
        <input
          ref={wardRef}
          type="text"
          inputMode="numeric"
          maxLength={3}
          placeholder="Ward"
          value={parts.ward}
          disabled={disabled}
          style={{ ...inputStyle, width: 50 }}
          onChange={(e) => {
            const val = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
            const next = { ...parts, ward: val };
            emitChange(next);
            if (val.length >= 3) {
              locRef.current?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === '-') {
              e.preventDefault();
              locRef.current?.focus();
            }
          }}
        />
      </Tooltip>

      <span style={hyphenStyle}>-</span>

      {/* 2. Sub-Ward (Select Dropdown matching SMC) */}
      <Tooltip title="Sub-Ward (A to V)">
        <div style={{ width: 60 }}>
          <Select
            ref={subWardRef}
            value={parts.subWard || undefined}
            placeholder="Sub"
            disabled={disabled}
            style={{ width: '100%', height: 32 }}
            showSearch
            allowClear
            optionFilterProp="label"
            onChange={(val) => {
              const next = { ...parts, subWard: val || '' };
              emitChange(next);
              if (val) {
                locRef.current?.focus();
              }
            }}
            options={SMC_SUBWARDS.map((w) => ({ value: w, label: w }))}
          />
        </div>
      </Tooltip>

      <span style={hyphenStyle}>-</span>

      {/* 3. Location (maxlength 2) */}
      <Tooltip title="Location No (e.g. 07 or 01)">
        <input
          ref={locRef}
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="Loc"
          value={parts.location}
          disabled={disabled}
          style={{ ...inputStyle, width: 38 }}
          onChange={(e) => {
            const val = e.target.value.replace(/[^\d]/g, '').slice(0, 2);
            const next = { ...parts, location: val };
            emitChange(next);
            if (val.length >= 2) {
              ownerRef.current?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !parts.location) {
              wardRef.current?.focus();
            } else if (e.key === 'Enter' || e.key === '-') {
              e.preventDefault();
              ownerRef.current?.focus();
            }
          }}
        />
      </Tooltip>

      <span style={hyphenStyle}>-</span>

      {/* 4. Owner (maxlength 4) */}
      <Tooltip title="Owner No (e.g. 9371 or 0001)">
        <input
          ref={ownerRef}
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="Owner"
          value={parts.owner}
          disabled={disabled}
          style={{ ...inputStyle, width: 52 }}
          onChange={(e) => {
            const val = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
            const next = { ...parts, owner: val };
            emitChange(next);
            if (val.length >= 4) {
              subOwnerRef.current?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !parts.owner) {
              locRef.current?.focus();
            } else if (e.key === 'Enter' || e.key === '-') {
              e.preventDefault();
              subOwnerRef.current?.focus();
            }
          }}
        />
      </Tooltip>

      <span style={hyphenStyle}>-</span>

      {/* 5. Sub-Owner (maxlength 1) */}
      <Tooltip title="Sub-Owner No (e.g. 0)">
        <input
          ref={subOwnerRef}
          type="text"
          inputMode="numeric"
          maxLength={1}
          placeholder="Sub"
          value={parts.subOwner}
          disabled={disabled}
          style={{ ...inputStyle, width: 32 }}
          onChange={(e) => {
            const val = e.target.value.replace(/[^\d]/g, '').slice(0, 1);
            const next = { ...parts, subOwner: val };
            emitChange(next);
            if (val.length >= 1) {
              occRef.current?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !parts.subOwner) {
              ownerRef.current?.focus();
            } else if (e.key === 'Enter' || e.key === '-') {
              e.preventDefault();
              occRef.current?.focus();
            }
          }}
        />
      </Tooltip>

      <span style={hyphenStyle}>-</span>

      {/* 6. Occupier (maxlength 3) */}
      <Tooltip title="Occupier No (e.g. 001 or 000)">
        <input
          ref={occRef}
          type="text"
          inputMode="numeric"
          maxLength={3}
          placeholder="Occ"
          value={parts.occupier}
          disabled={disabled}
          style={{ ...inputStyle, width: 50 }}
          onChange={(e) => {
            const val = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
            const next = { ...parts, occupier: val };
            emitChange(next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !parts.occupier) {
              subOwnerRef.current?.focus();
            }
          }}
        />
      </Tooltip>

      {/* Clear Button */}
      {hasValue && !disabled && (
        <Tooltip title="Clear Tenement No.">
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '2px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 2,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <X size={14} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * SmcTenementBadge Component
 * Renders the Tenement number identical to SMC website styling with segments.
 */
export function SmcTenementBadge({ tenementNo, onClick, style = {} }) {
  if (!tenementNo) {
    return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
  }

  const parts = parseTenementParts(tenementNo);
  const formatted = `${parts.ward || '??'}-${parts.subWard || '?'}-${parts.location || '??'}-${parts.owner || '????'}-${parts.subOwner || '?'}-${parts.occupier || '???'}`;

  return (
    <span
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        color: '#1d4ed8',
        fontWeight: 600,
        fontSize: 12,
        background: '#eff6ff',
        padding: '4px 8px',
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: '1px solid #bfdbfe',
        transition: 'all 0.15s ease',
        fontFamily: 'monospace, ui-monospace, sans-serif',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = '#dbeafe';
          e.currentTarget.style.borderColor = '#93c5fd';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.background = '#eff6ff';
          e.currentTarget.style.borderColor = '#bfdbfe';
        }
      }}
    >
      <Building2 size={13} color="#2563eb" />
      <span>{formatted}</span>
    </span>
  );
}
