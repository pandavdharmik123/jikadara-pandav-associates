import { useState } from 'react';
import { DatePicker, Modal, message } from 'antd';
import { formatDisplayDate, getPresetRange, dayjs } from '../lib/date';

const { RangePicker } = DatePicker;

export const DATE_PRESETS = [
  { key: 'THIS_FY', label: 'This FY' },
  { key: 'TODAY', label: 'Today' },
  { key: 'YESTERDAY', label: 'Yesterday' },
  { key: 'THIS_WEEK', label: 'This Week' },
  { key: 'THIS_MONTH', label: 'This Month' },
  { key: 'PREV_MONTH', label: 'Previous Month' },
  { key: 'CUSTOM', label: 'Custom' },
];

export default function DateFilterChips({ value, onChange, customRange, fyRange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  const activeRange = getPresetRange(value, fyRange, customRange);

  const handleChip = (key) => {
    if (key === 'CUSTOM') {
      const initial = customRange || (fyRange ? { startDate: fyRange.startDate, endDate: fyRange.endDate } : null);
      setDraft(
        initial
          ? [dayjs(initial.startDate), dayjs(initial.endDate)]
          : null
      );
      setOpen(true);
      return;
    }

    onChange(key, null);
  };

  const handleApply = () => {
    if (!draft || !draft[0] || !draft[1]) {
      message.warning('Select both a start and end date.');
      return;
    }

    const startDate = draft[0].format('YYYY-MM-DD');
    const endDate = draft[1].format('YYYY-MM-DD');

    if (startDate > endDate) {
      message.warning('The start date cannot be after the end date.');
      return;
    }

    if (fyRange && (startDate < fyRange.startDate || endDate > fyRange.endDate)) {
      message.warning('Choose dates inside the selected financial year.');
      return;
    }

    onChange('CUSTOM', { startDate, endDate });
    setOpen(false);
  };

  const disabledDate = (current) => {
    if (!current || !fyRange) return false;
    const date = current.format('YYYY-MM-DD');
    return date < fyRange.startDate || date > fyRange.endDate;
  };

  return (
    <>
      <div className="chip-row" role="group" aria-label="Date range filter">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={`chip${value === preset.key ? ' active' : ''}`}
            onClick={() => handleChip(preset.key)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <p style={{ margin: '6px 2px 0', fontSize: 10.5, fontWeight: 600, color: '#94a3b8' }}>
        {activeRange
          ? `${formatDisplayDate(activeRange.startDate)} – ${formatDisplayDate(activeRange.endDate)}`
          : 'This range is outside the selected financial year.'}
      </p>

      <Modal
        title="Custom date range"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleApply}
        okText="Apply range"
        destroyOnHidden
      >
        <p style={{ marginTop: 0, fontSize: 12, color: '#64748b' }}>
          Dates must stay inside the selected financial year
          {fyRange ? ` (${formatDisplayDate(fyRange.startDate)} – ${formatDisplayDate(fyRange.endDate)})` : ''}.
        </p>
        <RangePicker
          value={draft}
          onChange={setDraft}
          format="DD/MM/YYYY"
          disabledDate={disabledDate}
          allowClear={false}
          style={{ width: '100%' }}
          size="large"
        />
      </Modal>
    </>
  );
}
