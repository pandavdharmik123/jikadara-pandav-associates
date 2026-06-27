import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, message, Spin, Space } from 'antd';
import { useCreateTask } from '../../hooks/useTasks';
import { useClients } from '../../hooks/useClients';
import { useDocumentTypes, useCreateDocumentType } from '../../hooks/useDocumentTypes';
import dayjs from 'dayjs';

const { Option } = Select;

export default function AddTaskModal({ visible, onClose, initialClientId }) {
  const [form] = Form.useForm();
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const createTaskMutation = useCreateTask();
  const createDocTypeMutation = useCreateDocumentType();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: documentTypes, isLoading: docTypesLoading } = useDocumentTypes();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setIsOtherSelected(false);
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
      
      const finalDocumentType = isOtherSelected ? values.customDocumentType : values.documentType;

      if (!finalDocumentType || finalDocumentType.trim() === '') {
        message.error('Please specify a valid document type');
        return;
      }

      const trimmedType = finalDocumentType.trim();

      // If it's a custom type, attempt to save it to the global DocumentType table
      if (isOtherSelected && documentTypes) {
        const exists = documentTypes.some(dt => dt.name.toLowerCase() === trimmedType.toLowerCase());
        if (!exists) {
          try {
            await createDocTypeMutation.mutateAsync({ name: trimmedType });
          } catch (err) {
            console.error('Failed to save document type globally:', err);
            // Ignore error, we still want to save the task
          }
        }
      }

      const taskData = {
        ...values,
        documentType: trimmedType,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
      };
      
      delete taskData.customDocumentType;

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
            placeholder="Select type" 
            size="large"
            showSearch
            allowClear
            loading={docTypesLoading}
            onChange={(val) => setIsOtherSelected(val === 'Other')}
          >
            {documentTypes?.map(type => (
              <Option key={type.id} value={type.name}>{type.name}</Option>
            ))}
            <Option key="other" value="Other">Other</Option>
          </Select>
        </Form.Item>

        {isOtherSelected && (
          <Form.Item
            name="customDocumentType"
            label="Custom Document Type"
            rules={[{ required: true, message: 'Please specify the custom document type' }]}
          >
            <Input placeholder="Enter custom document type" size="large" />
          </Form.Item>
        )}

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

        <Form.Item
          name="place"
          label="Place"
        >
          <Input placeholder="Enter Place" size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
