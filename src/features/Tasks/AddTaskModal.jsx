import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, message, Spin } from 'antd';
import { useCreateTask } from '../../hooks/useTasks';
import { useClients } from '../../hooks/useClients';
import dayjs from 'dayjs';

const { Option } = Select;

// Pre-defined document types
const DOCUMENT_TYPES = [
  'Sale Deed',
  'Agreement to Sale',
  'Rent Agreement',
  'Partnership Deed',
  'Will',
  'Power of Attorney',
  'Other'
];

export default function AddTaskModal({ visible, onClose, initialClientId }) {
  const [form] = Form.useForm();
  const createTaskMutation = useCreateTask();
  const { data: clients, isLoading: clientsLoading } = useClients();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        startDate: dayjs(),
        clientId: initialClientId || undefined
      });
    }
  }, [visible, form, initialClientId]);

  // When client changes, auto-fill reference name if empty
  const handleClientChange = (clientId) => {
    const selectedClient = clients?.find(c => c.id === clientId);
    const currentRef = form.getFieldValue('referenceName');
    
    if (selectedClient && !currentRef) {
      form.setFieldsValue({ referenceName: selectedClient.referenceName });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const taskData = {
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
      };

      await createTaskMutation.mutateAsync(taskData);
      message.success('Task added successfully');
      onClose();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        console.error('Error adding task:', error);
        message.error('Failed to add task');
      }
    }
  };

  return (
    <Modal
      title="Add New Task"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createTaskMutation.isPending}
      okText="Save"
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        name="addTaskForm"
      >
        <Form.Item
          name="clientId"
          label="Select Client"
          rules={[{ required: true, message: 'Client selection is required' }]}
        >
          <Select 
            placeholder="Select Client" 
            size="large" 
            showSearch
            optionFilterProp="children"
            loading={clientsLoading}
            onChange={handleClientChange}
            notFoundContent={clientsLoading ? <Spin size="small" /> : null}
            disabled={!!initialClientId}
          >
            {clients?.map(client => (
              <Option key={client.id} value={client.id}>
                {client.name} {client.mobileNumber ? `(${client.mobileNumber})` : ''}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="documentType"
          label="Document Type"
          rules={[{ required: true, message: 'Document type is required' }]}
        >
          <Select 
            placeholder="Select or type type" 
            size="large"
            showSearch
            allowClear
          >
            {DOCUMENT_TYPES.map(type => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="startDate"
          label="Start Date"
          rules={[{ required: true, message: 'Date is required' }]}
        >
          <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="referenceName"
          label="Reference Name"
          tooltip="Enter here if there is a different reference"
        >
          <Input placeholder="Enter Reference Name" size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
