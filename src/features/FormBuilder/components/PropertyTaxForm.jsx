import { useState } from 'react';
import { Collapse, DatePicker, Input, Tag } from 'antd';
import { FileSignature, FileText, Home, MapPin, Ruler, User } from 'lucide-react';
import dayjs from 'dayjs';
import GujaratiFontInput from './GujaratiFontInput';
import {
  PROPERTY_TAX_LIMITS,
  PROPERTY_TAX_SECTION_KEYS,
} from '../constants/propertyTaxData';

function Field({ label, hint, error, required, optional, children, className = '' }) {
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

export default function PropertyTaxForm({ data, onChange, errors, showAllErrors }) {
  const [activeKeys, setActiveKeys] = useState([
    'application',
    'owner',
    'transferee',
    'property',
    'boundaries',
    'documents',
  ]);
  const [touched, setTouched] = useState({});

  const markTouched = (key) => setTouched((previous) => (previous[key] ? previous : { ...previous, [key]: true }));
  const visibleError = (key) => (showAllErrors || touched[key] ? errors?.[key] : undefined);
  const issueCount = (keys = []) => keys.filter((key) => errors?.[key]).length;

  const booking = data?.booking || {};
  const owner = data?.owner || {};
  const transferee = data?.transferee || {};
  const numbers = data?.numbers || {};
  const boundaries = data?.boundaries || {};

  const setBooking = (key, value) =>
    onChange({ ...data, booking: { ...(data?.booking || {}), [key]: value } });
  const setOwner = (key, value) =>
    onChange({ ...data, owner: { ...(data?.owner || {}), [key]: value } });
  const setTransferee = (key, value) =>
    onChange({ ...data, transferee: { ...(data?.transferee || {}), [key]: value } });
  const setNumber = (key, value) =>
    onChange({ ...data, numbers: { ...(data?.numbers || {}), [key]: value } });
  const setBoundary = (key, value) =>
    onChange({ ...data, boundaries: { ...(data?.boundaries || {}), [key]: value } });

  const sections = [
    {
      key: 'application',
      icon: FileSignature,
      title: 'Application (અરજી)',
      issueKeys: PROPERTY_TAX_SECTION_KEYS.application,
      children: (
        <>
          <div className="fbs-grid-2">
            <Field label="Application date (તારીખ)" required error={visibleError('date')}>
              <DateInput
                value={data.date}
                onChange={(next) => onChange({ ...data, date: next })}
                onBlur={() => markTouched('date')}
                error={visibleError('date')}
              />
            </Field>
          </div>
          <div className="fbs-block-title">
            <Home size={12} /> Municipal property numbers
          </div>
          <div className="fbs-grid-2">
            <Field label="Ward No." error={visibleError('booking.wardNo')}>
              <GujaratiFontInput
                font="nilkanth"
                value={booking.wardNo}
                onChange={(next) => setBooking('wardNo', next)}
                onBlur={() => markTouched('booking.wardNo')}
                maxLength={PROPERTY_TAX_LIMITS.number}
                status={visibleError('booking.wardNo') ? 'error' : undefined}
              />
            </Field>
            <Field label="Location No." error={visibleError('booking.locationNo')}>
              <GujaratiFontInput
                font="nilkanth"
                value={booking.locationNo}
                onChange={(next) => setBooking('locationNo', next)}
                onBlur={() => markTouched('booking.locationNo')}
                maxLength={PROPERTY_TAX_LIMITS.number}
                status={visibleError('booking.locationNo') ? 'error' : undefined}
              />
            </Field>
            <Field label="Owner No." error={visibleError('booking.ownerNo')}>
              <GujaratiFontInput
                font="nilkanth"
                value={booking.ownerNo}
                onChange={(next) => setBooking('ownerNo', next)}
                onBlur={() => markTouched('booking.ownerNo')}
                maxLength={PROPERTY_TAX_LIMITS.number}
                status={visibleError('booking.ownerNo') ? 'error' : undefined}
              />
            </Field>
            <Field label="Occupier No." error={visibleError('booking.occupierNo')}>
              <GujaratiFontInput
                font="nilkanth"
                value={booking.occupierNo}
                onChange={(next) => setBooking('occupierNo', next)}
                onBlur={() => markTouched('booking.occupierNo')}
                maxLength={PROPERTY_TAX_LIMITS.number}
                status={visibleError('booking.occupierNo') ? 'error' : undefined}
              />
            </Field>
          </div>
        </>
      ),
    },
    {
      key: 'owner',
      icon: Home,
      title: 'Current owner (હાલના માલિક)',
      issueKeys: PROPERTY_TAX_SECTION_KEYS.owner,
      children: (
        <>
          <Field
            label="Owner name (નોધાયેલું નામ)"
            required
            error={visibleError('owner.name')}
          >
            <GujaratiFontInput
              font="nilkanth"
              value={owner.name}
              onChange={(next) => setOwner('name', next)}
              onBlur={() => markTouched('owner.name')}
              maxLength={PROPERTY_TAX_LIMITS.text}
              status={visibleError('owner.name') ? 'error' : undefined}
            />
          </Field>
          <Field
            label="Owner address (સરનામું)"
            required
            error={visibleError('owner.address')}
          >
            <GujaratiFontInput
              font="nilkanth"
              multiline
              rows={3}
              value={owner.address}
              onChange={(next) => setOwner('address', next)}
              onBlur={() => markTouched('owner.address')}
              maxLength={PROPERTY_TAX_LIMITS.address}
              status={visibleError('owner.address') ? 'error' : undefined}
            />
          </Field>
        </>
      ),
    },
    {
      key: 'transferee',
      icon: User,
      title: 'Transferee (નામ ફેરફાર કરાવનાર)',
      issueKeys: PROPERTY_TAX_SECTION_KEYS.transferee,
      children: (
        <>
          <Field
            label="Transferee full name (પૂરેપૂરું નામ)"
            required
            error={visibleError('transferee.name')}
          >
            <GujaratiFontInput
              font="nilkanth"
              value={transferee.name}
              onChange={(next) => setTransferee('name', next)}
              onBlur={() => markTouched('transferee.name')}
              maxLength={PROPERTY_TAX_LIMITS.text}
              status={visibleError('transferee.name') ? 'error' : undefined}
            />
          </Field>
          <Field
            label="Transferee address (સરનામું)"
            required
            error={visibleError('transferee.address')}
          >
            <GujaratiFontInput
              font="nilkanth"
              multiline
              rows={3}
              value={transferee.address}
              onChange={(next) => setTransferee('address', next)}
              onBlur={() => markTouched('transferee.address')}
              maxLength={PROPERTY_TAX_LIMITS.address}
              status={visibleError('transferee.address') ? 'error' : undefined}
            />
          </Field>
          <Field
            label="Applicant name on the declaration line"
            optional
            hint="Defaults to the transferee name. Printed on the ‘કું ______’ line."
          >
            <GujaratiFontInput
              font="nilkanth"
              value={data.applicantName}
              onChange={(next) => onChange({ ...data, applicantName: next })}
              maxLength={PROPERTY_TAX_LIMITS.text}
            />
          </Field>
        </>
      ),
    },
    {
      key: 'property',
      icon: MapPin,
      title: 'Property details (મિલકતની વિગતો)',
      issueKeys: PROPERTY_TAX_SECTION_KEYS.property,
      children: (
        <>
          <Field
            label="Division / locality (વિભાગનો લત્તો અથવા પોલ્ટનું નામ)"
            required
            error={visibleError('division')}
          >
            <GujaratiFontInput
              font="nilkanth"
              value={data.division}
              onChange={(next) => onChange({ ...data, division: next })}
              onBlur={() => markTouched('division')}
              maxLength={PROPERTY_TAX_LIMITS.text}
              status={visibleError('division') ? 'error' : undefined}
            />
          </Field>
          <div className="fbs-grid-2">
            <Field label="Ward No. (વોર્ડ નં.)" required error={visibleError('numbers.wardNo')}>
              <GujaratiFontInput
                font="nilkanth"
                value={numbers.wardNo}
                onChange={(next) => setNumber('wardNo', next)}
                onBlur={() => markTouched('numbers.wardNo')}
                maxLength={PROPERTY_TAX_LIMITS.number}
                status={visibleError('numbers.wardNo') ? 'error' : undefined}
              />
            </Field>
            <Field label="Survey No. (નોધ નં.)" required error={visibleError('numbers.surveyNo')}>
              <GujaratiFontInput
                font="nilkanth"
                value={numbers.surveyNo}
                onChange={(next) => setNumber('surveyNo', next)}
                onBlur={() => markTouched('numbers.surveyNo')}
                maxLength={PROPERTY_TAX_LIMITS.number}
                status={visibleError('numbers.surveyNo') ? 'error' : undefined}
              />
            </Field>
            <Field label="R.S. No. (રે. સ. નં.)" required error={visibleError('numbers.rsNo')}>
              <GujaratiFontInput
                font="nilkanth"
                value={numbers.rsNo}
                onChange={(next) => setNumber('rsNo', next)}
                onBlur={() => markTouched('numbers.rsNo')}
                maxLength={PROPERTY_TAX_LIMITS.number}
                status={visibleError('numbers.rsNo') ? 'error' : undefined}
              />
            </Field>
            <Field label="Area (ક્ષેત્રફળ)" required error={visibleError('area')}>
              <GujaratiFontInput
                font="nilkanth"
                value={data.area}
                onChange={(next) => onChange({ ...data, area: next })}
                onBlur={() => markTouched('area')}
                maxLength={PROPERTY_TAX_LIMITS.area}
                status={visibleError('area') ? 'error' : undefined}
              />
            </Field>
          </div>
        </>
      ),
    },
    {
      key: 'boundaries',
      icon: Ruler,
      title: 'Boundaries (ચતુરસી)',
      issueKeys: PROPERTY_TAX_SECTION_KEYS.boundaries,
      children: (
        <div className="fbs-grid-2">
          <Field label="East (પૂર્વ)" required error={visibleError('boundaries.east')}>
            <GujaratiFontInput
              font="nilkanth"
              value={boundaries.east}
              onChange={(next) => setBoundary('east', next)}
              onBlur={() => markTouched('boundaries.east')}
              maxLength={PROPERTY_TAX_LIMITS.text}
              status={visibleError('boundaries.east') ? 'error' : undefined}
            />
          </Field>
          <Field label="West (પશ્ચિમ)" required error={visibleError('boundaries.west')}>
            <GujaratiFontInput
              font="nilkanth"
              value={boundaries.west}
              onChange={(next) => setBoundary('west', next)}
              onBlur={() => markTouched('boundaries.west')}
              maxLength={PROPERTY_TAX_LIMITS.text}
              status={visibleError('boundaries.west') ? 'error' : undefined}
            />
          </Field>
          <Field label="North (ઉત્તર)" required error={visibleError('boundaries.north')}>
            <GujaratiFontInput
              font="nilkanth"
              value={boundaries.north}
              onChange={(next) => setBoundary('north', next)}
              onBlur={() => markTouched('boundaries.north')}
              maxLength={PROPERTY_TAX_LIMITS.text}
              status={visibleError('boundaries.north') ? 'error' : undefined}
            />
          </Field>
          <Field label="South (દક્ષિણ)" required error={visibleError('boundaries.south')}>
            <GujaratiFontInput
              font="nilkanth"
              value={boundaries.south}
              onChange={(next) => setBoundary('south', next)}
              onBlur={() => markTouched('boundaries.south')}
              maxLength={PROPERTY_TAX_LIMITS.text}
              status={visibleError('boundaries.south') ? 'error' : undefined}
            />
          </Field>
        </div>
      ),
    },
    {
      key: 'documents',
      icon: FileText,
      title: 'Documents (પુરાવા)',
      issueKeys: PROPERTY_TAX_SECTION_KEYS.documents,
      children: (
        <>
          <Field
            label="Documents submitted (દસ્તાવેજોની યાદી)"
            optional
            hint="Printed in row 7. One document per line works best."
          >
            <GujaratiFontInput
              font="nilkanth"
              multiline
              rows={3}
              value={data.documents}
              onChange={(next) => onChange({ ...data, documents: next })}
              maxLength={PROPERTY_TAX_LIMITS.documents}
            />
          </Field>
          <div className="fbs-hint">
            Page 2 of this form is reserved for corporation office use and prints blank.
          </div>
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
