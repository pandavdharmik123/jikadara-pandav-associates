import React from 'react';
import { Input } from 'antd';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';

const HAS_GUJARATI_UNICODE = /[\u0A80-\u0AFF]/;

export default function GhanshyamInput({
  value = '',
  onChange,
  onPaste,
  onBlur,
  placeholder,
  style = {},
  className = '',
  isTextArea = false,
  rows = 2,
  size,
  autoFocus = false,
  ...restProps
}) {
  // If incoming value has Gujarati Unicode, convert to Ghanshyam keystrokes so Ghanshyam font displays it
  const displayValue = value && HAS_GUJARATI_UNICODE.test(value)
    ? convertUnicodeToGhanshyamLegacy(String(value))
    : (value ?? '');

  const handleChange = (e) => {
    let val = e.target.value;

    // If text contains Gujarati Unicode (e.g. from typing/paste), convert directly to Ghanshyam keystrokes
    if (HAS_GUJARATI_UNICODE.test(val)) {
      val = convertUnicodeToGhanshyamLegacy(val);
    }

    if (onChange) {
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: val
        },
        currentTarget: {
          ...e.currentTarget,
          value: val
        }
      };
      onChange(syntheticEvent);
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text');
    if (pasted && HAS_GUJARATI_UNICODE.test(pasted)) {
      e.preventDefault();
      const convertedPaste = convertUnicodeToGhanshyamLegacy(pasted);

      const target = e.target;
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const currentVal = target.value || '';
      const newVal = currentVal.slice(0, start) + convertedPaste + currentVal.slice(end);

      if (onChange) {
        onChange({
          target: { value: newVal },
          currentTarget: { value: newVal }
        });
      }
    }
    if (onPaste) {
      onPaste(e);
    }
  };

  const inputStyle = {
    fontFamily: "'Ghanshyam', sans-serif !important",
    fontSize: isTextArea ? '16px' : '15px',
    letterSpacing: '0.3px',
    lineHeight: 1.5,
    ...style
  };

  if (isTextArea) {
    return (
      <Input.TextArea
        className={`font-ghanshyam ${className}`}
        value={displayValue}
        onChange={handleChange}
        onPaste={handlePaste}
        onBlur={onBlur}
        placeholder={placeholder}
        style={inputStyle}
        rows={rows}
        autoFocus={autoFocus}
        {...restProps}
      />
    );
  }

  return (
    <Input
      className={`font-ghanshyam ${className}`}
      value={displayValue}
      onChange={handleChange}
      onPaste={handlePaste}
      onBlur={onBlur}
      placeholder={placeholder}
      style={inputStyle}
      size={size}
      autoFocus={autoFocus}
      {...restProps}
    />
  );
}

