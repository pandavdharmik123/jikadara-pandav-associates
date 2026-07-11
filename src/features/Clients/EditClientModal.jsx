import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { useUpdateClient } from '../../hooks/useClients';

export default function EditClientModal({ visible, client, onClose }) {
  const [form] = Form.useForm();
  const updateClientMutation = useUpdateClient();

  useEffect(() => {
    if (visible && client) {
      form.setFieldsValue({
        name: client.name,
        mobileNumber: client.mobileNumber,
        referenceName: client.referenceName,
      });
    }
  }, [visible, client, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await updateClientMutation.mutateAsync({ id: client.id, ...values });
      message.success('Client updated successfully');
      onClose();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        console.error('Error updating client:', error);
        message.error('Failed to update client');
      }
    }
  };

  return (
    <Modal
      title="Edit Client"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={updateClientMutation.isPending}
      okText="Save"
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        name="editClientForm"
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
        >
          <Input placeholder="Enter Reference Name" size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
