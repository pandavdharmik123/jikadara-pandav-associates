import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { useCreateClient } from '../../hooks/useClients';

export default function AddClientModal({ visible, onClose }) {
  const [form] = Form.useForm();
  const createClientMutation = useCreateClient();

  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await createClientMutation.mutateAsync(values);
      message.success('Client added successfully');
      onClose();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        console.error('Error adding client:', error);
        message.error('Failed to add client');
      }
    }
  };

  return (
    <Modal
      title="Add New Client"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createClientMutation.isPending}
      okText="Save"
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        name="addClientForm"
      >
        <Form.Item
          name="name"
          label="Client Name"
          rules={[{ required: true, message: 'Client name is required' }]}
        >
          <Input placeholder="Enter Name" size="large" />
        </Form.Item>

        <Form.Item
          name="mobileNumber"
          label="Mobile Number"
        >
          <Input placeholder="Enter Mobile Number" size="large" />
        </Form.Item>

        <Form.Item
          name="referenceName"
          label="Reference Name"
          tooltip="Who referred this client?"
        >
          <Input placeholder="Enter Reference Name" size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
