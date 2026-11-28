import React, { useState, useEffect } from 'react';
import { Drawer, Form, Input, Button, Space, Tag, message, Typography, Divider } from 'antd';
import { Settings, Save } from 'lucide-react';
import { updateMoeTemplate } from '../moeApi';

const { Text } = Typography;
const { TextArea } = Input;

export default function MoeTemplateManagerModal({ open, onClose, template, onUpdated }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && template) {
      const bd = template.bankDefaults || {};
      form.setFieldsValue({
        name: template.name,
        version: template.version,
        bankName: bd.bankName || '',
        bankShortName: bd.bankShortName || '',
        registeredOfficeAddress: bd.registeredOfficeAddress || '',
        defaultBranchAddress: bd.defaultBranchAddress || '',
        defaultPlace: bd.defaultPlace || 'SURAT',
      });
    }
  }, [open, template, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await updateMoeTemplate(template.id, {
        name: values.name,
        version: values.version,
        bankDefaults: {
          bankName: values.bankName,
          bankShortName: values.bankShortName,
          registeredOfficeAddress: values.registeredOfficeAddress,
          defaultBranchAddress: values.defaultBranchAddress,
          defaultPlace: values.defaultPlace,
        },
      });
      message.success('MOE Template defaults updated');
      onUpdated?.();
      onClose();
    } catch (err) {
      if (err?.name !== 'ValidationError') {
        message.error(err?.response?.data?.error || 'Failed to update template');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={520}
      title={
        <Space>
          <Settings size={17} />
          <span>MOE Template Management</span>
        </Space>
      }
      extra={
        <Button type="primary" icon={<Save size={14} />} loading={saving} onClick={handleSave}>
          Save Defaults
        </Button>
      }
    >
      {template && (
        <Form form={form} layout="vertical">
          <div style={{ marginBottom: 12 }}>
            <Tag color="geekblue">Key: {template.templateKey}</Tag>
            <Tag color="green">File: {template.fileName}</Tag>
          </div>
          <Form.Item name="name" label="Template Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="version" label="Version" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Divider style={{ margin: '12px 0' }} />
          <Text strong style={{ display: 'block', marginBottom: 10 }}>
            Permanent Bank Defaults (Pre-filled for new MOE filings)
          </Text>
          <Form.Item name="bankName" label="Bank Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bankShortName" label="Bank Short Name (Signature Block)">
            <Input />
          </Form.Item>
          <Form.Item name="defaultPlace" label="Default Deposit Place">
            <Input />
          </Form.Item>
          <Form.Item name="registeredOfficeAddress" label="Registered Office Address">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="defaultBranchAddress" label="Default Branch Address">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}
