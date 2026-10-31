/**
 * Helpers for the Form Builder database payload.
 *
 * Only values typed into the left-hand editor are persisted. Photographs,
 * signatures and document scans are deliberately stripped before the request
 * is sent, so they never leave the device.
 */

export const FORM_KEY_BY_TAB = {
  'pan-new-application': 'PAN_NEW_APPLICATION',
  'pan-correction': 'PAN_CORRECTION',
  'marriage-registration': 'MARRIAGE_REGISTRATION',
  'property-tax-name-transfer': 'PROPERTY_TAX_NAME_TRANSFER',
};

const ATTACHMENT_KEYS_BY_FORM = {
  'pan-new-application': new Set([
    'photo',
    'signature',
    'signatureAspect',
    'signaturePlacements',
    'documents',
  ]),
  'pan-correction': new Set([
    'photo',
    'signature',
    'signatureAspect',
    'signaturePlacements',
    'documents',
  ]),
};

function stripAttachments(value, attachmentKeys) {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripAttachments(item, attachmentKeys))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const result = {};
    Object.entries(value).forEach(([key, child]) => {
      if (attachmentKeys.has(key)) return;
      const cleaned = stripAttachments(child, attachmentKeys);
      if (cleaned !== undefined) result[key] = cleaned;
    });
    return result;
  }

  // Defence in depth: no data URL should ever be sent to the API, even if it
  // appears under an unexpected key.
  if (typeof value === 'string' && /^data:/i.test(value)) return undefined;

  return value;
}

export function toPersistedFormData(data, tabKey) {
  return stripAttachments(data, ATTACHMENT_KEYS_BY_FORM[tabKey] || new Set());
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

export function deriveFormTitle(tabKey, data) {
  if (tabKey === 'pan-new-application') {
    const name = [data.firstName, data.middleName, data.lastName]
      .map(text)
      .filter(Boolean)
      .join(' ');
    return name || text(data.aadhaarName) || 'PAN – New Application';
  }

  if (tabKey === 'pan-correction') {
    return text(data.pan) || 'PAN – Correction';
  }

  if (tabKey === 'marriage-registration') {
    const groom = text(data.groom?.name);
    const bride = text(data.bride?.name);
    return [groom, bride].filter(Boolean).join(' & ') || 'Marriage Registration';
  }

  if (tabKey === 'property-tax-name-transfer') {
    return (
      text(data.transferee?.name) ||
      text(data.owner?.name) ||
      'Property Tax – Name Transfer'
    );
  }

  return 'Form Builder';
}
