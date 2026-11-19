import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, message, Row, Col } from 'antd';
import { useCreateUpad, useUpdateUpad } from '../../hooks/useUpad';
import dayjs from 'dayjs';

export default function AddEditUpadModal({ visible, record, onClose }) {
  const [form] = Form.useForm();
  const isEditing = Boolean(record);

  const createMutation = useCreateUpad();
  const updateMutation = useUpdateUpad();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (record) {
        form.setFieldsValue({
          date: record.date ? dayjs(record.date) : dayjs(),
          userName: record.userName || '',
          description: record.description || '',
          amount: record.amount,
        });
      } else {
        form.setFieldsValue({
          date: dayjs(),
        });
      }
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        date: values.date.format('YYYY-MM-DD'),
        userName: values.userName.trim(),
        description: values.description.trim(),
        amount: Number(values.amount),
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: record.id, ...payload });
        message.success('Upad entry updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        message.success('Upad entry added successfully');
      }

      onClose();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        console.error('Upad submit error:', error);
        message.error(error.response?.data?.error || error.message || 'Failed to save Upad');
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
          {isEditing ? 'Edit Upad' : 'Add Upad'}
        </span>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isPending}
      okText={isEditing ? 'Save Changes' : 'Save'}
      cancelText="Cancel"
      width={560}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        name="upadForm"
        style={{ marginTop: 20 }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="date"
              label={<span style={{ fontWeight: 600 }}>Date</span>}
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                size="large"
                format="DD/MM/YYYY"
                allowClear={false}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="userName"
              label={<span style={{ fontWeight: 600 }}>User</span>}
              rules={[{ required: true, message: 'Please enter user name' }]}
            >
              <Input
                placeholder="Enter user name (e.g. Dharmik, Rahul, Amit)"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="amount"
          label={<span style={{ fontWeight: 600 }}>Amount</span>}
          rules={[
            { required: true, message: 'Please enter amount' },
            {
              validator(_, value) {
                if (value && (isNaN(value) || Number(value) <= 0)) {
                  return Promise.reject(new Error('Amount must be greater than 0'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            type="number"
            prefix={<span style={{ fontWeight: 700, color: '#4f46e5' }}>₹</span>}
            placeholder="0.00"
            size="large"
            min="1"
            step="any"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={<span style={{ fontWeight: 600 }}>Description / Reason</span>}
          rules={[{ required: true, message: 'Please enter description' }]}
        >
          <Input.TextArea
            placeholder="Enter withdrawal details or reason (e.g. Personal withdrawal, Advance)"
            rows={3}
            size="large"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
