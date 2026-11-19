import { useMemo, useState } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Button,
  Space,
  Typography,
  Alert,
  message,
  Popconfirm,
} from 'antd';
import { Plus, Trash2, Save } from 'lucide-react';
import dayjs from 'dayjs';
import { MONTH_NAMES, useCreateNotaryRegister, useUpdateNotaryRegister } from '../../hooks/useNotaryHisab';

const { Text, Title } = Typography;

const YEARS = Array.from({ length: 16 }, (_, i) => dayjs().year() + i - 8);

function overlaps(a, b) {
  return a.startNumber <= b.endNumber && b.startNumber <= a.endNumber;
}

/**
 * Create / edit a monthly Notary register. Supports multiple serial ranges
 * per register with overlap + duplicate serial-number validation.
 *
 * Form state lives in a keyed inner component so every open/edit starts from
 * a clean mount (no setState-in-effect cascades).
 */
export default function NotaryRegisterModal({
  open,
  onClose,
  onCreated,
  editRegister = null, // register object when editing
}) {
  const isEdit = Boolean(editRegister);
  const title = isEdit
    ? `Edit Register – ${MONTH_NAMES[editRegister.month - 1]} ${editRegister.year}`
    : 'Create Monthly Notary Register';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={620}
      destroyOnHidden
      title={<div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{title}</div>}
    >
      {open && (
        <NotaryRegisterForm
          key={isEdit ? editRegister.id : 'new'}
          isEdit={isEdit}
          editRegister={editRegister}
          onClose={onClose}
          onCreated={onCreated}
        />
      )}
    </Modal>
  );
}

function NotaryRegisterForm({ isEdit, editRegister, onClose, onCreated }) {
  const [form] = Form.useForm();
  const createMutation = useCreateNotaryRegister();
  const updateMutation = useUpdateNotaryRegister();

  const initialRows = isEdit && editRegister.ranges?.length
    ? editRegister.ranges.map((r) => ({ startNumber: r.startNumber, endNumber: r.endNumber }))
    : [{ startNumber: null, endNumber: null }];
  const [rows, setRows] = useState(initialRows);

  const initialValues = useMemo(
    () =>
      isEdit
        ? {
            month: editRegister.month,
            year: editRegister.year,
            ratePerEntry: Number(editRegister.ratePerEntry),
          }
        : {
            month: dayjs().month() + 1,
            year: dayjs().year(),
            ratePerEntry: 150,
          },
    [isEdit, editRegister]
  );

  const monthOptions = MONTH_NAMES.map((label, idx) => ({ label, value: idx + 1 }));
  const yearOptions = YEARS.map((y) => ({ label: String(y), value: y }));

  const addRow = () => setRows((prev) => [...prev, { startNumber: null, endNumber: null }]);
  const removeRow = (idx) => setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  // Local duplicate/overlap detection for instant feedback.
  const localError = useMemo(() => {
    const valid = rows.filter(
      (r) => Number.isInteger(Number(r.startNumber)) && Number.isInteger(Number(r.endNumber))
    );
    for (const r of valid) {
      if (Number(r.endNumber) < Number(r.startNumber)) {
        return `Ending serial (${r.endNumber}) must be greater than or equal to the starting serial (${r.startNumber})`;
      }
    }
    for (let i = 0; i < valid.length; i += 1) {
      for (let j = i + 1; j < valid.length; j += 1) {
        if (overlaps(valid[i], valid[j])) {
          return `Serial ranges ${valid[i].startNumber}–${valid[i].endNumber} and ${valid[j].startNumber}–${valid[j].endNumber} overlap. Please fix them.`;
        }
      }
    }
    return null;
  }, [rows]);

  const totalSerials = useMemo(
    () =>
      rows
        .filter((r) => Number.isInteger(Number(r.startNumber)) && Number.isInteger(Number(r.endNumber)))
        .reduce((sum, r) => sum + Math.max(0, Number(r.endNumber) - Number(r.startNumber) + 1), 0),
    [rows]
  );

  const handleSubmit = async () => {
    if (localError) {
      message.error(localError);
      return;
    }
    const filled = rows.filter(
      (r) => Number.isInteger(Number(r.startNumber)) && Number.isInteger(Number(r.endNumber))
    );
    if (filled.length === 0) {
      message.error('Please enter at least one serial range');
      return;
    }

    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    const payload = {
      month: values.month,
      year: values.year,
      ratePerEntry: values.ratePerEntry,
      ranges: filled.map((r) => ({ startNumber: Number(r.startNumber), endNumber: Number(r.endNumber) })),
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: editRegister.id, ...payload });
        message.success('Register updated successfully');
      } else {
        const register = await createMutation.mutateAsync(payload);
        message.success(
          `Register created — ${register?.totalSerials ?? 'all'} serial numbers generated`
        );
        if (onCreated) onCreated(register);
      }
      onClose();
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to save register');
    }
  };

  return (
    <>
      {isEdit && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Editing month/year moves the register. Removed ranges also delete assignments made on those serial numbers — you will be asked to confirm if that happens."
        />
      )}

      <Form form={form} layout="vertical" initialValues={initialValues}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Form.Item
            label="Month"
            name="month"
            rules={[{ required: true, message: 'Select month' }]}
          >
            <Select options={monthOptions} placeholder="Month" />
          </Form.Item>
          <Form.Item
            label="Year"
            name="year"
            rules={[{ required: true, message: 'Select year' }]}
          >
            <Select options={yearOptions} placeholder="Year" />
          </Form.Item>
          <Form.Item
            label="Per Entry Amount (₹)"
            name="ratePerEntry"
            rules={[{ required: true, message: 'Enter per-entry amount' }]}
            extra="Default ₹150. Totals recalculate when changed."
          >
            <InputNumber
              min={0}
              max={10000000}
              precision={2}
              style={{ width: '100%' }}
              placeholder="150"
            />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Title level={5} style={{ margin: 0 }}>
            Serial Number Ranges
          </Title>
          <Button size="small" icon={<Plus size={14} />} onClick={addRow} style={{ borderRadius: 8 }}>
            Add Range
          </Button>
        </div>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Example: May 2026 can hold both 255–266 and 277–400.
        </Text>

        {localError && (
          <Alert type="error" showIcon style={{ marginBottom: 8 }} message={localError} />
        )}

        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {rows.map((row, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
            >
              <span style={{ fontSize: 12, color: '#94a3b8', width: 24 }}>#{idx + 1}</span>
              <InputNumber
                min={1}
                precision={0}
                value={row.startNumber}
                placeholder="Starting sir. no."
                onChange={(v) =>
                  setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, startNumber: v } : r)))
                }
                style={{ flex: 1 }}
              />
              <span style={{ color: '#94a3b8' }}>–</span>
              <InputNumber
                min={1}
                precision={0}
                value={row.endNumber}
                placeholder="Ending sir. no."
                onChange={(v) =>
                  setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, endNumber: v } : r)))
                }
                style={{ flex: 1 }}
              />
              <Popconfirm
                title="Remove range?"
                okText="Remove"
                cancelText="Cancel"
                disabled={rows.length === 1}
                onConfirm={() => removeRow(idx)}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  disabled={rows.length === 1}
                  icon={<Trash2 size={15} />}
                />
              </Popconfirm>
            </div>
          ))}
        </Space>

        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Will generate <Text strong>{totalSerials}</Text> serial number{totalSerials === 1 ? '' : 's'} from
            the entered range{totalSerials === 1 ? '' : 's'}.
          </Text>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<Save size={15} />}
            loading={createMutation.isPending || updateMutation.isPending}
            onClick={handleSubmit}
            style={{ borderRadius: 8, boxShadow: 'none' }}
          >
            {isEdit ? 'Save Changes' : 'Create Register'}
          </Button>
        </div>
      </Form>
    </>
  );
}
