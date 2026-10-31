import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FormBuilderValidationError,
  deriveRecordTitle,
  parseListFilters,
  parseRecordPayload,
} from './formBuilderValidation.js';

const panData = {
  firstName: 'Dharmik',
  middleName: '',
  lastName: 'Pandav',
  aadhaarName: 'Dharmik Pandav',
  residence: { flat: '1', road: 'Main Road' },
};

test('accepts a valid create payload and derives the title', () => {
  const payload = parseRecordPayload({
    formKey: 'PAN_NEW_APPLICATION',
    data: panData,
  });

  assert.equal(payload.formKey, 'PAN_NEW_APPLICATION');
  assert.equal(payload.title, 'Dharmik Pandav');
  assert.equal(payload.clientName, 'Dharmik Pandav');
  assert.equal(payload.status, undefined);
  assert.equal(payload.revision, undefined);
});

test('rejects an unknown form key', () => {
  assert.throws(
    () => parseRecordPayload({ formKey: 'SOMETHING_ELSE', data: panData }),
    FormBuilderValidationError
  );
});

test('rejects uploaded attachments', () => {
  assert.throws(
    () =>
      parseRecordPayload({
        formKey: 'PAN_NEW_APPLICATION',
        data: { ...panData, photo: 'data:image/png;base64,AAAA' },
      }),
    /Uploaded files cannot be saved/
  );

  assert.throws(
    () =>
      parseRecordPayload({
        formKey: 'PAN_NEW_APPLICATION',
        data: { ...panData, documents: [] },
      }),
    /Uploaded files cannot be saved/
  );
});

test('keeps the property-tax documents text field', () => {
  const payload = parseRecordPayload({
    formKey: 'PROPERTY_TAX_NAME_TRANSFER',
    data: {
      transferee: { name: 'Transferee' },
      documents: 'Index-2, sale deed',
    },
  });

  assert.equal(payload.data.documents, 'Index-2, sale deed');
});

test('rejects data URLs hidden under another key', () => {
  assert.throws(
    () =>
      parseRecordPayload({
        formKey: 'PAN_NEW_APPLICATION',
        data: { ...panData, unexpected: 'data:image/jpeg;base64,AAAA' },
      }),
    /Uploaded files cannot be saved/
  );
});

test('rejects prototype pollution keys', () => {
  assert.throws(
    () =>
      parseRecordPayload({
        formKey: 'PAN_NEW_APPLICATION',
        data: JSON.parse('{"__proto__":{"polluted":true}}'),
      }),
    /Invalid form data/
  );
});

test('requires a revision on update', () => {
  assert.throws(
    () =>
      parseRecordPayload(
        {
          formKey: 'PAN_NEW_APPLICATION',
          data: panData,
        },
        { partial: true }
      ),
    /valid revision/
  );

  const payload = parseRecordPayload(
    {
      formKey: 'PAN_NEW_APPLICATION',
      data: panData,
      revision: 3,
    },
    { partial: true }
  );
  assert.equal(payload.revision, 3);
});

test('derives readable titles for every form', () => {
  assert.equal(
    deriveRecordTitle('PAN_CORRECTION', { pan: 'ABCDE1234F' }),
    'ABCDE1234F'
  );
  assert.equal(
    deriveRecordTitle('MARRIAGE_REGISTRATION', {
      groom: { name: 'A' },
      bride: { name: 'B' },
    }),
    'A & B'
  );
  assert.equal(
    deriveRecordTitle('PROPERTY_TAX_NAME_TRANSFER', {
      transferee: { name: 'Transferee' },
    }),
    'Transferee'
  );
});

test('parses list filters with safe defaults', () => {
  assert.deepEqual(parseListFilters({}), {
    formKey: undefined,
    q: undefined,
    limit: 50,
    offset: 0,
  });

  assert.deepEqual(
    parseListFilters({ formKey: 'PAN_CORRECTION', q: 'abc', limit: '500', offset: '-2' }),
    {
      formKey: 'PAN_CORRECTION',
      q: 'abc',
      limit: 100,
      offset: 0,
    }
  );
});
