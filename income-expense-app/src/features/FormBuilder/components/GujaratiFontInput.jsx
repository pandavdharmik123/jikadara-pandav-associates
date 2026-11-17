import { Input } from 'antd';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';

const HAS_GUJARATI_UNICODE = /[\u0A80-\u0AFF]/;

/**
 * Text input for the legacy Nilkanth / Ghanshyam fonts.
 *
 * Users can type Gujarati Unicode (from a system keyboard or paste) or the
 * familiar Harikrishna-style Latin keystrokes. Unicode is converted to the
 * legacy keystrokes that the printed fonts expect, and the input itself is
 * rendered with the same font so the value looks like it will print.
 */
export default function GujaratiFontInput({
  font = 'ghanshyam',
  value = '',
  onChange,
  onBlur,
  multiline = false,
  rows = 2,
  maxLength,
  className = '',
  style = {},
  ...rest
}) {
  const family = font === 'nilkanth' ? "'Nilkanth', sans-serif" : "'Ghanshyam', sans-serif";
  const displayValue =
    value && HAS_GUJARATI_UNICODE.test(value)
      ? convertUnicodeToGhanshyamLegacy(String(value))
      : value ?? '';

  const handleChange = (event) => {
    let next = event.target.value;
    if (HAS_GUJARATI_UNICODE.test(next)) {
      next = convertUnicodeToGhanshyamLegacy(next);
    }
    if (maxLength && next.length > maxLength) next = next.slice(0, maxLength);
    onChange?.(next);
  };

  const inputStyle = {
    fontFamily: family,
    fontSize: '15px',
    lineHeight: 1.55,
    letterSpacing: '0.2px',
    ...style,
  };

  if (multiline) {
    return (
      <Input.TextArea
        value={displayValue}
        onChange={handleChange}
        onBlur={onBlur}
        rows={rows}
        maxLength={maxLength}
        className={`font-${font} ${className}`.trim()}
        style={inputStyle}
        {...rest}
      />
    );
  }

  return (
    <Input
      value={displayValue}
      onChange={handleChange}
      onBlur={onBlur}
      maxLength={maxLength}
      className={`font-${font} ${className}`.trim()}
      style={inputStyle}
      {...rest}
    />
  );
}
