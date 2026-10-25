import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Checkbox,
  Collapse,
  DatePicker,
  Input,
  Radio,
  Switch,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import {
  BadgeCheck,
  Building2,
  Camera,
  ClipboardCheck,
  FileSignature,
  Home,
  ImagePlus,
  Landmark,
  Mail,
  MapPin,
  Paperclip,
  PenLine,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
  Users,
  Wand2,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  PAN_APPLICANT_DOC_OPTIONS,
  PAN_BOX_LIMITS,
  PAN_CAPACITY_OPTIONS,
  PAN_COMMUNICATION_OPTIONS,
  PAN_GENDER_OPTIONS,
  PAN_RA_DOC_OPTIONS,
  PAN_PARENT_ON_CARD_OPTIONS,
  PAN_RESIDENTIAL_STATUS_OPTIONS,
  PAN_SINGLE_PARENT_OPTIONS,
  PAN_SOURCE_OPTIONS,
  countBoxes,
} from '../constants/panData';
import { PAN_FORM_PAGES } from '../constants/panLayout';
import {
  DEFAULT_SIGNATURE_ASPECT,
  cleanSignatureImage,
  createDocumentPlacement,
  createSignaturePlacements,
  prepareDocumentImage,
  prepareSignatureImage,
} from '../utils/panImages';

const { TextArea } = Input;

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

function CharInput({ value, onChange, limit, placeholder, error, onBlur, uppercase = true, width }) {
  const used = countBoxes(value);
  const handleChange = (event) => {
    let next = event.target.value.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ');
    while (countBoxes(next) > limit) next = next.slice(0, -1);
    onChange(next);
  };
  return (
    <div className="fbs-char-wrap" style={width ? { width } : undefined}>
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

function DigitsInput({ value, onChange, limit, placeholder, error, onBlur, className = '' }) {
  const handleChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '');
    onChange(digits.slice(0, limit));
  };
  return (
    <div className={`fbs-char-wrap ${className}`}>
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

function AddressBlock({ value, onChange, errors = {}, prefix, touched, onTouch, optional = false }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const keyOf = (key) => `${prefix}.${key}`;
  const err = (key) => (touched?.[keyOf(key)] ? errors[`${prefix}.${key}`] : undefined);

  return (
    <div className="fbs-group">
      <div className="fbs-grid-2">
        <Field label="Flat/Door/Building" required={!optional} error={err('flat')}>
          <CharInput
            value={value.flat}
            onChange={(next) => set('flat', next)}
            onBlur={() => onTouch(keyOf('flat'))}
            limit={PAN_BOX_LIMITS.addressPart}
            placeholder="e.g. B-204"
            error={err('flat')}
          />
        </Field>
        <Field label="Road/Street/Block/Sector" required={!optional} error={err('road')}>
          <CharInput
            value={value.road}
            onChange={(next) => set('road', next)}
            onBlur={() => onTouch(keyOf('road'))}
            limit={PAN_BOX_LIMITS.addressPart}
            placeholder="e.g. MG Road"
            error={err('road')}
          />
        </Field>
        <Field label="Post Office" error={err('post')}>
          <CharInput
            value={value.post}
            onChange={(next) => set('post', next)}
            onBlur={() => onTouch(keyOf('post'))}
            limit={PAN_BOX_LIMITS.addressPart}
            placeholder="e.g. Navrangpura"
            error={err('post')}
          />
        </Field>
        <Field label="Area/Locality/Town/City" required={!optional} error={err('area')}>
          <CharInput
            value={value.area}
            onChange={(next) => set('area', next)}
            onBlur={() => onTouch(keyOf('area'))}
            limit={PAN_BOX_LIMITS.addressPart}
            placeholder="e.g. Ahmedabad"
            error={err('area')}
          />
        </Field>
        <Field label="District" required={!optional} error={err('district')}>
          <CharInput
            value={value.district}
            onChange={(next) => set('district', next)}
            onBlur={() => onTouch(keyOf('district'))}
            limit={PAN_BOX_LIMITS.addressPart}
            placeholder="e.g. Ahmedabad"
            error={err('district')}
          />
        </Field>
        <Field label="PIN / ZIP Code" required={!optional} error={err('pin')}>
          <DigitsInput
            value={value.pin}
            onChange={(next) => set('pin', next)}
            onBlur={() => onTouch(keyOf('pin'))}
            limit={PAN_BOX_LIMITS.pin}
            placeholder="380009"
            error={err('pin')}
          />
        </Field>
        <Field label="State/Union Territory" required={!optional} error={err('state')}>
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
        <Field label="Country/Region" required={!optional} error={err('country')}>
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

function ContactBlock({ value, onChange, errors = {}, touched = {}, onTouch, prefix }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const keyOf = (key) => `${prefix}.${key}`;
  const err = (key) => (touched[keyOf(key)] ? errors[`${prefix}.${key}`] : undefined);

  return (
    <div className="fbs-grid-2">
      <Field label="Mobile Country Code" required error={err('mobileCode')} hint="Separate from the mobile number.">
        <DigitsInput
          value={value.mobileCode}
          onChange={(next) => set('mobileCode', next)}
          onBlur={() => onTouch(keyOf('mobileCode'))}
          limit={PAN_BOX_LIMITS.mobileCode}
          placeholder="91"
          error={err('mobileCode')}
        />
      </Field>
      <Field label="Mobile Number" required error={err('mobile')}>
        <DigitsInput
          value={value.mobile}
          onChange={(next) => set('mobile', next)}
          onBlur={() => onTouch(keyOf('mobile'))}
          limit={PAN_BOX_LIMITS.mobile}
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
      <Field label="Landline STD Code" optional error={err('stdCode')}>
        <DigitsInput
          value={value.stdCode}
          onChange={(next) => set('stdCode', next)}
          onBlur={() => onTouch(keyOf('stdCode'))}
          limit={PAN_BOX_LIMITS.stdCode}
          placeholder="79"
          error={err('stdCode')}
        />
      </Field>
      <Field label="Landline Number" optional error={err('landline')}>
        <DigitsInput
          value={value.landline}
          onChange={(next) => set('landline', next)}
          onBlur={() => onTouch(keyOf('landline'))}
          limit={PAN_BOX_LIMITS.landline}
          placeholder="26561234"
          error={err('landline')}
        />
      </Field>
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

/* ------------------------------------------------------------------ */
/* Main form                                                          */
/* ------------------------------------------------------------------ */

export default function PanCardForm({ data, onChange, errors, showAllErrors, raMandatory }) {
  const [activeKeys, setActiveKeys] = useState(['A']);
  const [touched, setTouched] = useState({});
  const [cleaningSignature, setCleaningSignature] = useState(false);
  const documentInputRef = useRef(null);

  const markTouched = (key) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  const visibleError = (key) => (showAllErrors || touched[key] ? errors[key] : undefined);

  const setField = (key, value) => onChange({ ...data, [key]: value });
  const setNested = (section, key, value) => onChange({ ...data, [section]: { ...data[section], [key]: value } });

  const communicationAddress = useMemo(() => {
    const source =
      data.communication === 'OFFICE'
        ? data.office
        : data.communication === 'RA'
          ? data.ra.address
          : data.residence;
    if (!source) return null;
    const parts = [
      source.flat,
      source.road,
      source.post,
      source.area,
      source.district,
      source.state,
      source.country,
      source.pin,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }, [data.communication, data.office, data.ra.address, data.residence]);

  const issueCount = (keys) => keys.filter((key) => errors[key]).length;
  const documents = data.documents || [];

  /**
   * The signature is printed twice (signature box + across the photograph).
   * White paper is made transparent and the image is cropped when uploaded so
   * it can sit over the photograph without hiding it.
   */
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
        signaturePlacements: createSignaturePlacements(prepared.aspect),
      }));
    } catch {
      const aspect = DEFAULT_SIGNATURE_ASPECT;
      onChange((current) => ({
        ...current,
        signature: src,
        signatureAspect: aspect,
        signaturePlacements: createSignaturePlacements(aspect),
      }));
    }
  };

  const resetSignaturePosition = () => {
    onChange((current) => ({
      ...current,
      signaturePlacements: createSignaturePlacements(current.signatureAspect || DEFAULT_SIGNATURE_ASPECT),
    }));
  };

  /**
   * Remove the paper / lighting from the uploaded signature and re-draw the
   * strokes as clean ink on a transparent background.
   */
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
        // Functional update: several images may finish at the same time.
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
        'firstName', 'lastName', 'gender', 'dob', 'aadhaar', 'aadhaarName', 'residentialStatus', 'passport',
        'residence.flat', 'residence.road', 'residence.area', 'residence.district',
        'residence.state', 'residence.country', 'residence.pin',
        'contact.mobileCode', 'contact.mobile', 'contact.email',
      ],
      children: (
        <>
          <div className="fbs-form-note">
            The form must be filled in English, in block letters – as required by the printed guidelines.
          </div>
          <div className="fbs-block-title">1. Name</div>
          <div className="fbs-grid-3">
            <Field label="First Name" required error={visibleError('firstName')}>
              <CharInput
                value={data.firstName}
                onChange={(next) => setField('firstName', next)}
                onBlur={() => markTouched('firstName')}
                limit={PAN_BOX_LIMITS.firstName}
                placeholder="RAVIKANT"
                error={visibleError('firstName')}
              />
            </Field>
            <Field label="Middle Name" optional error={visibleError('middleName')}>
              <CharInput
                value={data.middleName}
                onChange={(next) => setField('middleName', next)}
                onBlur={() => markTouched('middleName')}
                limit={PAN_BOX_LIMITS.middleName}
                placeholder="SURESH"
                error={visibleError('middleName')}
              />
            </Field>
            <Field label="Last Name" required error={visibleError('lastName')}>
              <CharInput
                value={data.lastName}
                onChange={(next) => setField('lastName', next)}
                onBlur={() => markTouched('lastName')}
                limit={PAN_BOX_LIMITS.lastName}
                placeholder="SARDA"
                error={visibleError('lastName')}
              />
            </Field>
          </div>
          <div className="fbs-hint fbs-block-hint">
            Full name without abbreviations and without titles (Shri, Smt, Dr., etc.).
          </div>
          <Field
            label="Name as per Aadhaar"
            required
            error={visibleError('aadhaarName')}
            hint="Exactly as printed on the Aadhaar card – initials are allowed here. If the Aadhaar name has initials, write the expanded name in item 1A above."
          >
            <TextArea
              value={data.aadhaarName}
              onChange={(event) => {
                let next = event.target.value.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ');
                while (countBoxes(next) > PAN_BOX_LIMITS.aadhaarName) next = next.slice(0, -1);
                setField('aadhaarName', next);
              }}
              onBlur={() => markTouched('aadhaarName')}
              autoSize={{ minRows: 1, maxRows: 2 }}
              maxLength={PAN_BOX_LIMITS.aadhaarName}
              placeholder="SURESH SARDA"
              className="fbs-uppercase"
            />
            <div className="fbs-inline-meta">
              <span className={`fbs-counter${countBoxes(data.aadhaarName) >= PAN_BOX_LIMITS.aadhaarName ? ' is-full' : ''}`}>
                {countBoxes(data.aadhaarName)}/{PAN_BOX_LIMITS.aadhaarName} boxes
              </span>
              <span className="fbs-hint">One blank box is kept after each word, as required by the form.</span>
            </div>
          </Field>

          <Field
            label="2. Gender"
            required
            error={visibleError('gender')}
            hint="Select one option only."
          >
            <Radio.Group
              options={PAN_GENDER_OPTIONS}
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
            <Field
              label="4. Aadhaar Number"
              required
              error={visibleError('aadhaar')}
              hint="12 digits. Mandatory except for exempt categories."
            >
              <DigitsInput
                value={data.aadhaar}
                onChange={(next) => setField('aadhaar', next)}
                onBlur={() => markTouched('aadhaar')}
                limit={PAN_BOX_LIMITS.aadhaar}
                placeholder="123456789012"
                error={visibleError('aadhaar')}
              />
            </Field>
          </div>

          <div className="fbs-block-title">
            <MapPin size={12} /> 5. Residence Address <span className="fbs-note-inline">(mandatory)</span>
          </div>
          <AddressBlock
            prefix="residence"
            value={data.residence}
            onChange={(next) => setField('residence', next)}
            errors={errors}
            touched={touched}
            onTouch={markTouched}
          />

          <div className="fbs-block-title">
            <Building2 size={12} /> 6. Office Address <span className="fbs-note-inline">(optional except for sole proprietors)</span>
          </div>
          <AddressBlock
            prefix="office"
            value={data.office}
            onChange={(next) => setField('office', next)}
            errors={errors}
            touched={touched}
            onTouch={markTouched}
            optional
          />

          <div className="fbs-block-title">7. Residential Status</div>
          <Field required error={visibleError('residentialStatus')} hint="Select one option only.">
            <Radio.Group
              value={data.residentialStatus}
              onChange={(event) => {
                setField('residentialStatus', event.target.value);
                markTouched('residentialStatus');
              }}
              className="fbs-radio-stack"
            >
              {PAN_RESIDENTIAL_STATUS_OPTIONS.map((option) => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          </Field>

          <div className="fbs-grid-2">
            <Field
              label="8. Passport Number"
              optional={data.residentialStatus !== 'NON_RESIDENT' && data.residentialStatus !== 'RNOR'}
              required={data.residentialStatus === 'NON_RESIDENT' || data.residentialStatus === 'RNOR'}
              error={visibleError('passport')}
              hint="Mandatory for Non-resident / Resident but not ordinarily resident applicants."
            >
              <CharInput
                value={data.passport}
                onChange={(next) => setField('passport', next)}
                onBlur={() => markTouched('passport')}
                limit={PAN_BOX_LIMITS.passport}
                placeholder="A1234567"
                error={visibleError('passport')}
              />
            </Field>
            <Field label="9. TIN (Country of Residence)" optional error={visibleError('tin')} hint="Optional.">
              <CharInput
                value={data.tin}
                onChange={(next) => setField('tin', next)}
                onBlur={() => markTouched('tin')}
                limit={PAN_BOX_LIMITS.tin}
                placeholder="e.g. TIN998877"
                error={visibleError('tin')}
              />
            </Field>
          </div>

          <div className="fbs-block-title">10. Contact Details</div>
          <ContactBlock
            prefix="contact"
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
      icon: BadgeCheck,
      title: 'Part B – Source of Income',
      issueKeys: ['sources'],
      children: (
        <Field
          label="11. Source of Income"
          required
          error={visibleError('sources')}
          hint="Select at least one. More than one option may be selected."
        >
          <Checkbox.Group
            value={data.sources}
            onChange={(values) => {
              setField('sources', values);
              markTouched('sources');
            }}
            className="fbs-check-grid"
            options={PAN_SOURCE_OPTIONS}
          />
        </Field>
      ),
    },
    {
      key: 'C',
      icon: Users,
      title: 'Part C – Details of Parents',
      issueKeys: ['singleParent', 'father.first', 'father.last', 'mother.first', 'mother.last', 'parentOnCard'],
      children: (
        <>
          <Field
            label="12. Whether mother/father is a single parent?"
            required
            error={visibleError('singleParent')}
            hint="If “No”, both parents’ names are needed. If “Yes”, the single parent’s details are enough."
          >
            <Radio.Group
              options={PAN_SINGLE_PARENT_OPTIONS}
              value={data.singleParent}
              onChange={(event) => {
                setField('singleParent', event.target.value);
                markTouched('singleParent');
              }}
            />
          </Field>

          <div className="fbs-block-title">13. Father’s Name</div>
          <div className="fbs-grid-3">
            <Field label="First Name" required={data.singleParent !== 'YES'} error={visibleError('father.first')}>
              <CharInput
                value={data.father.first}
                onChange={(next) => setNested('father', 'first', next)}
                onBlur={() => markTouched('father.first')}
                limit={PAN_BOX_LIMITS.fatherFirst}
                error={visibleError('father.first')}
              />
            </Field>
            <Field label="Middle Name" optional>
              <CharInput
                value={data.father.middle}
                onChange={(next) => setNested('father', 'middle', next)}
                limit={PAN_BOX_LIMITS.fatherMiddle}
              />
            </Field>
            <Field label="Last Name" required={data.singleParent !== 'YES'} error={visibleError('father.last')}>
              <CharInput
                value={data.father.last}
                onChange={(next) => setNested('father', 'last', next)}
                onBlur={() => markTouched('father.last')}
                limit={PAN_BOX_LIMITS.fatherLast}
                error={visibleError('father.last')}
              />
            </Field>
          </div>

          <div className="fbs-block-title">14. Mother’s Name</div>
          <div className="fbs-grid-3">
            <Field label="First Name" required={data.singleParent !== 'YES'} error={visibleError('mother.first')}>
              <CharInput
                value={data.mother.first}
                onChange={(next) => setNested('mother', 'first', next)}
                onBlur={() => markTouched('mother.first')}
                limit={PAN_BOX_LIMITS.motherFirst}
                error={visibleError('mother.first')}
              />
            </Field>
            <Field label="Middle Name" optional>
              <CharInput
                value={data.mother.middle}
                onChange={(next) => setNested('mother', 'middle', next)}
                limit={PAN_BOX_LIMITS.motherMiddle}
              />
            </Field>
            <Field label="Last Name" required={data.singleParent !== 'YES'} error={visibleError('mother.last')}>
              <CharInput
                value={data.mother.last}
                onChange={(next) => setNested('mother', 'last', next)}
                onBlur={() => markTouched('mother.last')}
                limit={PAN_BOX_LIMITS.motherLast}
                error={visibleError('mother.last')}
              />
            </Field>
          </div>

          <Field
            label="15. Parent’s name to be printed on the PAN card"
            required
            error={visibleError('parentOnCard')}
            hint="Choose whose name should appear on the printed PAN card."
          >
            <Radio.Group
              options={PAN_PARENT_ON_CARD_OPTIONS}
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
      key: 'D',
      icon: Landmark,
      title: 'Part D – Assessing Officer (AO Code) – optional',
      issueKeys: [],
      children: (
        <>
          <div className="fbs-hint fbs-block-hint">
            Optional – leave these fields blank if the AO code is not known. It can also be obtained from the Income Tax
            Office or a PAN service centre.
          </div>
          <div className="fbs-grid-4">
            <Field label="Area Code" optional>
              <CharInput
                value={data.ao.area}
                onChange={(next) => setNested('ao', 'area', next)}
                limit={PAN_BOX_LIMITS.aoArea}
              />
            </Field>
            <Field label="AO Type" optional>
              <CharInput
                value={data.ao.type}
                onChange={(next) => setNested('ao', 'type', next)}
                limit={PAN_BOX_LIMITS.aoType}
              />
            </Field>
            <Field label="Range Code" optional>
              <CharInput
                value={data.ao.range}
                onChange={(next) => setNested('ao', 'range', next)}
                limit={PAN_BOX_LIMITS.aoRange}
              />
            </Field>
            <Field label="AO Number" optional>
              <CharInput
                value={data.ao.number}
                onChange={(next) => setNested('ao', 'number', next)}
                limit={PAN_BOX_LIMITS.aoNumber}
              />
            </Field>
          </div>
        </>
      ),
    },
    {
      key: 'E',
      icon: ShieldCheck,
      title: 'Part E – Representative Assessee (if applicable)',
      issueKeys: ['ra.first', 'ra.pan', 'ra.address', 'ra.mobile', 'ra.email'],
      children: (
        <>
          <div className="fbs-switch-row">
            <div>
              <div className="fbs-switch-title">Representative Assessee details apply</div>
              <div className="fbs-hint">
                Mandatory for minors, mentally ill / unsound mind applicants, non-residents and “resident but not ordinarily
                resident” applicants.
              </div>
            </div>
            <Switch
              checked={data.raApplicable}
              onChange={(checked) => {
                const next = { ...data, raApplicable: checked };
                if (!checked && data.communication === 'RA') next.communication = '';
                onChange(next);
              }}
            />
          </div>

          {raMandatory && !data.raApplicable && (
            <Alert
              type="warning"
              showIcon
              className="fbs-inline-alert"
              message="Representative Assessee details appear to be mandatory for this applicant."
            />
          )}

          {data.raApplicable && (
            <div className="fbs-subsection">
              <div className="fbs-block-title">17. Representative Assessee’s Name</div>
              <div className="fbs-grid-3">
                <Field label="First Name" required error={visibleError('ra.first')}>
                  <CharInput
                    value={data.ra.first}
                    onChange={(next) => setNested('ra', 'first', next)}
                    onBlur={() => markTouched('ra.first')}
                    limit={PAN_BOX_LIMITS.raFirst}
                    error={visibleError('ra.first')}
                  />
                </Field>
                <Field label="Middle Name" optional>
                  <CharInput
                    value={data.ra.middle}
                    onChange={(next) => setNested('ra', 'middle', next)}
                    limit={PAN_BOX_LIMITS.raMiddle}
                  />
                </Field>
                <Field label="Last Name" required error={visibleError('ra.last')}>
                  <CharInput
                    value={data.ra.last}
                    onChange={(next) => setNested('ra', 'last', next)}
                    limit={PAN_BOX_LIMITS.raLast}
                  />
                </Field>
              </div>

              <div className="fbs-grid-2">
                <Field label="18. Permanent Account Number (PAN)" optional error={visibleError('ra.pan')}>
                  <CharInput
                    value={data.ra.pan}
                    onChange={(next) => setNested('ra', 'pan', next)}
                    onBlur={() => markTouched('ra.pan')}
                    limit={PAN_BOX_LIMITS.raPan}
                    placeholder="ABCDE1234F"
                    error={visibleError('ra.pan')}
                  />
                </Field>
                <Field
                  label="19. Aadhaar Number"
                  optional={Boolean(data.ra.pan)}
                  required={!data.ra.pan}
                  error={visibleError('ra.aadhaar')}
                  hint="Mandatory if the Representative Assessee PAN is not available."
                >
                  <DigitsInput
                    value={data.ra.aadhaar}
                    onChange={(next) => setNested('ra', 'aadhaar', next)}
                    onBlur={() => markTouched('ra.aadhaar')}
                    limit={PAN_BOX_LIMITS.raAadhaar}
                    error={visibleError('ra.aadhaar')}
                  />
                </Field>
              </div>

              <div className="fbs-block-title">20. Representative Assessee Address</div>
              {visibleError('ra.address') && <div className="fbs-error">{visibleError('ra.address')}</div>}
              <AddressBlock
                prefix="ra.address"
                value={data.ra.address}
                onChange={(next) => setNested('ra', 'address', next)}
                errors={errors}
                touched={touched}
                onTouch={markTouched}
              />

              <div className="fbs-block-title">21. Representative Assessee Contact Details</div>
              <ContactBlock
                prefix="ra.contact"
                value={data.ra.contact}
                onChange={(next) => setNested('ra', 'contact', next)}
                errors={errors}
                touched={touched}
                onTouch={markTouched}
              />
            </div>
          )}
        </>
      ),
    },
    {
      key: 'F',
      icon: Home,
      title: 'Part F – Communication Address',
      issueKeys: ['communication'],
      children: (
        <>
          <Field label="22. Address for Communication" required error={visibleError('communication')}>
            <Radio.Group
              value={data.communication}
              onChange={(event) => {
                setField('communication', event.target.value);
                markTouched('communication');
              }}
              className="fbs-radio-stack"
            >
              {PAN_COMMUNICATION_OPTIONS.map((option) => (
                <Radio
                  key={option.value}
                  value={option.value}
                  disabled={option.value === 'RA' && !data.raApplicable}
                >
                  {option.label}
                  {option.value === 'RA' && !data.raApplicable ? ' (enable Part E first)' : ''}
                </Radio>
              ))}
            </Radio.Group>
          </Field>
          <div className="fbs-readout">
            <div className="fbs-readout-label">Address that will be used on the form</div>
            <div className="fbs-readout-value">{communicationAddress || 'No address entered yet.'}</div>
          </div>
        </>
      ),
    },
    {
      key: 'G',
      icon: ClipboardCheck,
      title: 'Part G – Documents & Declaration',
      issueKeys: ['declaration.name', 'declaration.capacity', 'declaration.place', 'declaration.date'],
      children: (
        <>
          <Field
            label="23. Applicant’s supporting documents"
            hint="Tick the documents submitted with the application."
          >
            <Checkbox.Group
              value={data.applicantDocs}
              onChange={(values) => setField('applicantDocs', values)}
              className="fbs-check-grid"
              options={PAN_APPLICANT_DOC_OPTIONS}
            />
          </Field>

          <Field
            label="24. Representative Assessee’s supporting documents"
            hint="Applicable only when a Representative Assessee is involved."
          >
            <Checkbox.Group
              value={data.raApplicable ? data.raDocs : []}
              disabled={!data.raApplicable}
              onChange={(values) => setField('raDocs', values)}
              className="fbs-check-grid"
              options={PAN_RA_DOC_OPTIONS}
            />
          </Field>

          <div className="fbs-block-title">
            <PenLine size={12} /> Verification &amp; Declaration
          </div>

          <div className="fbs-grid-2">
            <Field
              label="Applicant / Representative Assessee Name"
              required
              error={visibleError('declaration.name')}
              hint="Filled on the dotted line of clause (a)."
            >
              <CharInput
                value={data.declaration.name}
                onChange={(next) => setNested('declaration', 'name', next)}
                onBlur={() => markTouched('declaration.name')}
                limit={40}
                error={visibleError('declaration.name')}
              />
            </Field>
            <Field label="Capacity" required error={visibleError('declaration.capacity')}>
              <Radio.Group
                options={PAN_CAPACITY_OPTIONS}
                value={data.declaration.capacity}
                onChange={(event) => {
                  setNested('declaration', 'capacity', event.target.value);
                  markTouched('declaration.capacity');
                }}
              />
            </Field>
            <Field label="Place" required error={visibleError('declaration.place')}>
              <Input
                value={data.declaration.place}
                onChange={(event) => setNested('declaration', 'place', event.target.value.replace(/[^\x20-\x7E]/g, ''))}
                onBlur={() => markTouched('declaration.place')}
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
              />
            </Field>
          </div>

          <Field label="Designation" optional hint="Printed below the signature box.">
            <Input
              value={data.declaration.designation}
              onChange={(event) => setNested('declaration', 'designation', event.target.value.replace(/[^\x20-\x7E]/g, ''))}
              className="fbs-uppercase"
              allowClear
            />
          </Field>

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
      key: 'H',
      icon: Paperclip,
      title: 'Other Documents',
      issueKeys: [],
      badge: documents.length > 0 ? `${documents.length} page${documents.length === 1 ? '' : 's'}` : null,
      children: (
        <>
          <div className="fbs-hint fbs-block-hint">
            Optional. Add scans of supporting documents (proof of identity, proof of address, annexures).
            Each image becomes its own page after the form.
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
                    <span className="fbs-doc-page">Page {PAN_FORM_PAGES + index + 1}</span>
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
