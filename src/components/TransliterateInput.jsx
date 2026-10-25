import { IndicTransliterate } from '@ai4bharat/indic-transliterate';

/**
 * Ant Design Form.Item-compatible Gujarati transliteration input.
 * Type Latin text and choose a Gujarati suggestion from the dropdown.
 */
export default function TransliterateInput({
  value,
  onChange,
  onBlur,
  placeholder,
  style,
  className = '',
  list,
  type = 'text',
  ref: fieldRef,
  ...rest
}) {
  return (
    <IndicTransliterate
      containerClassName="transliterate-wrapper"
      containerStyles={{ width: '100%' }}
      renderComponent={({ ref: innerRef, ...renderProps }) => (
        <input
          {...renderProps}
          // Keep both the library's internal ref and Ant Design's Form.Item ref.
          ref={(node) => {
            if (typeof innerRef === 'function') innerRef(node);
            else if (innerRef) innerRef.current = node;

            if (typeof fieldRef === 'function') fieldRef(node);
            else if (fieldRef) fieldRef.current = node;
          }}
          list={list}
          type={type}
          onBlur={(event) => {
            if (renderProps.onBlur) renderProps.onBlur(event);
            if (onBlur) onBlur(event);
          }}
          className={`custom-transliterate-input ant-input ${className}`}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 8,
            fontSize: 15,
            backgroundColor: '#ffffff',
            border: '1px solid #d9d9d9',
            color: '#0f172a',
            padding: '4px 11px',
            boxSizing: 'border-box',
            ...style,
          }}
        />
      )}
      value={value !== undefined && value !== null ? String(value) : ''}
      onChangeText={(text) => {
        if (onChange) onChange(text);
      }}
      lang="gu"
      {...rest}
    />
  );
}
