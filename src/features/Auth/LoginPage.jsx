import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message, Typography, Space } from 'antd';
import { User, Lock, ShieldCheck, ArrowLeft, KeyRound, Smartphone, LifeBuoy } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import './login.scss';

const { Title, Text } = Typography;

const LoginPage = () => {
  const [step, setStep] = useState('CREDENTIALS'); // 'CREDENTIALS' | '2FA'
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // 2FA state
  const [tempToken, setTempToken] = useState('');
  const [otp, setOtp] = useState('');
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Step 1: Authenticate with Database (Email + Password)
  const onCredentialsSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', values);

      if (response.data.require2FA) {
        setTempToken(response.data.tempToken);
        setUserEmail(response.data.user?.email || values.email);
        setStep('2FA');
        setOtp('');
        setIsBackupMode(false);
        setBackupCode('');
        message.info('Two-Factor Authentication required.');
      } else {
        // Direct login if 2FA is not enabled
        login(response.data.user, response.data.token);
        message.success('Login successful');
        navigate('/app/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errMsg = error.response?.data?.error || error.message || 'Login failed';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit TOTP code or Backup code
  const onVerify2FASubmit = async (submittedCode) => {
    const codeToVerify = submittedCode || (isBackupMode ? backupCode : otp);

    if (!codeToVerify || codeToVerify.trim().length === 0) {
      message.error(isBackupMode ? 'Please enter your backup recovery code' : 'Please enter the 6-digit verification code');
      return;
    }

    setVerifyLoading(true);
    try {
      const response = await api.post('/auth/2fa/verify-login', {
        tempToken,
        code: codeToVerify.trim(),
      });

      login(response.data.user, response.data.token);
      message.success(response.data.message || 'Login verified successfully!');
      navigate('/app/dashboard');
    } catch (error) {
      console.error('2FA Verification error:', error);
      const errMsg = error.response?.data?.error || error.message || 'Failed to verify code';
      message.error(errMsg);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Hero Section (65%) */}
      <div className="login-hero">
        <div className="floating-elements">
          <div className="float-item scales">⚖️</div>
          <div className="float-item doc">📜</div>
          <div className="float-item court">🏛️</div>
        </div>

        <div className="hero-content">
          <h1>JIKADARA & PANDAV<br />ASSOCIATES</h1>
          <h3>Advocate and Legal Consultants</h3>

          <ul>
            <li>Professional Legal Services</li>
            <li>Case Management</li>
            <li>Client Consultation</li>
            <li>Document Tracking</li>
            <li>Secure Legal Portal</li>
          </ul>

          <div className="trust-badge">
            ✦ Trusted Legal Excellence
          </div>
        </div>
      </div>

      {/* Right Login Panel (35%) */}
      <div className="login-panel">
        <div className="glass-login-card">
          {step === 'CREDENTIALS' ? (
            <>
              <div className="login-header">
                <img src="/logo.png" alt="Logo" />
                <h2>Welcome Back</h2>
                <p>Access Your Legal Dashboard</p>
              </div>

              <Form
                name="login"
                initialValues={{ remember: true }}
                onFinish={onCredentialsSubmit}
                size="large"
                layout="vertical"
              >
                <Form.Item
                  name="email"
                  rules={[{ required: true, message: 'Please input your email!' }]}
                >
                  <Input prefix={<User size={16} style={{ color: '#bfbfbf' }} />} placeholder="Email Address" />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[{ required: true, message: 'Please input your password!' }]}
                >
                  <Input.Password prefix={<Lock size={16} style={{ color: '#bfbfbf' }} />} placeholder="Password" />
                </Form.Item>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>Remember Me</Checkbox>
                  </Form.Item>
                  {/* <Link to="/forgot-password" style={{ color: '#D4AF37', fontWeight: 500 }}>Forgot Password?</Link> */}
                </div>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading}>
                    Sign In
                  </Button>
                </Form.Item>
              </Form>
            </>
          ) : (
            <>
              {/* Step 2: TOTP 2FA Verification */}
              <div className="login-header" style={{ marginBottom: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: '#d97706',
                  }}
                >
                  <ShieldCheck size={28} />
                </div>
                <h2>Two-Step Verification</h2>
                <p style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
                  {isBackupMode ? (
                    <>Enter one of your <strong>8-character backup recovery codes</strong></>
                  ) : (
                    <>
                      Enter the 6-digit code from <strong>Google Authenticator</strong>, <strong>Microsoft Auth</strong>, or <strong>Authy</strong>.
                    </>
                  )}
                </p>
              </div>

              {!isBackupMode ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <Input.OTP
                    length={6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      if (val.length === 6) {
                        onVerify2FASubmit(val);
                      }
                    }}
                    size="large"
                    autoFocus
                  />
                </div>
              ) : (
                <div style={{ marginBottom: 24 }}>
                  <Input
                    placeholder="e.g. A1B2-C3D4"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    size="large"
                    prefix={<KeyRound size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
                    style={{ textAlign: 'center', letterSpacing: 2, fontWeight: 700 }}
                    autoFocus
                  />
                </div>
              )}

              <Button
                type="primary"
                size="large"
                onClick={() => onVerify2FASubmit()}
                loading={verifyLoading}
                disabled={isBackupMode ? !backupCode.trim() : otp.length !== 6}
                style={{ width: '100%', marginBottom: 16, height: 44, fontWeight: 600 }}
              >
                Verify & Continue
              </Button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Button
                  type="link"
                  icon={<ArrowLeft size={14} />}
                  onClick={() => setStep('CREDENTIALS')}
                  style={{ padding: 0, color: '#64748b', fontSize: 13 }}
                >
                  Back to Sign In
                </Button>

                <Button
                  type="link"
                  icon={<LifeBuoy size={14} />}
                  onClick={() => {
                    setIsBackupMode(!isBackupMode);
                    setOtp('');
                    setBackupCode('');
                  }}
                  style={{ padding: 0, color: '#D4AF37', fontWeight: 600, fontSize: 13 }}
                >
                  {isBackupMode ? 'Use Authenticator App' : 'Use Backup Code'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
