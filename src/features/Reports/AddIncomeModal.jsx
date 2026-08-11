import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, DatePicker, message, Row, Col } from 'antd';
import { useCreateDirectIncome } from '../../hooks/useTasks';
import { useClients } from '../../hooks/useClients';
import { useDocumentTypes, useCreateDocumentType } from '../../hooks/useDocumentTypes';
import dayjs from 'dayjs';

export default function AddIncomeModal({ visible, onClose }) {
  const [form] = Form.useForm();

  const createDirectIncomeMutation = useCreateDirectIncome();
  const createDocTypeMutation = useCreateDocumentType();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: documentTypes, isLoading: docTypesLoading } = useDocumentTypes();

  // Watch form fields directly for reactive conditional rendering
  const watchedClientId = Form.useWatch('clientId', form);
  const watchedDocType = Form.useWatch('documentType', form);

  const isOtherClientSelected = watchedClientId === 'OTHER';
  const isOtherDocTypeSelected = watchedDocType === 'Other';

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        date: dayjs(),
      });
    }
  }, [visible, form]);

  // Memoize options arrays with "Other" always included consistently
  const clientOptions = useMemo(() => {
    const list = (clients || []).map((client) => ({
      label: `${client.name}${client.mobileNumber ? ` (${client.mobileNumber})` : ''}`,
      value: client.id,
    }));
    list.push({ label: 'Other', value: 'OTHER' });
    return list;
  }, [clients]);

  const docTypeOptions = useMemo(() => {
    const list = (documentTypes || []).map((type) => ({
      label: type.name,
      value: type.name,
    }));
    list.push({ label: 'Other', value: 'Other' });
    return list;
  }, [documentTypes]);

  const handleClientChange = (val) => {
    if (val === 'OTHER') {
      form.setFieldsValue({ referenceName: '' });
    } else {
      const selectedClient = clients?.find((c) => c.id === val);
      if (selectedClient) {
        form.setFieldsValue({ referenceName: selectedClient.referenceName || '' });
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Document Type resolution
      const finalDocType = isOtherDocTypeSelected
        ? values.customDocumentType
        : values.documentType;

      if (!finalDocType || !finalDocType.trim()) {
        message.error('Please specify a valid document type');
        return;
      }

      const trimmedDocType = finalDocType.trim();

      // If it's a custom document type, persist it in the document types list
      if (isOtherDocTypeSelected && documentTypes) {
        const exists = documentTypes.some(
          (dt) => dt.name.toLowerCase() === trimmedDocType.toLowerCase()
        );
        if (!exists) {
          try {
            await createDocTypeMutation.mutateAsync({ name: trimmedDocType });
          } catch (err) {
            console.error('Failed to save document type globally:', err);
          }
        }
      }

      // Payload assembly
      const payload = {
        date: values.date ? values.date.format('YYYY-MM-DD') : undefined,
        documentType: trimmedDocType,
        place: values.place ? values.place.trim() : '',
        referenceName: values.referenceName ? values.referenceName.trim() : '',
        amount: Number(values.amount),
        clientId: values.clientId === 'OTHER' ? undefined : values.clientId,
        clientName: isOtherClientSelected ? values.customClientName?.trim() : undefined,
      };

      await createDirectIncomeMutation.mutateAsync(payload);
      message.success('Income entry added successfully!');
      onClose();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        console.error('Error adding income entry:', error);
        message.error(error.response?.data?.error || error.message || 'Failed to add income entry');
      }
    }
  };

  return (
    <Modal
      title="Add Income"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createDirectIncomeMutation.isPending}
      okText="Save Income"
      cancelText="Cancel"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        name="addIncomeForm"
        style={{ marginTop: 16 }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" allowClear={false} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="amount"
              label="Income Amount"
              rules={[
                { required: true, message: 'Please enter income amount' },
                {
                  validator(_, value) {
                    if (value && (isNaN(value) || Number(value) <= 0)) {
                      return Promise.reject(new Error('Enter a valid amount greater than 0'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                type="number"
                prefix="₹"
                placeholder="0.00"
                size="large"
                min="1"
                step="any"
              />
            </Form.Item>
          </Col>
        </Row>

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

          {isOtherDocTypeSelected ? (
            <Col xs={24} sm={12}>
              <Form.Item
                name="customDocumentType"
                label="Custom Document Type"
                rules={[{ required: true, message: 'Please enter document type' }]}
              >
                <Input placeholder="Enter document type" size="large" />
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

        {isOtherDocTypeSelected && (
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="place" label="Place">
                <Input placeholder="e.g. Surat" size="large" />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="clientId"
              label="Client"
              rules={[{ required: true, message: 'Client selection is required' }]}
            >
              <Select
                placeholder="Select Client"
                size="large"
                showSearch
                options={clientOptions}
                optionFilterProp="label"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                loading={clientsLoading}
                onChange={handleClientChange}
              />
            </Form.Item>
          </Col>

          {isOtherClientSelected ? (
            <Col xs={24} sm={12}>
              <Form.Item
                name="customClientName"
                label="Client Name"
                rules={[{ required: true, message: 'Please enter client name' }]}
              >
                <Input placeholder="Enter new client name" size="large" />
              </Form.Item>
            </Col>
          ) : (
            <Col xs={24} sm={12}>
              <Form.Item
                name="referenceName"
                label="Reference"
                tooltip="Enter if there is a reference person"
              >
                <Input placeholder="Enter Reference Name" size="large" />
              </Form.Item>
            </Col>
          )}
        </Row>

        {isOtherClientSelected && (
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                name="referenceName"
                label="Reference"
                tooltip="Enter if there is a reference person"
              >
                <Input placeholder="Enter Reference Name" size="large" />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>
    </Modal>
  );
}
