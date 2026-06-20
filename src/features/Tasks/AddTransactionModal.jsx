import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, InputNumber, message } from 'antd';
import { useCreateTransaction } from '../../hooks/useTasks';
import dayjs from 'dayjs';

const { Option } = Select;

export default function AddTransactionModal({ visible, taskId, onClose }) {
  const [form] = Form.useForm();
  const createTransactionMutation = useCreateTransaction();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        date: dayjs(),
        type: 'INCOME',
      });
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const transactionData = {
        taskId,
        ...values,
        date: values.date ? values.date.toISOString() : undefined,
      };

      await createTransactionMutation.mutateAsync(transactionData);
      message.success('Transaction added successfully');
      onClose();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        console.error('Error adding transaction:', error);
        message.error('Failed to add transaction');
      }
    }
  };

  return (
    <Modal
      title="Add Transaction"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createTransactionMutation.isPending}
      okText="Save"
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        name="addTransactionForm"
      >
        <Form.Item
          name="type"
          label="Type"
          rules={[{ required: true, message: 'Type is required' }]}
        >
          <Select size="large">
            <Option value="INCOME">Income</Option>
            <Option value="EXPENSE">Expense</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount"
          rules={[
            { required: true, message: 'Amount is required' },
            { type: 'number', min: 1, message: 'Amount must be greater than 0' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            size="large"
            formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value?.replace(/\₹\s?|(,*)/g, '')}
            placeholder="0.00"
          />
        </Form.Item>

        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: 'Date is required' }]}
        >
          <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Description is required' }]}
        >
          <Input.TextArea placeholder="Enter details of transaction" rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
