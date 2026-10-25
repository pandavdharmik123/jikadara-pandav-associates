import { useState } from 'react';
import { Collapse, DatePicker, Input, Select, Tag } from 'antd';
import {
  BookUser,
  FileSignature,
  Heart,
  User,
  Users,
} from 'lucide-react';
import dayjs from 'dayjs';
import GujaratiFontInput from './GujaratiFontInput';
import {
  MARRIAGE_BRIDE_STATUS_OPTIONS,
  MARRIAGE_GROOM_STATUS_OPTIONS,
  MARRIAGE_LIMITS,
  MARRIAGE_SECTION_KEYS,
} from '../constants/marriageData';

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

function SectionIcon({ icon: Icon }) {
  return (
    <span className="fbs-section-icon">
      <Icon size={14} />
    </span>
  );
}

function DateInput({ value, onChange, onBlur, error }) {
  return (
    <DatePicker
      value={value ? dayjs(value) : null}
      onChange={(next) => onChange(next ? next.format('YYYY-MM-DD') : '')}
      onBlur={onBlur}
      format="DD-MM-YYYY"
      placeholder="DD-MM-YYYY"
      allowClear
      style={{ width: '100%' }}
      status={error ? 'error' : undefined}
    />
  );
}

function AgeInput({ value, onChange, onBlur, error }) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, MARRIAGE_LIMITS.age))}
      onBlur={onBlur}
      inputMode="numeric"
      maxLength={MARRIAGE_LIMITS.age}
      placeholder="e.g. 28"
      status={error ? 'error' : undefined}
    />
  );
}

function MobileInput({ value, onChange, onBlur, error }) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, MARRIAGE_LIMITS.mobile))}
      onBlur={onBlur}
      inputMode="tel"
      maxLength={MARRIAGE_LIMITS.mobile}
      placeholder="10-digit mobile number"
      status={error ? 'error' : undefined}
      suffix={<span className="fbs-hint">{String(value || '').length}/10</span>}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Reusable person block (groom / bride)                              */
/* ------------------------------------------------------------------ */

function PersonFields({
  role,
  prefix,
  value,
  onChange,
  errors,
  showAllErrors,
  touched,
  markTouched,
  statusOptions,
}) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const err = (key) => (showAllErrors || touched[`${prefix}.${key}`] ? errors[`${prefix}.${key}`] : undefined);

  return (
    <>
      <div className="fbs-grid-2">
        <Field label={`${role} full name`} required error={err('name')} className="fbs-span-2">
          <GujaratiFontInput
            font="ghanshyam"
            value={value.name}
            onChange={(next) => set('name', next)}
            onBlur={() => markTouched(`${prefix}.name`)}
            maxLength={MARRIAGE_LIMITS.name}
            status={err('name') ? 'error' : undefined}
          />
        </Field>
        <Field label="Age" required error={err('age')}>
          <AgeInput
            value={value.age}
            onChange={(next) => set('age', next)}
            onBlur={() => markTouched(`${prefix}.age`)}
            error={err('age')}
          />
        </Field>
        <Field label="Date of birth" required error={err('dob')}>
          <DateInput
            value={value.dob}
            onChange={(next) => set('dob', next)}
            onBlur={() => markTouched(`${prefix}.dob`)}
            error={err('dob')}
          />
        </Field>
        <Field label="Religion" required error={err('religion')} className="fbs-span-2">
          <GujaratiFontInput
            font="nilkanth"
            value={value.religion}
            onChange={(next) => set('religion', next)}
            onBlur={() => markTouched(`${prefix}.religion`)}
            maxLength={MARRIAGE_LIMITS.text}
            status={err('religion') ? 'error' : undefined}
          />
        </Field>
      </div>

      <Field
        label="Residence place (રહેઠાણનું સામાન્ય સ્થળ)"
        required
        error={err('residence')}
        hint="Printed in the રહેઠાણનું સામાન્ય સ્થળ line. Long addresses wrap automatically."
      >
        <GujaratiFontInput
          font="nilkanth"
          multiline
          rows={2}
          value={value.residence}
          onChange={(next) => set('residence', next)}
          onBlur={() => markTouched(`${prefix}.residence`)}
          maxLength={MARRIAGE_LIMITS.address}
          status={err('residence') ? 'error' : undefined}
        />
      </Field>

      <Field label="Address (સરનામું)" optional error={err('address')}>
        <GujaratiFontInput
          font="nilkanth"
          value={value.address}
          onChange={(next) => set('address', next)}
          onBlur={() => markTouched(`${prefix}.address`)}
          maxLength={MARRIAGE_LIMITS.address}
          status={err('address') ? 'error' : undefined}
        />
      </Field>

      <Field label="Marital status (લગ્ન સમયે દરજ્જો)" optional>
        <Select
          value={value.maritalStatus || undefined}
          onChange={(next) => set('maritalStatus', next || '')}
          options={statusOptions}
          allowClear
          placeholder="Select status (optional)"
        />
      </Field>

      <div className="fbs-block-title">
        <Users size={12} /> Parent / guardian
      </div>
      <div className="fbs-grid-2">
        <Field label="Parent / guardian full name" required error={err('parentName')} className="fbs-span-2">
          <GujaratiFontInput
            font="nilkanth"
            value={value.parentName}
            onChange={(next) => set('parentName', next)}
            onBlur={() => markTouched(`${prefix}.parentName`)}
            maxLength={MARRIAGE_LIMITS.name}
            status={err('parentName') ? 'error' : undefined}
          />
        </Field>
        <Field label="Parent / guardian age" required error={err('parentAge')}>
          <AgeInput
            value={value.parentAge}
            onChange={(next) => set('parentAge', next)}
            onBlur={() => markTouched(`${prefix}.parentAge`)}
            error={err('parentAge')}
          />
        </Field>
        <Field label="Parent / guardian address" optional error={err('parentAddress')}>
          <GujaratiFontInput
            font="nilkanth"
            value={value.parentAddress}
            onChange={(next) => set('parentAddress', next)}
            onBlur={() => markTouched(`${prefix}.parentAddress`)}
            maxLength={MARRIAGE_LIMITS.address}
            status={err('parentAddress') ? 'error' : undefined}
          />
        </Field>
      </div>
      <Field
        label="Parent / guardian residence place (રહેઠાણનું સામાન્ય સ્થળ)"
        required
        error={err('parentResidence')}
      >
        <GujaratiFontInput
          font="nilkanth"
          multiline
          rows={2}
          value={value.parentResidence}
          onChange={(next) => set('parentResidence', next)}
          onBlur={() => markTouched(`${prefix}.parentResidence`)}
          maxLength={MARRIAGE_LIMITS.address}
          status={err('parentResidence') ? 'error' : undefined}
        />
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Witness block                                                      */
/* ------------------------------------------------------------------ */

function WitnessFields({
  index,
  value,
  onChange,
  errors,
  showAllErrors,
  touched,
  markTouched,
}) {
  const prefix = `witnesses.${index}`;
  const set = (key, next) => onChange({ ...value, [key]: next });
  const err = (key) => (showAllErrors || touched[`${prefix}.${key}`] ? errors[`${prefix}.${key}`] : undefined);

  return (
    <>
      <div className="fbs-block-title">
        <Users size={12} /> Witness {index + 1}
      </div>
      <div className="fbs-grid-2">
        <Field label={`Witness ${index + 1} full name`} required error={err('name')}>
          <GujaratiFontInput
            font="nilkanth"
            value={value.name}
            onChange={(next) => set('name', next)}
            onBlur={() => markTouched(`${prefix}.name`)}
            maxLength={MARRIAGE_LIMITS.name}
            status={err('name') ? 'error' : undefined}
          />
        </Field>
        <Field label="Age" required error={err('age')}>
          <AgeInput
            value={value.age}
            onChange={(next) => set('age', next)}
            onBlur={() => markTouched(`${prefix}.age`)}
            error={err('age')}
          />
        </Field>
      </div>
      <Field label={`Witness ${index + 1} address (સરનામું)`} required error={err('address')}>
        <GujaratiFontInput
          font="nilkanth"
          value={value.address}
          onChange={(next) => set('address', next)}
          onBlur={() => markTouched(`${prefix}.address`)}
          maxLength={MARRIAGE_LIMITS.address}
          status={err('address') ? 'error' : undefined}
        />
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main form                                                          */
/* ------------------------------------------------------------------ */

export default function MarriageForm({ data, onChange, errors, showAllErrors }) {
  const [activeKeys, setActiveKeys] = useState(['application', 'marriage', 'groom']);
  const [touched, setTouched] = useState({});

  const markTouched = (key) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  const visibleError = (key) => (showAllErrors || touched[key] ? errors[key] : undefined);
  const issueCount = (keys) => keys.filter((key) => errors[key]).length;

  const setApplication = (key, value) =>
    onChange({ ...data, application: { ...data.application, [key]: value } });
  const setMarriage = (key, value) =>
    onChange({ ...data, marriage: { ...data.marriage, [key]: value } });
  const setOfficiant = (key, value) =>
    onChange({ ...data, officiant: { ...data.officiant, [key]: value } });
  const setWitness = (index, next) => {
    const witnesses = (data.witnesses || []).map((witness, witnessIndex) =>
      witnessIndex === index ? next : witness
    );
    onChange({ ...data, witnesses });
  };

  const sections = [
    {
      key: 'application',
      icon: FileSignature,
      title: 'Application (પત્ર)',
      issueKeys: MARRIAGE_SECTION_KEYS.application,
      children: (
        <>
          <div className="fbs-grid-2">
            <Field label="Mobile number (મો.)" required error={visibleError('application.mobile')}>
              <MobileInput
                value={data.application.mobile}
                onChange={(next) => setApplication('mobile', next)}
                onBlur={() => markTouched('application.mobile')}
                error={visibleError('application.mobile')}
              />
            </Field>
            <Field label="Application place (સ્થળ)" required error={visibleError('application.place')}>
              <GujaratiFontInput
                font="nilkanth"
                value={data.application.place}
                onChange={(next) => setApplication('place', next)}
                onBlur={() => markTouched('application.place')}
                maxLength={MARRIAGE_LIMITS.text}
                status={visibleError('application.place') ? 'error' : undefined}
              />
            </Field>
            <Field label="Application date (તારીખ)" required error={visibleError('application.date')}>
              <DateInput
                value={data.application.date}
                onChange={(next) => setApplication('date', next)}
                onBlur={() => markTouched('application.date')}
                error={visibleError('application.date')}
              />
            </Field>
          </div>
        </>
      ),
    },
    {
      key: 'marriage',
      icon: Heart,
      title: 'Marriage details (લગ્નની વિગત)',
      issueKeys: MARRIAGE_SECTION_KEYS.marriage,
      children: (
        <div className="fbs-grid-2">
          <Field
            label="Marriage date (લગ્નની તારીખ)"
            required
            error={visibleError('marriage.date')}
            hint="Printed on page 1 and page 2."
          >
            <DateInput
              value={data.marriage.date}
              onChange={(next) => setMarriage('date', next)}
              onBlur={() => markTouched('marriage.date')}
              error={visibleError('marriage.date')}
            />
          </Field>
          <Field
            label="Marriage venue (લગ્નનું સ્થળ)"
            required
            error={visibleError('marriage.place')}
            hint="Used on page 1 and page 2. Long venues flow onto the next line automatically."
            className="fbs-span-2"
          >
            <GujaratiFontInput
              font="ghanshyam"
              multiline
              rows={2}
              value={data.marriage.place}
              onChange={(next) => setMarriage('place', next)}
              onBlur={() => markTouched('marriage.place')}
              maxLength={MARRIAGE_LIMITS.address}
              status={visibleError('marriage.place') ? 'error' : undefined}
            />
          </Field>
        </div>
      ),
    },
    {
      key: 'groom',
      icon: User,
      title: 'Groom (વરરાજા)',
      issueKeys: MARRIAGE_SECTION_KEYS.groom,
      children: (
        <PersonFields
          role="Groom"
          prefix="groom"
          value={data.groom}
          onChange={(next) => onChange({ ...data, groom: next })}
          errors={errors}
          showAllErrors={showAllErrors}
          touched={touched}
          markTouched={markTouched}
          statusOptions={MARRIAGE_GROOM_STATUS_OPTIONS}
        />
      ),
    },
    {
      key: 'bride',
      icon: User,
      title: 'Bride (કન્યા)',
      issueKeys: MARRIAGE_SECTION_KEYS.bride,
      children: (
        <PersonFields
          role="Bride"
          prefix="bride"
          value={data.bride}
          onChange={(next) => onChange({ ...data, bride: next })}
          errors={errors}
          showAllErrors={showAllErrors}
          touched={touched}
          markTouched={markTouched}
          statusOptions={MARRIAGE_BRIDE_STATUS_OPTIONS}
        />
      ),
    },
    {
      key: 'officiant',
      icon: BookUser,
      title: 'Officiant (વિધિ કરાવનાર)',
      issueKeys: MARRIAGE_SECTION_KEYS.officiant,
      children: (
        <>
          <div className="fbs-grid-2">
            <Field label="Officiant full name" required error={visibleError('officiant.name')} className="fbs-span-2">
              <GujaratiFontInput
                font="nilkanth"
                value={data.officiant.name}
                onChange={(next) => setOfficiant('name', next)}
                onBlur={() => markTouched('officiant.name')}
                maxLength={MARRIAGE_LIMITS.name}
                status={visibleError('officiant.name') ? 'error' : undefined}
              />
            </Field>
            <Field label="Age" required error={visibleError('officiant.age')}>
              <AgeInput
                value={data.officiant.age}
                onChange={(next) => setOfficiant('age', next)}
                onBlur={() => markTouched('officiant.age')}
                error={visibleError('officiant.age')}
              />
            </Field>
            <Field label="Residence place (રહેઠાણનું સ્થળ)" optional>
              <GujaratiFontInput
                font="nilkanth"
                value={data.officiant.residence}
                onChange={(next) => setOfficiant('residence', next)}
                onBlur={() => markTouched('officiant.residence')}
                maxLength={MARRIAGE_LIMITS.address}
              />
            </Field>
          </div>
          <Field label="Address (સરનામું)" required error={visibleError('officiant.address')}>
            <GujaratiFontInput
              font="nilkanth"
              value={data.officiant.address}
              onChange={(next) => setOfficiant('address', next)}
              onBlur={() => markTouched('officiant.address')}
              maxLength={MARRIAGE_LIMITS.address}
              status={visibleError('officiant.address') ? 'error' : undefined}
            />
          </Field>
        </>
      ),
    },
    {
      key: 'witnesses',
      icon: Users,
      title: 'Witnesses (સાક્ષી)',
      issueKeys: MARRIAGE_SECTION_KEYS.witnesses,
      children: (
        <>
          {(data.witnesses || []).map((witness, index) => (
            <WitnessFields
              key={witness.id || index}
              index={index}
              value={witness}
              onChange={(next) => setWitness(index, next)}
              errors={errors}
              showAllErrors={showAllErrors}
              touched={touched}
              markTouched={markTouched}
            />
          ))}
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
