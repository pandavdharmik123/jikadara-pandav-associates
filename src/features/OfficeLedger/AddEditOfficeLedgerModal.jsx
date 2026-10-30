import { useEffect } from 'react';
import {
  Col,
  DatePicker,
  Form,
  InputNumber,
  Modal,
  Row,
  Select,
  message,
} from 'antd';
import dayjs from 'dayjs';
import TransliterateInput from '../../components/TransliterateInput';
import {
  useCreateOfficeLedgerEntry,
  useUpdateOfficeLedgerEntry,
} from '../../hooks/useOfficeLedger';
import { getISTToday, toISTDateString } from '../../utils/istDate';

const EXPENSE_TYPE_OPTIONS = [
  { label: 'પ્રિન્ટર રિફિલિંગ', value: 'પ્રિન્ટર રિફિલિંગ' },
  { label: 'લાઈટ બિલ', value: 'લાઈટ બિલ' },
  { label: 'બિલ્ડીંગ મેન્ટેનન્સ', value: 'બિલ્ડીંગ મેન્ટેનન્સ' },
  { label: 'ઓફિસ ભાડું', value: 'ઓફિસ ભાડું' },
  { label: 'કામવાળા માસી', value: 'કામવાળા માસી' },
  { label: 'સ્ટેશનરી', value: 'સ્ટેશનરી' },
  { label: 'અન્ય', value: 'અન્ય' },
];

function getDefaultEntryDate(fyRange, selectedMonth) {
  const today = getISTToday();
  const monthBase = selectedMonth ? dayjs(selectedMonth) : today;
  // Keep the current day-of-month when possible, but always land inside the
  // month currently selected in the ledger filter.
  const day = selectedMonth
    ? Math.min(today.date(), monthBase.daysInMonth())
    : today.date();
  const candidate = monthBase.date(day);

  if (!fyRange) return candidate;

  const start = dayjs(fyRange.startDate);
  const end = dayjs(fyRange.endDate);

  if (candidate.isBefore(start, 'day')) return start;
  if (candidate.isAfter(end, 'day')) return end;
  return candidate;
}

export default function AddEditOfficeLedgerModal({
  open,
  record,
  entryType,
  onClose,
  fyRange,
  selectedMonth,
}) {
  const [form] = Form.useForm();
  const createMutation = useCreateOfficeLedgerEntry();
  const updateMutation = useUpdateOfficeLedgerEntry();
  const isEditing = Boolean(record);
  const resolvedEntryType = record?.entryType || entryType || 'EXPENSE';
  const isIncome = resolvedEntryType === 'INCOME';
  const accent = isIncome ? '#059669' : '#dc2626';
  const accentSoft = isIncome ? '#ecfdf5' : '#fef2f2';

  // Keep any custom expense type already saved on an older record selectable
  // while editing, so saving does not silently lose it.
  const existingExpenseType = !isIncome ? record?.expenseType || '' : '';
  const expenseTypeOptions =
    existingExpenseType &&
    !EXPENSE_TYPE_OPTIONS.some((option) => option.value === existingExpenseType)
      ? [
          ...EXPENSE_TYPE_OPTIONS,
          { label: existingExpenseType, value: existingExpenseType },
        ]
      : EXPENSE_TYPE_OPTIONS;

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    if (record) {
      const recordExpenseType =
        record.entryType === 'EXPENSE' ? record.expenseType || '' : '';

      form.setFieldsValue({
        entryDate: dayjs(toISTDateString(record.entryDate)),
        details: record.details || '',
        amount: Number(record.amount) || undefined,
        expenseType: recordExpenseType || undefined,
      });
    } else {
      form.setFieldsValue({
        entryDate: getDefaultEntryDate(fyRange, selectedMonth),
      });
    }
  }, [open, record, fyRange, selectedMonth, form]);

  const disabledDate = (current) => {
    if (!current || !fyRange) return false;
    return (
      current.isBefore(dayjs(fyRange.startDate), 'day') ||
      current.isAfter(dayjs(fyRange.endDate), 'day')
    );
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const expenseType = isIncome ? null : values.expenseType?.trim();
      const payload = {
        fyStartDate: fyRange.startDate,
        fyEndDate: fyRange.endDate,
        entryType: resolvedEntryType,
        entryDate: values.entryDate.format('YYYY-MM-DD'),
        expenseType,
        details: values.details.trim(),
        amount: Number(values.amount),
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: record.id, ...payload });
        message.success(`${isIncome ? 'Income' : 'Expense'} updated successfully`);
      } else {
        await createMutation.mutateAsync(payload);
        message.success(`${isIncome ? 'Income' : 'Expense'} added successfully`);
      }

      onClose();
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        error.response?.data?.error || `Failed to save ${isIncome ? 'income' : 'expense'}`
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    // Note: the modal body intentionally has no `overflow` style — a scroll
    // container there clips the transliteration suggestion dropdown. The
    // modal wrapper already scrolls when the form is taller than the viewport.
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: accentSoft,
              color: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            {isIncome ? '+' : '−'}
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            {isEditing ? 'Edit' : 'Add'} {isIncome ? 'Income' : 'Expense'}
          </span>
        </div>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isPending}
      okText={isEditing ? 'Save Changes' : `Save ${isIncome ? 'Income' : 'Expense'}`}
      cancelText="Cancel"
      okButtonProps={{ style: { background: accent, borderColor: accent } }}
      width={520}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" name="officeLedgerForm" style={{ marginTop: 14 }}>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="entryDate"
              label={<span style={{ fontWeight: 600 }}>Date</span>}
              rules={[{ required: true, message: 'Please select the date' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                size="middle"
                format="DD/MM/YYYY"
                allowClear={false}
                disabledDate={disabledDate}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="amount"
              label={<span style={{ fontWeight: 600 }}>Amount</span>}
              rules={[
                { required: true, message: 'Please enter the amount' },
                {
                  validator(_, value) {
                    if (value === undefined || value === null || Number(value) <= 0) {
                      return Promise.reject(new Error('Amount must be greater than 0'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                size="middle"
                min={0.01}
                precision={2}
                prefix="₹"
                placeholder="0.00"
              />
            </Form.Item>
          </Col>
        </Row>

        {!isIncome && (
          <Form.Item
            name="expenseType"
            label={<span style={{ fontWeight: 600 }}>Expense Type</span>}
            rules={[{ required: true, message: 'Please select the expense type' }]}
          >
            <Select
              size="middle"
              placeholder="Select expense type"
              options={expenseTypeOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        )}

        <Form.Item
          name="details"
          label={<span style={{ fontWeight: 600 }}>{isIncome ? 'Income Details' : 'Expense Details'}</span>}
          extra="Type in English; choose a Gujarati suggestion as you type."
          rules={[
            { required: true, whitespace: true, message: 'Please enter the details' },
            { max: 500, message: 'Details cannot be longer than 500 characters' },
          ]}
        >
          <TransliterateInput
            placeholder={isIncome ? 'દા.ત. ક્લાયન્ટ પેમેન્ટ' : 'દા.ત. ઓફિસ ભાડું'}
            style={{ height: 36, fontSize: 13 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
