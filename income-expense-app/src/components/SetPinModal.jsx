import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, message, Space, Alert } from 'antd';
import { KeyRound, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useSetPin } from '../hooks/useUsers';
import useAuthStore from '../store/authStore';

const { Title, Text } = Typography;

export default function SetPinModal({
  visible,
  onClose,
  hasExistingPin = false,
  isResetMode = false,
  onSuccess,
}) {
  const [form] = Form.useForm();
  const setPinMutation = useSetPin();
  const { updateUser } = useAuthStore();

  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  const handleFinish = async (values) => {
    const { newPin, confirmPin, currentPin, password } = values;

    if (newPin !== confirmPin) {
      message.error('New PIN and Confirm PIN do not match');
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      message.error('PIN must be exactly 4 numeric digits');
      return;
    }

    try {
      const payload = {
        newPin,
        currentPin: currentPin || undefined,
        password: password || undefined,
      };

      const res = await setPinMutation.mutateAsync(payload);
      if (res.user) {
        updateUser(res.user);
      }
      message.success(res.message || 'Security PIN saved successfully!');
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to save security PIN');
    }
  };

  const title = isResetMode
    ? 'Reset Security PIN'
    : hasExistingPin
    ? 'Change Security PIN'
    : 'Set Security PIN';

  const subtitle = isResetMode
    ? 'Verify your password to set a new 4-digit PIN'
    : hasExistingPin
    ? 'Update your 4-digit security PIN'
    : 'Create a 4-digit PIN to secure your sensitive financial numbers';

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
      width={420}
      styles={{
        content: {
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
          }}
        >
          <KeyRound size={28} color="#2563eb" />
        </div>

        <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
          {title}
        </Title>
        <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginTop: 4 }}>
          {subtitle}
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        {/* If existing PIN and NOT in reset mode, ask for Current PIN */}
        {hasExistingPin && !isResetMode && (
          <Form.Item
            name="currentPin"
            label={<span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>Current 4-Digit PIN</span>}
            rules={[
              { required: true, message: 'Please enter your current PIN' },
              { pattern: /^\d{4}$/, message: 'Current PIN must be 4 digits' },
            ]}
          >
            <Input.Password
              maxLength={4}
              placeholder="Enter current 4-digit PIN"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        )}

        {/* If first-time setup OR reset mode, ask for Account Password */}
        {(!hasExistingPin || isResetMode) && (
          <Form.Item
            name="password"
            label={<span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>Account Password</span>}
            rules={[{ required: true, message: 'Please enter your account password for authorization' }]}
          >
            <Input.Password
              prefix={<Lock size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
              placeholder="Enter account password"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        )}

        <Form.Item
          name="newPin"
          label={<span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>New 4-Digit PIN</span>}
          rules={[
            { required: true, message: 'Please enter a 4-digit PIN' },
            { pattern: /^\d{4}$/, message: 'PIN must be exactly 4 digits' },
          ]}
        >
          <Input.Password
            maxLength={4}
            placeholder="e.g. 1234"
            size="large"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          name="confirmPin"
          label={<span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>Confirm 4-Digit PIN</span>}
          dependencies={['newPin']}
          rules={[
            { required: true, message: 'Please confirm your 4-digit PIN' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPin') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('PINs do not match!'));
              },
            }),
          ]}
        >
          <Input.Password
            maxLength={4}
            placeholder="Re-enter 4-digit PIN"
            size="large"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <div style={{ marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'stretch' }} direction="vertical" size={10}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={setPinMutation.isPending}
              style={{
                borderRadius: 10,
                fontWeight: 600,
                height: 42,
                background: '#2563eb',
              }}
            >
              {hasExistingPin && !isResetMode ? 'Update PIN' : 'Save Security PIN'}
            </Button>
            <Button
              size="large"
              block
              onClick={onClose}
              style={{
                borderRadius: 10,
                fontWeight: 500,
                height: 40,
                color: '#64748b',
              }}
            >
              Cancel
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
