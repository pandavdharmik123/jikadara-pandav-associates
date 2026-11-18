import React from 'react';
import { Input } from 'antd';
import { IndicTransliterate } from '@ai4bharat/indic-transliterate';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';
import { ensureUnicode } from '../utils/unicodeUtils';
import { usePedhinamuInputMode } from '../inputModeContext';

const HAS_GUJARATI_UNICODE = /[\u0A80-\u0AFF]/;

const UNICODE_FONT = "'Anek Gujarati', 'Noto Sans Gujarati', system-ui, sans-serif";

/**
 * Detects legacy Harikrishna/Ghanshyam keystroke text (vs. phonetic Latin being typed).
 * Legacy keystrokes almost always contain either:
 *  - legacy punctuation (matras/vowel signs map to [ ] ( ) | \ etc.), or
 *  - mid-word uppercase letters (vowel matras map to A i I u U, e.g. "grAm", "DBi[l)").
 * Plain phonetic words ("Dharmik", "dabholi", "surat") have none of these and must
 * NOT be converted — converting them through the legacy mapper produces garbage.
 */
const looksLikeLegacyKeystrokes = (text) => {
  if (!text || typeof text !== 'string') return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/[\[\](){}|\\<>~&²Ä±Æ¦§¤µ¿…]/.test(text)) return true;
  const tokens = text.match(/[A-Za-z]+/g) || [];
  return tokens.some((t) => /[A-Z]/.test(t.slice(1)));
};

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
  // Input language mode: 'ghanshyam' (legacy keystrokes) or 'unicode' (Gujarati Unicode).
  // Only the INPUT encoding changes — the preview always renders Ghanshyam/Nilkanth.
  const inputMode = usePedhinamuInputMode();
  const isUnicodeMode = inputMode === 'unicode';

  let displayValue = value ?? '';

  if (isUnicodeMode) {
    // Unicode mode: show legacy keystrokes (from older drafts) as readable Unicode.
    // Only convert when the text actually looks like legacy keystrokes — plain
    // phonetic Latin ("Dharmik", "dabholi") must pass through untouched.
    if (displayValue && !HAS_GUJARATI_UNICODE.test(String(displayValue)) && looksLikeLegacyKeystrokes(String(displayValue))) {
      displayValue = ensureUnicode(String(displayValue));
    }
  } else if (displayValue && HAS_GUJARATI_UNICODE.test(String(displayValue))) {
    // Ghanshyam mode: show Unicode (e.g. from older drafts/paste) as Ghanshyam keystrokes
    displayValue = convertUnicodeToGhanshyamLegacy(String(displayValue));
  }

  const handleChange = (e) => {
    let val = e.target.value;

    if (!isUnicodeMode) {
      // Ghanshyam mode: convert typed Unicode to Ghanshyam keystrokes
      if (HAS_GUJARATI_UNICODE.test(val)) {
        val = convertUnicodeToGhanshyamLegacy(val);
      }
    }
    // Unicode mode: keep the text exactly as typed (no conversion)

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
    if (!isUnicodeMode && pasted && HAS_GUJARATI_UNICODE.test(pasted)) {
      // Ghanshyam mode: paste Unicode as Ghanshyam keystrokes
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
    fontFamily: isUnicodeMode
      ? UNICODE_FONT
      : "'Ghanshyam', sans-serif",
    fontSize: isTextArea ? '16px' : '15px',
    letterSpacing: '0.3px',
    lineHeight: 1.5,
    ...style
  };

  const fontClass = isUnicodeMode ? 'font-unicode-input' : 'font-ghanshyam';

  // ── Unicode mode: phonetic transliteration input with Gujarati suggestions ──
  // Type phonetically (e.g. "dabholi"), pick a Gujarati suggestion; the field
  // stores Gujarati Unicode. Generic: applies to every GhanshyamInput instance.
  if (isUnicodeMode) {
    const mergedStyle = {
      width: '100%',
      padding: isTextArea ? '4px 11px' : '4px 11px',
      minHeight: isTextArea ? undefined : 32,
      borderRadius: 6,
      border: '1px solid #d9d9d9',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'all 0.2s',
      resize: isTextArea ? 'vertical' : undefined,
      ...inputStyle
    };

    return (
      <IndicTransliterate
        containerClassName="transliterate-wrapper"
        containerStyles={{ width: '100%' }}
        lang="gu"
        enabled
        hideTransliterateSwitch
        value={displayValue}
        onChangeText={(text) => {
          if (onChange) {
            onChange({
              target: { value: text },
              currentTarget: { value: text }
            });
          }
        }}
        renderComponent={({ ref: innerRef, ...renderProps }) =>
          isTextArea ? (
            <textarea
              {...renderProps}
              ref={(node) => {
                if (typeof innerRef === 'function') innerRef(node);
                else if (innerRef) innerRef.current = node;
              }}
              rows={rows}
              className={`pedhinamu-transliterate-input ${fontClass} ${className}`}
              placeholder={placeholder}
              style={mergedStyle}
              onBlur={(event) => {
                if (renderProps.onBlur) renderProps.onBlur(event);
                if (onBlur) onBlur(event);
              }}
            />
          ) : (
            <input
              {...renderProps}
              ref={(node) => {
                if (typeof innerRef === 'function') innerRef(node);
                else if (innerRef) innerRef.current = node;
              }}
              className={`pedhinamu-transliterate-input ${fontClass} ${className}`}
              placeholder={placeholder}
              style={mergedStyle}
              onBlur={(event) => {
                if (renderProps.onBlur) renderProps.onBlur(event);
                if (onBlur) onBlur(event);
              }}
            />
          )
        }
      />
    );
  }

  // ── Ghanshyam mode: legacy keystroke input (unchanged behaviour) ──
  if (isTextArea) {
    return (
      <Input.TextArea
        className={`${fontClass} ${className}`}
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
      className={`${fontClass} ${className}`}
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
