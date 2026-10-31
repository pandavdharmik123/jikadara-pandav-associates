/**
 * Validation for the Form Builder persistence API.
 *
 * The database only stores the values typed into the left-hand editor. Uploaded
 * photographs, signatures and document scans are device-local and must never
 * reach this API, so any attachment key or data URL is rejected.
 */

export class FormBuilderValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FormBuilderValidationError';
  }
}

export const FORM_KEYS = [
  'PAN_NEW_APPLICATION',
  'PAN_CORRECTION',
  'MARRIAGE_REGISTRATION',
  'PROPERTY_TAX_NAME_TRANSFER',
];

export const FORM_STATUSES = ['DRAFT', 'COMPLETED', 'ARCHIVED'];

const FORM_KEY_SET = new Set(FORM_KEYS);
const FORM_STATUS_SET = new Set(FORM_STATUSES);

const ATTACHMENT_KEYS_BY_FORM = {
  PAN_NEW_APPLICATION: new Set([
    'photo',
    'signature',
    'signatureAspect',
    'signaturePlacements',
    'documents',
  ]),
  PAN_CORRECTION: new Set([
    'photo',
    'signature',
    'signatureAspect',
    'signaturePlacements',
    'documents',
  ]),
  MARRIAGE_REGISTRATION: new Set(),
  PROPERTY_TAX_NAME_TRANSFER: new Set(),
};

const MAX_DATA_BYTES = 512 * 1024;
const MAX_STRING_LENGTH = 5000;
const MAX_ARRAY_LENGTH = 200;
const MAX_DEPTH = 12;

const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

const text = (value) => (typeof value === 'string' ? value.trim() : '');

export function parseFormKey(value) {
  const formKey = text(value);
  if (!FORM_KEY_SET.has(formKey)) {
    throw new FormBuilderValidationError('Choose a valid form type');
  }
  return formKey;
}

export function parseRecordId(value) {
  const id = text(value);
  if (!id || id.length > 100) {
    throw new FormBuilderValidationError('Invalid form record id');
  }
  return id;
}

function parseOptionalText(value, field, maxLength) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new FormBuilderValidationError(`${field} must be text`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new FormBuilderValidationError(`${field} is too long`);
  }
  return trimmed;
}

function assertSafeData(value, formKey, path = 'data', depth = 0) {
  if (depth > MAX_DEPTH) {
    throw new FormBuilderValidationError('Form data is nested too deeply');
  }

  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      throw new FormBuilderValidationError(`${path} is too long`);
    }
    if (/^data:/i.test(value)) {
      throw new FormBuilderValidationError(
        'Uploaded files cannot be saved to the database'
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) {
      throw new FormBuilderValidationError(`${path} has too many items`);
    }
    value.forEach((item, index) =>
      assertSafeData(item, formKey, `${path}[${index}]`, depth + 1)
    );
    return;
  }

  if (isPlainObject(value)) {
    const attachmentKeys = ATTACHMENT_KEYS_BY_FORM[formKey] || new Set();

    Object.entries(value).forEach(([key, child]) => {
      if (attachmentKeys.has(key)) {
        throw new FormBuilderValidationError(
          'Uploaded files cannot be saved to the database'
        );
      }
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new FormBuilderValidationError('Invalid form data');
      }
      assertSafeData(child, formKey, `${path}.${key}`, depth + 1);
    });
    return;
  }

  if (
    value !== null &&
    typeof value !== 'boolean' &&
    typeof value !== 'number'
  ) {
    throw new FormBuilderValidationError('Invalid form data');
  }
}

export function deriveRecordTitle(formKey, data) {
  if (formKey === 'PAN_NEW_APPLICATION') {
    const name = [data.firstName, data.middleName, data.lastName]
      .map(text)
      .filter(Boolean)
      .join(' ');
    return name || text(data.aadhaarName) || 'PAN – New Application';
  }

  if (formKey === 'PAN_CORRECTION') {
    return text(data.pan) || 'PAN – Correction';
  }

  if (formKey === 'MARRIAGE_REGISTRATION') {
    const groom = text(data.groom?.name);
    const bride = text(data.bride?.name);
    return [groom, bride].filter(Boolean).join(' & ') || 'Marriage Registration';
  }

  if (formKey === 'PROPERTY_TAX_NAME_TRANSFER') {
    return (
      text(data.transferee?.name) ||
      text(data.owner?.name) ||
      'Property Tax – Name Transfer'
    );
  }

  return 'Form Builder';
}

/**
 * Validate and normalise a create/update payload.
 *
 * `partial` is true for updates. The form key is still required so the service
 * can confirm the record type has not changed.
 */
export function parseRecordPayload(body, { partial = false } = {}) {
  if (!isPlainObject(body)) {
    throw new FormBuilderValidationError('Invalid request body');
  }

  const formKey = parseFormKey(body.formKey);

  if (!isPlainObject(body.data)) {
    throw new FormBuilderValidationError('Form data must be an object');
  }

  const serialised = JSON.stringify(body.data);
  if (Buffer.byteLength(serialised, 'utf8') > MAX_DATA_BYTES) {
    throw new FormBuilderValidationError('Form data is too large');
  }

  assertSafeData(body.data, formKey);

  const title = parseOptionalText(body.title, 'Title', 200);
  const clientName = parseOptionalText(body.clientName, 'Client name', 200);

  let status;
  if (body.status !== undefined) {
    if (!FORM_STATUS_SET.has(body.status)) {
      throw new FormBuilderValidationError('Choose a valid status');
    }
    status = body.status;
  }

  let revision;
  if (partial) {
    if (!Number.isInteger(body.revision) || body.revision < 1) {
      throw new FormBuilderValidationError('A valid revision is required');
    }
    revision = body.revision;
  }

  return {
    formKey,
    title: title || deriveRecordTitle(formKey, body.data),
    clientName: clientName || title || deriveRecordTitle(formKey, body.data),
    status,
    data: body.data,
    revision,
  };
}

export function parseListFilters(query = {}) {
  const formKey = query.formKey ? parseFormKey(query.formKey) : undefined;
  const q = parseOptionalText(query.q, 'Search', 100);

  const rawLimit = Number.parseInt(query.limit, 10);
  const rawOffset = Number.parseInt(query.offset, 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 100)
    : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  return { formKey, q, limit, offset };
}
