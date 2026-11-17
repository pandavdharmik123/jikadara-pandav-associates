import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
} from 'antd';
import { ArrowDownLeft, ArrowUpRight, Save, Trash2 } from 'lucide-react';
import { MAX_AMOUNT } from '../lib/config';
import { EXPENSE_TYPE_OPTIONS, ENTRY_TYPE } from '../lib/ledger';
import { getISTToday, toISTDateString, formatDisplayDate, dayjs } from '../lib/date';

const { TextArea } = Input;

export default function TransactionForm({
  mode = 'create',
  entryType = ENTRY_TYPE.INCOME,
  initialEntry = null,
  fyRange,
  onSubmit,
  onDelete,
  submitting = false,
  deleting = false,
  error = '',
  onTypeChange,
}) {
  const [form] = Form.useForm();
  const [currentType, setCurrentType] = useState(initialEntry?.entryType || entryType);
  const initializedRef = useRef(false);
  const isEditing = mode === 'edit';
  const isIncome = currentType === ENTRY_TYPE.INCOME;

  useEffect(() => {
    if (!form) return;

    if (initialEntry) {
      setCurrentType(initialEntry.entryType);
      form.setFieldsValue({
        amount: Number(initialEntry.amount) || undefined,
        entryDate: dayjs(toISTDateString(initialEntry.entryDate)),
        details: initialEntry.details || '',
        expenseType: initialEntry.expenseType || 'અન્ય',
      });
      return;
    }

    // Initialise the create form only once. Switching Income/Expense must not
    // wipe an amount or particulars the user has already typed.
    if (!initializedRef.current) {
      initializedRef.current = true;
      setCurrentType(entryType);
      form.setFieldsValue({
        entryDate: getISTToday(),
        expenseType: 'અન્ય',
      });
    }
  }, [form, initialEntry, entryType]);

  const handleTypeChange = (nextType) => {
    setCurrentType(nextType);
    if (onTypeChange) onTypeChange(nextType);
    if (nextType === ENTRY_TYPE.EXPENSE) {
      form.setFieldsValue({ expenseType: form.getFieldValue('expenseType') || 'અન્ય' });
    }
  };

  const handleFinish = (values) => {
    onSubmit({
      entryType: currentType,
      entryDate: values.entryDate.format('YYYY-MM-DD'),
      details: String(values.details || '').trim(),
      amount: Number(values.amount),
      expenseType: currentType === ENTRY_TYPE.EXPENSE ? values.expenseType : null,
    });
  };

  const disabledDate = (current) => {
    if (!current || !fyRange) return false;
    const date = current.format('YYYY-MM-DD');
    return date < fyRange.startDate || date > fyRange.endDate;
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
      <div className="type-toggle" role="group" aria-label="Transaction type">
        <button
          type="button"
          className={`${isIncome ? 'active income' : ''}`}
          onClick={() => handleTypeChange(ENTRY_TYPE.INCOME)}
        >
          <ArrowDownLeft size={17} />
          Income
        </button>
        <button
          type="button"
          className={`${!isIncome ? 'active expense' : ''}`}
          onClick={() => handleTypeChange(ENTRY_TYPE.EXPENSE)}
        >
          <ArrowUpRight size={17} />
          Expense
        </button>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16, borderRadius: 12 }}
        />
      ) : null}

      <Form.Item
        name="amount"
        label="Amount"
        rules={[
          { required: true, message: 'Enter an amount' },
          {
            validator: (_, value) => {
              if (value === undefined || value === null || value === '') return Promise.resolve();
              const amount = Number(value);
              if (!Number.isFinite(amount) || amount <= 0) {
                return Promise.reject(new Error('Amount must be greater than zero'));
              }
              if (amount > MAX_AMOUNT) {
                return Promise.reject(new Error('Amount is too large'));
              }
              if (Math.round(amount * 100) <= 0) {
                return Promise.reject(new Error('Amount must be at least ₹0.01'));
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <InputNumber
          className="amount-field"
          prefix="₹"
          placeholder="0"
          min={0}
          max={MAX_AMOUNT}
          precision={2}
          controls={false}
          inputMode="decimal"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="entryDate"
        label="Date"
        rules={[{ required: true, message: 'Choose the transaction date' }]}
      >
        <DatePicker
          format="DD/MM/YYYY"
          allowClear={false}
          disabledDate={disabledDate}
          style={{ width: '100%' }}
          size="large"
          inputReadOnly
        />
      </Form.Item>

      <Form.Item
        name="details"
        label={isIncome ? 'Income particulars' : 'Expense particulars'}
        rules={[
          { required: true, message: 'Enter the particulars' },
          { max: 500, message: 'Particulars cannot exceed 500 characters' },
          {
            validator: (_, value) =>
              String(value || '').trim()
                ? Promise.resolve()
                : Promise.reject(new Error('Enter the particulars')),
          },
        ]}
      >
        <TextArea
          rows={3}
          maxLength={500}
          showCount
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder={
            isIncome
              ? 'e.g. Consultation fee — Mehta family'
              : 'e.g. Office electricity bill — October'
          }
        />
      </Form.Item>

      {!isIncome ? (
        <Form.Item
          name="expenseType"
          label="Expense category"
          rules={[{ required: true, message: 'Select an expense category' }]}
        >
          <Select
            size="large"
            options={EXPENSE_TYPE_OPTIONS.map((option) => ({ value: option, label: option }))}
            placeholder="Select a category"
          />
        </Form.Item>
      ) : null}

      <p style={{ margin: '0 0 14px', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
        This entry is saved directly to the shared office ledger used by the main website
        {fyRange ? ` (${formatDisplayDate(fyRange.startDate)} – ${formatDisplayDate(fyRange.endDate)})` : ''}.
      </p>

      <Button
        type="primary"
        htmlType="submit"
        size="large"
        loading={submitting}
        disabled={submitting || deleting}
        icon={<Save size={17} />}
        style={{
          width: '100%',
          height: 48,
          borderRadius: 14,
          background: isIncome ? '#059669' : '#dc2626',
          borderColor: isIncome ? '#059669' : '#dc2626',
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        {submitting ? 'Saving…' : isEditing ? 'Save changes' : `Add ${isIncome ? 'income' : 'expense'}`}
      </Button>

      {isEditing && onDelete ? (
        <Button
          danger
          type="text"
          block
          loading={deleting}
          disabled={submitting || deleting}
          icon={<Trash2 size={16} />}
          onClick={() => onDelete(initialEntry)}
          style={{ marginTop: 10, fontWeight: 700 }}
        >
          Delete this transaction
        </Button>
      ) : null}
    </Form>
  );
}
