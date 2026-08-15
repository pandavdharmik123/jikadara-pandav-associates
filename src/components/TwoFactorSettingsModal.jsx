import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Typography,
  Space,
  Input,
  message,
  Alert,
  Divider,
  Tag,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Key,
  Copy,
  Check,
  Download,
  Lock,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

export default function TwoFactorSettingsModal({ visible, onClose, user, onStatusChanged }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('STATUS'); // 'STATUS' | 'SETUP' | 'BACKUP_CODES' | 'DISABLE' | 'REGENERATE_BACKUP'
  
  // Setup data
  const [setupData, setSetupData] = useState(null); // { secret, otpauth, qrCode }
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Disable / Regenerate state
  const [password, setPassword] = useState('');

  const isEnabled = Boolean(user?.twoFactorEnabled);

  useEffect(() => {
    if (visible) {
      setVerificationCode('');
      setPassword('');
      setBackupCodes([]);
      setCopiedSecret(false);
      setCopiedBackup(false);

      if (!isEnabled) {
        // Automatically fetch QR code and show setup screen directly
        startSetup();
      } else {
        setStep('STATUS');
      }
    }
  }, [visible, isEnabled]);

  // Fetch QR Code and Secret to start setup
  const startSetup = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/2fa/setup');
      setSetupData(response.data);
      setStep('SETUP');
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to initialize 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  // Submit 6-digit code to enable 2FA
  const handleEnable2FA = async () => {
    if (!verificationCode || verificationCode.trim().length !== 6) {
      message.error('Please enter the 6-digit code from your authenticator app');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/2fa/enable', {
        secret: setupData.secret,
        code: verificationCode.trim(),
      });

      message.success(response.data.message || '2FA enabled successfully!');
      setBackupCodes(response.data.backupCodes || []);
      setStep('BACKUP_CODES');
      if (onStatusChanged) onStatusChanged(response.data.user);
    } catch (err) {
      message.error(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!password) {
      message.error('Please enter your current password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/2fa/disable', { password });
      message.success(response.data.message || '2FA disabled successfully');
      if (onStatusChanged) onStatusChanged(response.data.user);
      onClose();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate Backup Codes
  const handleRegenerateBackupCodes = async () => {
    if (!password) {
      message.error('Please enter your current password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/2fa/generate-backup-codes', { password });
      message.success(response.data.message || 'New backup codes generated');
      setBackupCodes(response.data.backupCodes || []);
      setStep('BACKUP_CODES');
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to generate backup codes');
    } finally {
      setLoading(false);
    }
  };

  // Copy Secret key
  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      message.success('Secret key copied to clipboard');
      setTimeout(() => setCopiedSecret(false), 2500);
    }
  };

  // Copy Backup Codes
  const handleCopyBackupCodes = () => {
    if (backupCodes.length > 0) {
      const text = `Advocate Management - 2FA Backup Recovery Codes:\n\n${backupCodes.join('\n')}\n\nKeep these codes in a safe place. Each code can only be used once.`;
      navigator.clipboard.writeText(text);
      setCopiedBackup(true);
      message.success('Backup codes copied to clipboard');
      setTimeout(() => setCopiedBackup(false), 2500);
    }
  };

  // Download Backup Codes as Text File
  const handleDownloadBackupCodes = () => {
    if (backupCodes.length > 0) {
      const text = `Advocate Management - 2FA Backup Recovery Codes\nUser: ${user?.email}\nDate: ${new Date().toLocaleDateString()}\n\n${backupCodes.join('\n')}\n\n* Each code is single-use only.`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `2fa-backup-codes-${user?.email || 'account'}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={540}
      destroyOnClose
      centered
      style={{ borderRadius: 16 }}
    >
      {/* ─── STATUS VIEW ─────────────────────────────────────── */}
      {step === 'STATUS' && (
        <div style={{ padding: '8px 4px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: isEnabled ? '#ecfdf5' : '#fef3c7',
                color: isEnabled ? '#059669' : '#d97706',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              {isEnabled ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
            </div>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              Two-Factor Authentication (2FA)
            </Title>
            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
              Protect your account using TOTP Authenticator Apps (Google Authenticator, Microsoft Authenticator, Authy).
            </Text>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong style={{ display: 'block', fontSize: 14 }}>Status</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {isEnabled
                    ? '2FA is currently active on your account.'
                    : '2FA is disabled. Enable it to secure your account.'}
                </Text>
              </div>
              <Tag
                color={isEnabled ? 'success' : 'warning'}
                style={{ padding: '4px 12px', borderRadius: 12, fontWeight: 600, fontSize: 13 }}
              >
                {isEnabled ? 'ENABLED' : 'DISABLED'}
              </Tag>
            </div>
          </div>

          {!isEnabled ? (
            <div>
              <Alert
                type="info"
                showIcon
                icon={<Info size={16} />}
                message="How it works"
                description="Scan a QR code using Google Authenticator or Microsoft Authenticator on your phone. You will enter a 6-digit code from the app whenever you log in."
                style={{ borderRadius: 10, marginBottom: 20, fontSize: 13 }}
              />

              <Button
                type="primary"
                size="large"
                block
                icon={<QrCode size={18} />}
                onClick={startSetup}
                loading={loading}
                style={{ height: 44, fontWeight: 600, borderRadius: 8 }}
              >
                Set Up Two-Factor Authentication
              </Button>
            </div>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Button
                block
                icon={<RefreshCw size={16} />}
                onClick={() => {
                  setPassword('');
                  setStep('REGENERATE_BACKUP');
                }}
                style={{ height: 40, borderRadius: 8, fontWeight: 500 }}
              >
                Generate New Backup Codes
              </Button>

              <Button
                danger
                block
                icon={<Lock size={16} />}
                onClick={() => {
                  setPassword('');
                  setStep('DISABLE');
                }}
                style={{ height: 40, borderRadius: 8, fontWeight: 500 }}
              >
                Disable Two-Factor Authentication
              </Button>
            </Space>
          )}
        </div>
      )}

      {/* ─── SETUP VIEW (QR CODE SCAN) ───────────────────────── */}
      {step === 'SETUP' && (
        <div style={{ padding: '8px 4px' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              Scan QR Code with Authenticator App
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Use Google Authenticator, Microsoft Authenticator, or Authy on your mobile device.
            </Text>
          </div>

          {setupData?.qrCode && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: 12,
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <img
                  src={setupData.qrCode}
                  alt="2FA QR Code"
                  style={{ width: 180, height: 180, display: 'block', borderRadius: 8 }}
                />
              </div>
            </div>
          )}

          {/* Manual Entry Secret Key */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Can't scan? Enter key manually:</Text>
              <Text code copyable={false} style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
                {setupData?.secret}
              </Text>
            </div>
            <Button
              size="small"
              type="text"
              icon={copiedSecret ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              onClick={handleCopySecret}
            >
              {copiedSecret ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8, textAlign: 'center' }}>
              Enter the 6-digit code shown in your app to confirm:
            </Text>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Input.OTP
                length={6}
                value={verificationCode}
                onChange={(val) => setVerificationCode(val)}
                size="large"
              />
            </div>
          </div>

          <Row gutter={12}>
            <Col span={10}>
              <Button block onClick={() => (isEnabled ? setStep('STATUS') : onClose())} style={{ height: 42, borderRadius: 8 }}>
                Cancel
              </Button>
            </Col>
            <Col span={14}>
              <Button
                type="primary"
                block
                onClick={handleEnable2FA}
                loading={loading}
                disabled={verificationCode.length !== 6}
                style={{ height: 42, borderRadius: 8, fontWeight: 600 }}
              >
                Verify & Activate
              </Button>
            </Col>
          </Row>
        </div>
      )}

      {/* ─── BACKUP CODES VIEW ───────────────────────────────── */}
      {step === 'BACKUP_CODES' && (
        <div style={{ padding: '8px 4px' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Check size={28} />
            </div>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              Save Your Backup Recovery Codes
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              If you lose access to your phone, these codes are the only way to log in.
            </Text>
          </div>

          <Alert
            type="warning"
            showIcon
            message="Single-use emergency codes"
            description="Store these in a secure password manager or print them out. Each code can only be used once."
            style={{ borderRadius: 10, marginBottom: 16, fontSize: 12 }}
          />

          <div
            style={{
              padding: '16px',
              backgroundColor: '#0f172a',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Row gutter={[12, 12]}>
              {backupCodes.map((code, idx) => (
                <Col span={12} key={idx}>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#f8fafc',
                      letterSpacing: 1,
                      textAlign: 'center',
                      backgroundColor: '#1e293b',
                      padding: '8px',
                      borderRadius: 6,
                    }}
                  >
                    {code}
                  </div>
                </Col>
              ))}
            </Row>
          </div>

          <Space size={8} style={{ width: '100%', marginBottom: 16 }}>
            <Button
              block
              icon={copiedBackup ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              onClick={handleCopyBackupCodes}
              style={{ borderRadius: 8 }}
            >
              {copiedBackup ? 'Copied to Clipboard' : 'Copy Codes'}
            </Button>
            <Button
              block
              icon={<Download size={14} />}
              onClick={handleDownloadBackupCodes}
              style={{ borderRadius: 8 }}
            >
              Download .TXT
            </Button>
          </Space>

          <Button
            type="primary"
            block
            size="large"
            onClick={onClose}
            style={{ height: 44, borderRadius: 8, fontWeight: 600 }}
          >
            I Have Saved My Codes
          </Button>
        </div>
      )}

      {/* ─── DISABLE VIEW ────────────────────────────────────── */}
      {step === 'DISABLE' && (
        <div style={{ padding: '8px 4px' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#dc2626' }}>
              Disable Two-Factor Authentication
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Enter your current account password to confirm disabling 2FA.
            </Text>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Current Password</Text>
            <Input.Password
              size="large"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              prefix={<Lock size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
            />
          </div>

          <Row gutter={12}>
            <Col span={10}>
              <Button block onClick={() => setStep('STATUS')} style={{ height: 42, borderRadius: 8 }}>
                Cancel
              </Button>
            </Col>
            <Col span={14}>
              <Button
                danger
                type="primary"
                block
                onClick={handleDisable2FA}
                loading={loading}
                disabled={!password}
                style={{ height: 42, borderRadius: 8, fontWeight: 600 }}
              >
                Confirm & Disable
              </Button>
            </Col>
          </Row>
        </div>
      )}

      {/* ─── REGENERATE BACKUP CODES VIEW ────────────────────── */}
      {step === 'REGENERATE_BACKUP' && (
        <div style={{ padding: '8px 4px' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              Regenerate Backup Codes
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              This will invalidate all previously generated backup codes.
            </Text>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Current Password</Text>
            <Input.Password
              size="large"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              prefix={<Lock size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
            />
          </div>

          <Row gutter={12}>
            <Col span={10}>
              <Button block onClick={() => setStep('STATUS')} style={{ height: 42, borderRadius: 8 }}>
                Cancel
              </Button>
            </Col>
            <Col span={14}>
              <Button
                type="primary"
                block
                onClick={handleRegenerateBackupCodes}
                loading={loading}
                disabled={!password}
                style={{ height: 42, borderRadius: 8, fontWeight: 600 }}
              >
                Generate New Codes
              </Button>
            </Col>
          </Row>
        </div>
      )}
    </Modal>
  );
}
