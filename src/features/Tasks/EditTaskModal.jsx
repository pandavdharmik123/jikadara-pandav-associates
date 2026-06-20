import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { useUpdateTask } from '../../hooks/useTasks';
import dayjs from 'dayjs';

const { Option } = Select;

const DOCUMENT_TYPES = [
  'Sale Deed',
  'Agreement to Sale',
  'Rent Agreement',
  'Partnership Deed',
  'Will',
  'Power of Attorney',
  'Other'
];

export default function EditTaskModal({ visible, task, onClose }) {
  const [form] = Form.useForm();
  const updateTaskMutation = useUpdateTask();

  useEffect(() => {
    if (visible && task) {
      form.setFieldsValue({
        documentType: task.documentType,
        referenceName: task.referenceName,
        startDate: task.startDate ? dayjs(task.startDate) : dayjs(),
      });
    }
  }, [visible, task, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const taskData = {
        id: task.id,
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
      };

      await updateTaskMutation.mutateAsync(taskData);
      message.success('Task updated successfully');
      onClose();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        console.error('Error updating task:', error);
        message.error('Failed to update task');
      }
    }
  };

  return (
    <Modal
      title="Edit Task"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={updateTaskMutation.isPending}
      okText="Save"
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        name="editTaskForm"
      >
        <Form.Item label="Client">
          <Input value={task?.client?.name} disabled size="large" />
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
        >
          <Input placeholder="Enter Reference Name" size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
