import React, { useState, useEffect, useRef } from 'react';
import { Modal, Typography, Input, Button, message, Space } from 'antd';
import { ShieldCheck, Lock, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useVerifyPin } from '../hooks/useUsers';
import usePrivacyStore from '../store/privacyStore';

const { Title, Text } = Typography;

export default function PinVerificationModal({
  visible,
  onClose,
  onForgotPin,
  onSuccess,
}) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [maskInput, setMaskInput] = useState(true);
  const verifyPinMutation = useVerifyPin();
  const revealStore = usePrivacyStore((state) => state.reveal);

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMsg('');
    }
  }, [visible]);

  const handleSubmit = async (pinValue) => {
    const val = (pinValue !== undefined ? pinValue : pin).toString().trim();
    if (!val || val.length < 4) {
      setErrorMsg('Please enter your 4-digit security PIN');
      return;
    }

    setErrorMsg('');
    try {
      await verifyPinMutation.mutateAsync(val);
      revealStore(5); // Auto hide after 5 mins
      message.success('Numbers unlocked');
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      const errText = err.response?.data?.error || 'Incorrect PIN. Please try again.';
      setErrorMsg(errText);
      setPin('');
    }
  };

  const handleOtpChange = (text) => {
    setPin(text);
    setErrorMsg('');
    if (text.length === 4) {
      handleSubmit(text);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
      width={400}
      styles={{
        content: {
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <div style={{ textAlign: 'center' }}>
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
          Enter Security PIN
        </Title>
        <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginTop: 4, marginBottom: 24 }}>
          Enter your 4-digit PIN to view financial amounts
        </Text>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Input.OTP
            length={4}
            mask={maskInput ? '•' : false}
            value={pin}
            onChange={handleOtpChange}
            disabled={verifyPinMutation.isPending}
            autoFocus
            size="large"
            status={errorMsg ? 'error' : ''}
            style={{
              gap: 12,
            }}
          />
        </div>

        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: 16,
              animation: 'shake 0.3s ease-in-out',
            }}
          >
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <Button
            type="link"
            size="small"
            onClick={() => setMaskInput(!maskInput)}
            style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
          >
            {maskInput ? <Eye size={14} /> : <EyeOff size={14} />}
            {maskInput ? 'Show PIN' : 'Hide PIN'}
          </Button>

          {onForgotPin && (
            <>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  if (onClose) onClose();
                  onForgotPin();
                }}
                style={{ color: '#2563eb', fontSize: '12px', padding: 0, fontWeight: 500 }}
              >
                Forgot PIN?
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
