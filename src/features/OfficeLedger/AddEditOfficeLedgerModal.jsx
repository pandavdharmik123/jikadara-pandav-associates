import { useEffect } from 'react';
import { Col, DatePicker, Form, InputNumber, Modal, Row, message } from 'antd';
import dayjs from 'dayjs';
import TransliterateInput from '../../components/TransliterateInput';
import {
  useCreateOfficeLedgerEntry,
  useUpdateOfficeLedgerEntry,
} from '../../hooks/useOfficeLedger';
import { toISTDateString } from '../../utils/istDate';

function getDefaultEntryDate(fyRange) {
  if (!fyRange) return dayjs();

  const today = dayjs();
  const start = dayjs(fyRange.startDate);
  const end = dayjs(fyRange.endDate);

  if (today.isBefore(start, 'day')) return start;
  if (today.isAfter(end, 'day')) return end;
  return today;
}

export default function AddEditOfficeLedgerModal({
  open,
  record,
  entryType,
  onClose,
  fyRange,
}) {
  const [form] = Form.useForm();
  const createMutation = useCreateOfficeLedgerEntry();
  const updateMutation = useUpdateOfficeLedgerEntry();
  const isEditing = Boolean(record);
  const resolvedEntryType = record?.entryType || entryType || 'EXPENSE';
  const isIncome = resolvedEntryType === 'INCOME';
  const accent = isIncome ? '#059669' : '#dc2626';
  const accentSoft = isIncome ? '#ecfdf5' : '#fef2f2';

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    if (record) {
      form.setFieldsValue({
        entryDate: dayjs(toISTDateString(record.entryDate)),
        details: record.details || '',
        amount: Number(record.amount) || undefined,
      });
    } else {
      form.setFieldsValue({
        entryDate: getDefaultEntryDate(fyRange),
      });
    }
  }, [open, record, fyRange, form]);

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
      const payload = {
        fyStartDate: fyRange.startDate,
        fyEndDate: fyRange.endDate,
        entryType: resolvedEntryType,
        entryDate: values.entryDate.format('YYYY-MM-DD'),
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
