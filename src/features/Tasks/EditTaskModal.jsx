import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, message, Spin } from 'antd';
import { useUpdateTask } from '../../hooks/useTasks';
import { useDocumentTypes, useCreateDocumentType } from '../../hooks/useDocumentTypes';
import dayjs from 'dayjs';

const { Option } = Select;

export default function EditTaskModal({ visible, task, onClose }) {
  const [form] = Form.useForm();
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const updateTaskMutation = useUpdateTask();
  const createDocTypeMutation = useCreateDocumentType();
  const { data: documentTypes, isLoading: docTypesLoading } = useDocumentTypes();

  useEffect(() => {
    if (visible && task && documentTypes) {
      const isCustom = !documentTypes.some(type => type.name === task.documentType);
      
      setIsOtherSelected(isCustom);

      form.setFieldsValue({
        documentType: isCustom ? 'Other' : task.documentType,
        customDocumentType: isCustom ? task.documentType : undefined,
        referenceName: task.referenceName,
        place: task.place,
        startDate: task.startDate ? dayjs(task.startDate) : dayjs(),
      });
    }
  }, [visible, task, form, documentTypes]);

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
        id: task.id,
        ...values,
        documentType: trimmedType,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
      };

      delete taskData.customDocumentType;

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
            placeholder="Select type" 
            size="large"
            showSearch
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
