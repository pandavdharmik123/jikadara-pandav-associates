import { useRef, useState } from 'react';
import {
  Checkbox,
  Collapse,
  DatePicker,
  Input,
  Radio,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import {
  BookUser,
  Camera,
  ClipboardCheck,
  FileSignature,
  Home,
  ImagePlus,
  Landmark,
  Mail,
  Paperclip,
  RotateCcw,
  Trash2,
  User,
  Users,
  Wand2,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  CORRECTION_ADDRESS_TYPE_OPTIONS,
  CORRECTION_BOX_LIMITS,
  CORRECTION_CAPACITY_OPTIONS,
  CORRECTION_CHANGE_OPTIONS,
  CORRECTION_GENDER_OPTIONS,
  CORRECTION_PARENT_ON_CARD_OPTIONS,
  CORRECTION_PROOF_OPTIONS,
} from '../constants/correctionPanData';
import { CORRECTION_FORM_PAGES, CORRECTION_SIGNATURE_BOXES } from '../constants/correctionPanLayout';
import {
  DEFAULT_SIGNATURE_ASPECT,
  cleanSignatureImage,
  createDocumentPlacement,
  createSignaturePlacements,
  prepareDocumentImage,
  prepareSignatureImage,
} from '../utils/panImages';

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Field({ label, required, optional, hint, error, children, className = '' }) {
  return (
    <div className={`fbs-field ${className}`}>
      <label className="fbs-field-label">
        {label}
        {required && <span className="fbs-req">*</span>}
        {optional && <span className="fbs-optional">(optional)</span>}
      </label>
      {children}
      {hint && !error && <div className="fbs-hint">{hint}</div>}
      {error && <div className="fbs-error">{error}</div>}
    </div>
  );
}

function CharInput({ value, onChange, limit, placeholder, error, onBlur, uppercase = true }) {
  const used = String(value || '').length;
  const handleChange = (event) => {
    let next = event.target.value.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ');
    if (next.length > limit) next = next.slice(0, limit);
    onChange(next);
  };
  return (
    <div className="fbs-char-wrap">
      <Input
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        status={error ? 'error' : undefined}
        className={uppercase ? 'fbs-uppercase' : ''}
        suffix={
          used > 0 ? (
            <span className={`fbs-counter${used >= limit ? ' is-full' : ''}`}>
              {used}/{limit}
            </span>
          ) : null
        }
        allowClear
      />
    </div>
  );
}

function DigitsInput({ value, onChange, limit, placeholder, error, onBlur }) {
  const handleChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '');
    onChange(digits.slice(0, limit));
  };
  return (
    <div className="fbs-char-wrap">
      <Input
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        status={error ? 'error' : undefined}
        inputMode="numeric"
        suffix={
          value.length > 0 ? (
            <span className={`fbs-counter${value.length >= limit ? ' is-full' : ''}`}>
              {value.length}/{limit}
            </span>
          ) : null
        }
        allowClear
      />
    </div>
  );
}

function SectionIcon({ icon: Icon }) {
  return (
    <span className="fbs-section-icon">
      <Icon size={14} />
    </span>
  );
}

function UploadBox({ label, value, onChange, hint, aspect }) {
  const handleBeforeUpload = (file) => {
    if (!file.type.startsWith('image/')) {
      message.error('Please choose a PNG or JPEG image.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 3 * 1024 * 1024) {
      message.error('Please choose an image smaller than 3 MB.');
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
    return false;
  };

  return (
    <div className="fbs-upload">
      <div className={`fbs-upload-preview ${aspect}`}>
        {value ? <img src={value} alt={label} /> : <Camera size={20} />}
      </div>
      <div className="fbs-upload-body">
        <div className="fbs-upload-title">{label}</div>
        <div className="fbs-hint">{hint}</div>
        <div className="fbs-upload-actions">
          <Upload accept="image/png,image/jpeg" showUploadList={false} beforeUpload={handleBeforeUpload}>
            <button type="button" className="fbs-link-btn">
              {value ? 'Replace image' : 'Upload image'}
            </button>
          </Upload>
          {value && (
            <button type="button" className="fbs-link-btn danger" onClick={() => onChange(null)}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddressFields({ value, onChange, errors = {}, touched = {}, onTouch }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const keyOf = (key) => `address.${key}`;
  const err = (key) => (touched[keyOf(key)] ? errors[keyOf(key)] : undefined);

  return (
    <div className="fbs-group">
      <div className="fbs-grid-2">
        <Field label="Flat/Door/Building" required error={err('flat')}>
          <CharInput
            value={value.flat}
            onChange={(next) => set('flat', next)}
            onBlur={() => onTouch(keyOf('flat'))}
            limit={CORRECTION_BOX_LIMITS.addressPart}
            placeholder="e.g. B-204"
            error={err('flat')}
          />
        </Field>
        <Field label="Road/Street/Block/Sector" required error={err('road')}>
          <CharInput
            value={value.road}
            onChange={(next) => set('road', next)}
            onBlur={() => onTouch(keyOf('road'))}
            limit={CORRECTION_BOX_LIMITS.addressPart}
            placeholder="e.g. MG Road"
            error={err('road')}
          />
        </Field>
        <Field label="Post Office" optional error={err('post')}>
          <CharInput
            value={value.post}
            onChange={(next) => set('post', next)}
            onBlur={() => onTouch(keyOf('post'))}
            limit={CORRECTION_BOX_LIMITS.addressPart}
            placeholder="e.g. Navrangpura"
            error={err('post')}
          />
        </Field>
        <Field label="Area/Locality/Town/City" required error={err('area')}>
          <CharInput
            value={value.area}
            onChange={(next) => set('area', next)}
            onBlur={() => onTouch(keyOf('area'))}
            limit={CORRECTION_BOX_LIMITS.addressPart}
            placeholder="e.g. Ahmedabad"
            error={err('area')}
          />
        </Field>
        <Field label="District" required error={err('district')}>
          <CharInput
            value={value.district}
            onChange={(next) => set('district', next)}
            onBlur={() => onTouch(keyOf('district'))}
            limit={CORRECTION_BOX_LIMITS.addressPart}
            placeholder="e.g. Ahmedabad"
            error={err('district')}
          />
        </Field>
        <Field label="PIN / ZIP Code" required error={err('pin')}>
          <DigitsInput
            value={value.pin}
            onChange={(next) => set('pin', next)}
            onBlur={() => onTouch(keyOf('pin'))}
            limit={CORRECTION_BOX_LIMITS.pin}
            placeholder="380009"
            error={err('pin')}
          />
        </Field>
        <Field label="State/Union Territory" required error={err('state')}>
          <Input
            value={value.state}
            onChange={(event) => set('state', event.target.value.replace(/[^\x20-\x7E]/g, ''))}
            onBlur={() => onTouch(keyOf('state'))}
            placeholder="e.g. Gujarat"
            status={err('state') ? 'error' : undefined}
            className="fbs-uppercase"
            allowClear
          />
        </Field>
        <Field label="Country/Region" required error={err('country')}>
          <Input
            value={value.country}
            onChange={(event) => set('country', event.target.value.replace(/[^\x20-\x7E]/g, ''))}
            onBlur={() => onTouch(keyOf('country'))}
            placeholder="e.g. India"
            status={err('country') ? 'error' : undefined}
            className="fbs-uppercase"
            allowClear
          />
        </Field>
      </div>
    </div>
  );
}

function ContactFields({ value, onChange, errors = {}, touched = {}, onTouch }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const keyOf = (key) => `contact.${key}`;
  const err = (key) => (touched[keyOf(key)] ? errors[keyOf(key)] : undefined);

  return (
    <div className="fbs-grid-2">
      <Field label="Mobile Country Code" required error={err('mobileCode')} hint="Separate from the mobile number.">
        <DigitsInput
          value={value.mobileCode}
          onChange={(next) => set('mobileCode', next)}
          onBlur={() => onTouch(keyOf('mobileCode'))}
          limit={CORRECTION_BOX_LIMITS.mobileCode}
          placeholder="91"
          error={err('mobileCode')}
        />
      </Field>
      <Field label="Mobile Number" required error={err('mobile')}>
        <DigitsInput
          value={value.mobile}
          onChange={(next) => set('mobile', next)}
          onBlur={() => onTouch(keyOf('mobile'))}
          limit={CORRECTION_BOX_LIMITS.mobile}
          placeholder="9876543210"
          error={err('mobile')}
        />
      </Field>
      <Field label="Email ID" required error={err('email')} className="fbs-span-2">
        <Input
          value={value.email}
          onChange={(event) => set('email', event.target.value.replace(/[^\x20-\x7E]/g, '').trim())}
          onBlur={() => onTouch(keyOf('email'))}
          placeholder="name@example.com"
          status={err('email') ? 'error' : undefined}
          prefix={<Mail size={13} />}
          allowClear
        />
      </Field>
      <Field label="Landline Country/ISD Code" optional error={err('isdCode')}>
        <DigitsInput
          value={value.isdCode}
          onChange={(next) => set('isdCode', next)}
          onBlur={() => onTouch(keyOf('isdCode'))}
          limit={CORRECTION_BOX_LIMITS.isdCode}
          placeholder="91"
          error={err('isdCode')}
        />
      </Field>
      <Field label="Landline Area/STD Code" optional error={err('stdCode')}>
        <DigitsInput
          value={value.stdCode}
          onChange={(next) => set('stdCode', next)}
          onBlur={() => onTouch(keyOf('stdCode'))}
          limit={CORRECTION_BOX_LIMITS.stdCode}
          placeholder="79"
          error={err('stdCode')}
        />
      </Field>
      <Field label="Landline Number" optional error={err('landline')} className="fbs-span-2">
        <DigitsInput
          value={value.landline}
          onChange={(next) => set('landline', next)}
          onBlur={() => onTouch(keyOf('landline'))}
          limit={CORRECTION_BOX_LIMITS.landline}
          placeholder="26561234"
          error={err('landline')}
        />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main form                                                          */
/* ------------------------------------------------------------------ */

export default function CorrectionPanForm({ data, onChange, errors, showAllErrors }) {
  const [activeKeys, setActiveKeys] = useState(['A']);
  const [touched, setTouched] = useState({});
  const [cleaningSignature, setCleaningSignature] = useState(false);
  const documentInputRef = useRef(null);

  const markTouched = (key) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  const visibleError = (key) => (showAllErrors || touched[key] ? errors[key] : undefined);

  const setField = (key, value) => onChange({ ...data, [key]: value });
  const setNested = (section, key, value) =>
    onChange({ ...data, [section]: { ...data[section], [key]: value } });

  const documents = data.documents || [];
  const issueCount = (keys) => keys.filter((key) => errors[key]).length;

  /* ---------------- Signature ---------------- */
  const handleSignatureChange = async (src) => {
    if (!src) {
      onChange((current) => ({
        ...current,
        signature: null,
        signatureAspect: null,
        signaturePlacements: null,
      }));
      return;
    }
    try {
      const prepared = await prepareSignatureImage(src);
      onChange((current) => ({
        ...current,
        signature: prepared.src,
        signatureAspect: prepared.aspect,
        signaturePlacements: createSignaturePlacements(prepared.aspect, CORRECTION_SIGNATURE_BOXES),
      }));
    } catch {
      const aspect = DEFAULT_SIGNATURE_ASPECT;
      onChange((current) => ({
        ...current,
        signature: src,
        signatureAspect: aspect,
        signaturePlacements: createSignaturePlacements(aspect, CORRECTION_SIGNATURE_BOXES),
      }));
    }
  };

  const resetSignaturePosition = () => {
    onChange((current) => ({
      ...current,
      signaturePlacements: createSignaturePlacements(
        current.signatureAspect || DEFAULT_SIGNATURE_ASPECT,
        CORRECTION_SIGNATURE_BOXES
      ),
    }));
  };

  const handleCleanSignature = async () => {
    if (!data.signature || cleaningSignature) return;
    setCleaningSignature(true);
    try {
      const cleaned = await cleanSignatureImage(data.signature);
      onChange((current) => ({
        ...current,
        signature: cleaned.src,
        signatureAspect: cleaned.aspect,
      }));
      message.success('Signature cleaned — background removed.');
    } catch (error) {
      message.error(error?.message || 'Could not clean this signature.');
    } finally {
      setCleaningSignature(false);
    }
  };

  /* ---------------- Other documents ---------------- */
  const addDocumentFile = (file) => {
    if (!file.type.startsWith('image/')) {
      message.error('Please choose PNG or JPEG images.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      message.error('Each document image must be smaller than 12 MB.');
      return;
    }
    const name = file.name || 'Document';
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const prepared = await prepareDocumentImage(String(reader.result));
        const document = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          src: prepared.src,
          aspect: prepared.aspect,
          placement: createDocumentPlacement(prepared.aspect),
        };
        onChange((current) => ({
          ...current,
          documents: [...(current.documents || []), document],
        }));
      } catch {
        message.error(`Could not read “${name}”.`);
      }
    };
    reader.onerror = () => message.error(`Could not read “${name}”.`);
    reader.readAsDataURL(file);
  };

  const handleDocumentFiles = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    files.forEach(addDocumentFile);
  };

  const removeDocument = (id) => {
    onChange((current) => ({
      ...current,
      documents: (current.documents || []).filter((document) => document.id !== id),
    }));
  };

  const resetDocumentPlacement = (id) => {
    onChange((current) => ({
      ...current,
      documents: (current.documents || []).map((document) =>
        document.id === id
          ? { ...document, placement: createDocumentPlacement(document.aspect || 1) }
          : document
      ),
    }));
  };

  const sections = [
    {
      key: 'A',
      icon: User,
      title: 'Part A – Personal Information',
      issueKeys: [
        'pan', 'aadhaar', 'changes',
        'nameA.first', 'nameA.last', 'nameB.first', 'nameB.last',
        'gender', 'dob', 'addressType',
        'address.flat', 'address.road', 'address.area', 'address.district',
        'address.state', 'address.country', 'address.pin',
        'contact.mobileCode', 'contact.mobile', 'contact.email',
      ],
      children: (
        <>
          <div className="fbs-form-note">
            The form must be filled in English, in block letters – as required by the printed guidelines.
            Tick each item that needs correction; those ticks print in the left margin of the form.
          </div>

          <div className="fbs-block-title">
            <Landmark size={12} /> PAN &amp; Aadhaar
          </div>
          <div className="fbs-grid-2">
            <Field label="Permanent Account Number (PAN)" required error={visibleError('pan')}>
              <CharInput
                value={data.pan}
                onChange={(next) => setField('pan', next.toUpperCase())}
                onBlur={() => markTouched('pan')}
                limit={CORRECTION_BOX_LIMITS.pan}
                placeholder="ABCDE1234F"
                error={visibleError('pan')}
              />
            </Field>
            <Field
              label="Aadhaar Number"
              required
              error={visibleError('aadhaar')}
              hint="12 digits. Mandatory except for exempt categories."
            >
              <DigitsInput
                value={data.aadhaar}
                onChange={(next) => setField('aadhaar', next)}
                onBlur={() => markTouched('aadhaar')}
                limit={CORRECTION_BOX_LIMITS.aadhaar}
                placeholder="123456789012"
                error={visibleError('aadhaar')}
              />
            </Field>
          </div>

          <div className="fbs-block-title">
            <ClipboardCheck size={12} /> Changes requested
          </div>
          <Field
            label="Tick the items being corrected"
            required
            error={visibleError('changes')}
            hint="At least one tick is needed. The form’s left margin is filled automatically."
          >
            <Checkbox.Group
              className="fbs-check-grid"
              value={data.changes}
              onChange={(values) => {
                setField('changes', values);
                markTouched('changes');
              }}
              options={CORRECTION_CHANGE_OPTIONS}
            />
          </Field>

          <div className="fbs-block-title">
            <User size={12} /> 1 A. Name
          </div>
          <div className="fbs-grid-3">
            <Field label="First Name" required error={visibleError('nameA.first')}>
              <CharInput
                value={data.nameA.first}
                onChange={(next) => setNested('nameA', 'first', next)}
                onBlur={() => markTouched('nameA.first')}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="RAVIKANT"
                error={visibleError('nameA.first')}
              />
            </Field>
            <Field label="Middle Name" optional>
              <CharInput
                value={data.nameA.middle}
                onChange={(next) => setNested('nameA', 'middle', next)}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="KUMAR"
              />
            </Field>
            <Field label="Last Name" required error={visibleError('nameA.last')}>
              <CharInput
                value={data.nameA.last}
                onChange={(next) => setNested('nameA', 'last', next)}
                onBlur={() => markTouched('nameA.last')}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="SARDA"
                error={visibleError('nameA.last')}
              />
            </Field>
          </div>

          <div className="fbs-block-title">
            <BookUser size={12} /> 1 B. Name as per Aadhaar
          </div>
          <div className="fbs-grid-3">
            <Field label="First Name" required error={visibleError('nameB.first')}>
              <CharInput
                value={data.nameB.first}
                onChange={(next) => setNested('nameB', 'first', next)}
                onBlur={() => markTouched('nameB.first')}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="SURESH"
                error={visibleError('nameB.first')}
              />
            </Field>
            <Field label="Middle Name" optional>
              <CharInput
                value={data.nameB.middle}
                onChange={(next) => setNested('nameB', 'middle', next)}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="KUMAR"
              />
            </Field>
            <Field label="Last Name" required error={visibleError('nameB.last')}>
              <CharInput
                value={data.nameB.last}
                onChange={(next) => setNested('nameB', 'last', next)}
                onBlur={() => markTouched('nameB.last')}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="SARDA"
                error={visibleError('nameB.last')}
              />
            </Field>
          </div>

          <Field
            label="2. Gender"
            required
            error={visibleError('gender')}
            hint="Select one option only."
          >
            <Radio.Group
              options={CORRECTION_GENDER_OPTIONS}
              optionType="button"
              value={data.gender}
              onChange={(event) => {
                setField('gender', event.target.value);
                markTouched('gender');
              }}
              className="fbs-radio-buttons"
            />
          </Field>

          <div className="fbs-grid-2">
            <Field
              label="3. Date of Birth"
              required
              error={visibleError('dob')}
              hint="Written in the day / month / year boxes on the form."
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                value={data.dob ? dayjs(data.dob) : null}
                onChange={(value) => {
                  setField('dob', value ? value.format('YYYY-MM-DD') : '');
                  markTouched('dob');
                }}
                disabledDate={(current) => current && current.isAfter(dayjs(), 'day')}
                placeholder="Select date of birth"
              />
            </Field>
          </div>

          <div className="fbs-block-title">
            <Home size={12} /> 4. Address
          </div>
          <Field
            label="Address type"
            required
            error={visibleError('addressType')}
            hint="Select Residence or Office – the form’s item 4 tick is filled automatically."
          >
            <Radio.Group
              options={CORRECTION_ADDRESS_TYPE_OPTIONS}
              optionType="button"
              value={data.addressType}
              onChange={(event) => {
                setField('addressType', event.target.value);
                markTouched('addressType');
              }}
              className="fbs-radio-buttons"
            />
          </Field>
          <AddressFields
            value={data.address}
            onChange={(next) => setField('address', next)}
            errors={errors}
            touched={touched}
            onTouch={markTouched}
          />

          <div className="fbs-grid-2">
            <Field
              label="5. Passport Number"
              optional
              hint="Mandatory for non-resident / resident but not ordinarily resident applicants."
            >
              <CharInput
                value={data.passport}
                onChange={(next) => setField('passport', next)}
                limit={CORRECTION_BOX_LIMITS.passport}
                placeholder="e.g. Z1234567"
              />
            </Field>
            <Field
              label="6. Taxpayer Identification Number (TIN)"
              optional
              hint="Mandatory if you are not a citizen of India."
            >
              <CharInput
                value={data.tin}
                onChange={(next) => setField('tin', next)}
                limit={CORRECTION_BOX_LIMITS.tin}
                placeholder="TIN in country of residence"
              />
            </Field>
          </div>

          <div className="fbs-block-title">
            <Mail size={12} /> 7. Contact Details
          </div>
          <ContactFields
            value={data.contact}
            onChange={(next) => setField('contact', next)}
            errors={errors}
            touched={touched}
            onTouch={markTouched}
          />
        </>
      ),
    },
    {
      key: 'B',
      icon: Users,
      title: 'Part B – Details of Parents',
      issueKeys: ['father.first', 'father.last', 'parentOnCard'],
      children: (
        <>
          <div className="fbs-block-title">
            <Users size={12} /> 8. Father’s Name
          </div>
          <div className="fbs-grid-3">
            <Field label="First Name" required error={visibleError('father.first')}>
              <CharInput
                value={data.father.first}
                onChange={(next) => setNested('father', 'first', next)}
                onBlur={() => markTouched('father.first')}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="Father’s first name"
                error={visibleError('father.first')}
              />
            </Field>
            <Field label="Middle Name" optional>
              <CharInput
                value={data.father.middle}
                onChange={(next) => setNested('father', 'middle', next)}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="Father’s middle name"
              />
            </Field>
            <Field label="Last Name" required error={visibleError('father.last')}>
              <CharInput
                value={data.father.last}
                onChange={(next) => setNested('father', 'last', next)}
                onBlur={() => markTouched('father.last')}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="Father’s last name"
                error={visibleError('father.last')}
              />
            </Field>
          </div>

          <div className="fbs-block-title">
            <Users size={12} /> 9. Mother’s Name <span className="fbs-note-inline">(optional)</span>
          </div>
          <div className="fbs-grid-3">
            <Field label="First Name" optional>
              <CharInput
                value={data.mother.first}
                onChange={(next) => setNested('mother', 'first', next)}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="Mother’s first name"
              />
            </Field>
            <Field label="Middle Name" optional>
              <CharInput
                value={data.mother.middle}
                onChange={(next) => setNested('mother', 'middle', next)}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="Mother’s middle name"
              />
            </Field>
            <Field label="Last Name" optional>
              <CharInput
                value={data.mother.last}
                onChange={(next) => setNested('mother', 'last', next)}
                limit={CORRECTION_BOX_LIMITS.namePart}
                placeholder="Mother’s last name"
              />
            </Field>
          </div>

          <Field
            label="10. Name of parent to be printed on the PAN card"
            required
            error={visibleError('parentOnCard')}
            hint="Select one parent."
          >
            <Radio.Group
              options={CORRECTION_PARENT_ON_CARD_OPTIONS}
              optionType="button"
              value={data.parentOnCard}
              onChange={(event) => {
                setField('parentOnCard', event.target.value);
                markTouched('parentOnCard');
              }}
              className="fbs-radio-buttons"
            />
          </Field>
        </>
      ),
    },
    {
      key: 'C',
      icon: ClipboardCheck,
      title: 'Part C – Documents & Verification',
      issueKeys: ['proofs', 'declaration.name', 'declaration.capacity', 'declaration.place', 'declaration.date'],
      children: (
        <>
          <div className="fbs-block-title">
            <ClipboardCheck size={12} /> 11. Documents submitted
          </div>
          <Field
            label="Documents enclosed"
            required
            error={visibleError('proofs')}
            hint="Tick all documents sent with the request. Copy of PAN is mandatory; tick the others that apply."
          >
            <Checkbox.Group
              className="fbs-check-grid"
              value={data.proofs}
              onChange={(values) => {
                setField('proofs', values);
                markTouched('proofs');
              }}
              options={CORRECTION_PROOF_OPTIONS}
            />
          </Field>

          <div className="fbs-block-title">
            <FileSignature size={12} /> Verification &amp; Declaration
          </div>
          <div className="fbs-grid-2">
            <Field
              label="Name in the declaration"
              required
              error={visibleError('declaration.name')}
              hint="Printed after “I,” in the declaration on page 2."
              className="fbs-span-2"
            >
              <Input
                value={data.declaration.name}
                onChange={(event) => setNested('declaration', 'name', event.target.value.replace(/[^\x20-\x7E]/g, ''))}
                onBlur={() => markTouched('declaration.name')}
                placeholder="Applicant’s full name"
                status={visibleError('declaration.name') ? 'error' : undefined}
                allowClear
              />
            </Field>
            <Field
              label="Capacity"
              required
              error={visibleError('declaration.capacity')}
              className="fbs-span-2"
            >
              <Radio.Group
                options={CORRECTION_CAPACITY_OPTIONS}
                optionType="button"
                value={data.declaration.capacity}
                onChange={(event) => {
                  setNested('declaration', 'capacity', event.target.value);
                  markTouched('declaration.capacity');
                }}
                className="fbs-radio-buttons"
              />
            </Field>
            <Field label="Place" required error={visibleError('declaration.place')}>
              <Input
                value={data.declaration.place}
                onChange={(event) => setNested('declaration', 'place', event.target.value.replace(/[^\x20-\x7E]/g, ''))}
                onBlur={() => markTouched('declaration.place')}
                placeholder="e.g. Ahmedabad"
                status={visibleError('declaration.place') ? 'error' : undefined}
                className="fbs-uppercase"
                allowClear
              />
            </Field>
            <Field label="Date" required error={visibleError('declaration.date')}>
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                value={data.declaration.date ? dayjs(data.declaration.date) : null}
                onChange={(value) => {
                  setNested('declaration', 'date', value ? value.format('YYYY-MM-DD') : '');
                  markTouched('declaration.date');
                }}
                disabledDate={(current) => current && current.isAfter(dayjs(), 'day')}
                placeholder="Select date"
              />
            </Field>
          </div>

          <div className="fbs-block-title">
            <FileSignature size={12} /> Photograph &amp; Signature
          </div>
          <div className="fbs-grid-2">
            <UploadBox
              label="Recent colour photograph"
              hint="4.5 cm × 3.5 cm, white background. Placed in both photograph boxes on page 1."
              value={data.photo}
              onChange={(next) => setField('photo', next)}
              aspect="photo"
            />
            <UploadBox
              label="Signature / left-hand thumb impression"
              hint="Printed in the signature box (page 2) and across the photograph (page 1)."
              value={data.signature}
              onChange={handleSignatureChange}
              aspect="signature"
            />
          </div>
          {data.signature && (
            <div className="fbs-signature-note">
              <span>
                Drag the signature on the preview to move it, or drag its corner handle to resize. If the upload
                still shows a background, use Clean signature.
              </span>
              <div className="fbs-signature-actions">
                <button
                  type="button"
                  className="fbs-clean-btn"
                  onClick={handleCleanSignature}
                  disabled={cleaningSignature}
                >
                  <Wand2 size={12} />
                  {cleaningSignature ? 'Cleaning…' : 'Clean signature'}
                </button>
                <button type="button" className="fbs-link-btn" onClick={resetSignaturePosition}>
                  Reset position
                </button>
              </div>
            </div>
          )}
        </>
      ),
    },
    {
      key: 'D',
      icon: Paperclip,
      title: 'Other Documents',
      issueKeys: [],
      badge: documents.length > 0 ? `${documents.length} page${documents.length === 1 ? '' : 's'}` : null,
      children: (
        <>
          <div className="fbs-hint fbs-block-hint">
            Optional. Add scans of supporting documents. Each image becomes its own page after the form.
          </div>
          <button
            type="button"
            className="fbs-doc-drop"
            onClick={() => documentInputRef.current?.click()}
          >
            <span className="fbs-doc-drop-icon">
              <ImagePlus size={17} />
            </span>
            <span className="fbs-doc-drop-text">
              <span className="fbs-doc-drop-title">Add document images</span>
              <span className="fbs-doc-drop-sub">PNG or JPEG · select several at once</span>
            </span>
          </button>
          <input
            ref={documentInputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="fbs-doc-input"
            onChange={handleDocumentFiles}
          />
          {documents.length === 0 ? (
            <div className="fbs-doc-empty">
              No attachments yet — each image you add becomes its own page.
            </div>
          ) : (
            <div className="fbs-doc-grid">
              {documents.map((document, index) => (
                <div className="fbs-doc-card" key={document.id}>
                  <div className="fbs-doc-media">
                    <img src={document.src} alt={document.name} />
                    <span className="fbs-doc-page">Page {CORRECTION_FORM_PAGES + index + 1}</span>
                    <span className="fbs-doc-tools">
                      <Tooltip title="Reset position and size">
                        <button
                          type="button"
                          className="fbs-doc-tool"
                          aria-label={`Reset placement of ${document.name}`}
                          onClick={() => resetDocumentPlacement(document.id)}
                        >
                          <RotateCcw size={12} />
                        </button>
                      </Tooltip>
                      <Tooltip title="Remove this page">
                        <button
                          type="button"
                          className="fbs-doc-tool danger"
                          aria-label={`Remove ${document.name}`}
                          onClick={() => removeDocument(document.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </Tooltip>
                    </span>
                  </div>
                  <div className="fbs-doc-info">
                    <span className="fbs-doc-name" title={document.name}>
                      {document.name}
                    </span>
                    <span className="fbs-doc-sub">Drag to move · resize</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="fbs-form-pane">
      <div className="fbs-form-scroll">
        <Collapse
          activeKey={activeKeys}
          onChange={(keys) => setActiveKeys(Array.isArray(keys) ? keys : [keys])}
          bordered={false}
          items={sections.map((section) => {
            const issues = issueCount(section.issueKeys);
            return {
              key: section.key,
              label: (
                <span className="fbs-collapse-label">
                  <SectionIcon icon={section.icon} />
                  <span className="fbs-collapse-title">{section.title}</span>
                  {issues > 0 ? (
                    showAllErrors ? <Tag color="error">{issues}</Tag> : null
                  ) : section.badge ? (
                    <Tag>{section.badge}</Tag>
                  ) : (
                    <Tag color="success">OK</Tag>
                  )}
                </span>
              ),
              children: <div className="fbs-section-body">{section.children}</div>,
            };
          })}
        />
      </div>
    </div>
  );
}
