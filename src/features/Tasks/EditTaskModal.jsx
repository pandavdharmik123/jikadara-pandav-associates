import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, DatePicker, message, Row, Col } from 'antd';
import { useUpdateTask } from '../../hooks/useTasks';
import { useDocumentTypes, useCreateDocumentType } from '../../hooks/useDocumentTypes';
import dayjs from 'dayjs';

export default function EditTaskModal({ visible, task, onClose }) {
  const [form] = Form.useForm();
  const updateTaskMutation = useUpdateTask();
  const createDocTypeMutation = useCreateDocumentType();
  const { data: documentTypes, isLoading: docTypesLoading } = useDocumentTypes();

  const watchedDocType = Form.useWatch('documentType', form);
  const isOtherSelected = watchedDocType === 'Other';

  const docTypeOptions = useMemo(() => {
    const list = (documentTypes || []).map((type) => ({
      label: type.name,
      value: type.name,
    }));
    list.push({ label: 'Other', value: 'Other' });
    return list;
  }, [documentTypes]);

  useEffect(() => {
    if (visible && task) {
      form.resetFields();
      const isKnown = documentTypes?.some((type) => type.name === task.documentType);
      const isCustom = !isKnown && !!task.documentType;

      form.setFieldsValue({
        documentType: isCustom ? 'Other' : task.documentType,
        customDocumentType: isCustom ? task.documentType : undefined,
        referenceName: task.referenceName || '',
        place: task.place || '',
        startDate: task.startDate ? dayjs(task.startDate) : dayjs(),
        completedDate: task.completedDate ? dayjs(task.completedDate) : undefined,
      });
    }
  }, [visible, task, form, documentTypes]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const finalDocumentType = isOtherSelected
        ? values.customDocumentType
        : values.documentType;

      if (!finalDocumentType || !finalDocumentType.trim()) {
        message.error('Please specify a valid document type');
        return;
      }

      const trimmedType = finalDocumentType.trim();

      // If it's a custom type, persist it in the global DocumentType table
      if (isOtherSelected && documentTypes) {
        const exists = documentTypes.some(
          (dt) => dt.name.toLowerCase() === trimmedType.toLowerCase()
        );
        if (!exists) {
          try {
            await createDocTypeMutation.mutateAsync({ name: trimmedType });
          } catch (err) {
            console.error('Failed to save document type globally:', err);
          }
        }
      }

      const payload = {
        id: task.id,
        documentType: trimmedType,
        referenceName: values.referenceName ? values.referenceName.trim() : '',
        place: values.place ? values.place.trim() : '',
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        completedDate: values.completedDate ? values.completedDate.format('YYYY-MM-DD') : undefined,
      };

      await updateTaskMutation.mutateAsync(payload);
      message.success('Task details updated successfully');
      onClose();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        console.error('Error updating task:', error);
        message.error(error.response?.data?.error || 'Failed to update task');
      }
    }
  };

  return (
    <Modal
      title="Edit Task Details"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={updateTaskMutation.isPending}
      okText="Save Changes"
      cancelText="Cancel"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        name="editTaskForm"
        style={{ marginTop: 16 }}
      >
        <Form.Item label="Client">
          <Input
            value={task?.client?.name || task?.clientName || 'N/A'}
            disabled
            size="large"
            style={{ backgroundColor: '#f8fafc', color: '#475569' }}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="documentType"
              label="Document Type"
              rules={[{ required: true, message: 'Document type is required' }]}
            >
              <Select
                placeholder="Select document type"
                size="large"
                showSearch
                options={docTypeOptions}
                optionFilterProp="label"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                loading={docTypesLoading}
              />
            </Form.Item>
          </Col>

          {isOtherSelected ? (
            <Col xs={24} sm={12}>
              <Form.Item
                name="customDocumentType"
                label="Custom Document Type"
                rules={[{ required: true, message: 'Please specify the document type' }]}
              >
                <Input placeholder="Enter custom document type" size="large" />
              </Form.Item>
            </Col>
          ) : (
            <Col xs={24} sm={12}>
              <Form.Item name="place" label="Place">
                <Input placeholder="e.g. Surat" size="large" />
              </Form.Item>
            </Col>
          )}
        </Row>

        {isOtherSelected && (
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="place" label="Place">
                <Input placeholder="e.g. Surat" size="large" />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col xs={24} sm={task?.status === 'DONE' ? 12 : 24}>
            <Form.Item
              name="startDate"
              label="Start Date"
              rules={[{ required: true, message: 'Start date is required' }]}
            >
              <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" allowClear={false} />
            </Form.Item>
          </Col>

          {task?.status === 'DONE' && (
            <Col xs={24} sm={12}>
              <Form.Item
                name="completedDate"
                label="Completion Date"
              >
                <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" allowClear={false} />
              </Form.Item>
            </Col>
          )}
        </Row>

        <Form.Item
          name="referenceName"
          label="Reference Name"
          tooltip="Enter if there is a reference person"
        >
          <Input placeholder="Enter Reference Name" size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
