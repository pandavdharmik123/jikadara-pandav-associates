import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, message, Typography } from 'antd';
import {
  User,
  Lock,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Mail,
  Send,
  RotateCw,
  ChevronRight,
  LifeBuoy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const [userEmail, setUserEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Active method: 'TOTP' | 'EMAIL_OTP' | 'BACKUP_CODE' | 'CHOOSE_WAY'
  const [authMethod, setAuthMethod] = useState('TOTP');
  const [previousMethod, setPreviousMethod] = useState('TOTP');

  // Codes
  const [otp, setOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [backupCode, setBackupCode] = useState('');

  // Email OTP state
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Step 1: Authenticate with Database (Email + Password)
  const onCredentialsSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', values);

      if (response.data.require2FA) {
        setTempToken(response.data.tempToken);
        setUserEmail(response.data.user?.email || values.email);
        setMaskedEmail(response.data.user?.maskedEmail || response.data.user?.email || values.email);
        setStep('2FA');
        setAuthMethod('TOTP');
        setPreviousMethod('TOTP');
        setOtp('');
        setEmailOtp('');
        setBackupCode('');
        setOtpSent(false);
        setCountdown(0);
        message.info('Two-Factor Authentication required.');
      } else {
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

  // Step 2A: Send Email OTP
  const handleSendEmailOtp = async () => {
    if (countdown > 0 || sendingOtp) return;

    setSendingOtp(true);
    try {
      const response = await api.post('/auth/2fa/send-email-otp', {
        tempToken,
      });

      if (response.data.maskedEmail) {
        setMaskedEmail(response.data.maskedEmail);
      }

      setOtpSent(true);
      setCountdown(60);
      message.success(response.data.message || `OTP sent to ${response.data.maskedEmail || 'your email'}`);
    } catch (error) {
      console.error('Send Email OTP error:', error);
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        'Failed to send OTP to email. Please try again.';
      message.error(errMsg);
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2B: Verify TOTP Authenticator or Backup Recovery Code
  const onVerifyTOTPSubmit = async (submittedCode) => {
    const isBackup = authMethod === 'BACKUP_CODE';
    const codeToVerify = submittedCode || (isBackup ? backupCode : otp);

    if (!codeToVerify || codeToVerify.trim().length === 0) {
      message.error(isBackup ? 'Please enter your backup recovery code' : 'Please enter the 6-digit code');
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

  // Step 2C: Verify Email OTP
  const onVerifyEmailOtpSubmit = async (submittedCode) => {
    const codeToVerify = submittedCode || emailOtp;

    if (!codeToVerify || codeToVerify.trim().length !== 6) {
      message.error('Please enter the 6-digit email OTP');
      return;
    }

    setVerifyLoading(true);
    try {
      const response = await api.post('/auth/2fa/verify-email-otp', {
        tempToken,
        code: codeToVerify.trim(),
      });

      login(response.data.user, response.data.token);
      message.success(response.data.message || 'Email OTP verified successfully!');
      navigate('/app/dashboard');
    } catch (error) {
      console.error('Email OTP verification error:', error);
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        'Invalid 6-digit OTP code or session expired. Please check and try again.';
      message.error(errMsg);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Switch to "Try another way" selection view
  const openTryAnotherWay = () => {
    setPreviousMethod(authMethod);
    setAuthMethod('CHOOSE_WAY');
  };

  // Select an alternate method
  const selectMethod = (method) => {
    setAuthMethod(method);
    setOtp('');
    setEmailOtp('');
    setBackupCode('');
    // If switching to Email OTP and not sent yet, optionally auto-send
    if (method === 'EMAIL_OTP' && !otpSent) {
      handleSendEmailOtp();
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
          <h1>
            JIKADARA & PANDAV
            <br />
            ASSOCIATES
          </h1>
          <h3>Advocate and Legal Consultants</h3>

          <ul>
            <li>Professional Legal Services</li>
            <li>Case Management</li>
            <li>Client Consultation</li>
            <li>Document Tracking</li>
            <li>Secure Legal Portal</li>
          </ul>

          <div className="trust-badge">✦ Trusted Legal Excellence</div>
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

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                  }}
                >
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>Remember Me</Checkbox>
                  </Form.Item>
                </div>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading}>
                    Sign In
                  </Button>
                </Form.Item>
              </Form>
            </>
          ) : authMethod === 'CHOOSE_WAY' ? (
            <>
              {/* "Try another way" Selection Screen */}
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
                    margin: '0 auto 12px',
                    color: '#d97706',
                  }}
                >
                  <LifeBuoy size={26} />
                </div>
                <h2 style={{ fontSize: '1.45rem', marginBottom: 4 }}>Choose another way</h2>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Select an alternative verification method to sign in:
                </p>
              </div>

              <div className="try-another-way-list">
                {/* Option 1: Authenticator App */}
                <div
                  className="method-item"
                  onClick={() => selectMethod('TOTP')}
                >
                  <div className="method-icon-wrap">
                    <ShieldCheck size={22} />
                  </div>
                  <div className="method-text">
                    <div className="method-title">Authenticator App</div>
                    <div className="method-desc">Get a 6-digit code from Google Authenticator or Microsoft Auth</div>
                  </div>
                  <ChevronRight size={18} className="method-arrow" />
                </div>

                {/* Option 2: Email OTP */}
                <div
                  className="method-item"
                  onClick={() => selectMethod('EMAIL_OTP')}
                >
                  <div className="method-icon-wrap">
                    <Mail size={22} />
                  </div>
                  <div className="method-text">
                    <div className="method-title">Email verification code</div>
                    <div className="method-desc">
                      Send a 6-digit code to {maskedEmail || 'your registered email'}
                    </div>
                  </div>
                  <ChevronRight size={18} className="method-arrow" />
                </div>

                {/* Option 3: Backup Code */}
                <div
                  className="method-item"
                  onClick={() => selectMethod('BACKUP_CODE')}
                >
                  <div className="method-icon-wrap">
                    <KeyRound size={22} />
                  </div>
                  <div className="method-text">
                    <div className="method-title">Backup recovery code</div>
                    <div className="method-desc">Use one of your 8-character saved emergency backup codes</div>
                  </div>
                  <ChevronRight size={18} className="method-arrow" />
                </div>
              </div>

              {/* Back to previous option or Sign in */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Button
                  type="link"
                  onClick={() => setAuthMethod(previousMethod || 'TOTP')}
                  style={{ color: '#0a192f', fontWeight: 600, fontSize: 13 }}
                >
                  Cancel
                </Button>
                <Button
                  type="link"
                  icon={<ArrowLeft size={13} />}
                  onClick={() => setStep('CREDENTIALS')}
                  style={{ color: '#64748b', fontSize: 12 }}
                >
                  Back to Sign In
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Option 1: Authenticator App (TOTP) View */}
              {authMethod === 'TOTP' && (
                <div>
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
                        margin: '0 auto 12px',
                        color: '#d97706',
                      }}
                    >
                      <ShieldCheck size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Two-Step Verification</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                      Enter the 6-digit code from <strong>Google Authenticator</strong>,{' '}
                      <strong>Microsoft Auth</strong>, or <strong>Authy</strong>.
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                    <Input.OTP
                      length={6}
                      value={otp}
                      onChange={(val) => {
                        setOtp(val);
                        if (val.length === 6) {
                          onVerifyTOTPSubmit(val);
                        }
                      }}
                      size="large"
                      autoFocus
                    />
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    onClick={() => onVerifyTOTPSubmit()}
                    loading={verifyLoading}
                    disabled={otp.length !== 6}
                    style={{ width: '100%', marginBottom: 14, height: 44, fontWeight: 600 }}
                  >
                    Verify & Continue
                  </Button>
                </div>
              )}

              {/* Option 2: Email OTP View */}
              {authMethod === 'EMAIL_OTP' && (
                <div>
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
                        margin: '0 auto 12px',
                        color: '#d97706',
                      }}
                    >
                      <Mail size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Email Verification</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                      {otpSent ? (
                        <>Enter the 6-digit code sent to <strong>{maskedEmail}</strong></>
                      ) : (
                        <>We will send a 6-digit verification code to <strong>{maskedEmail}</strong></>
                      )}
                    </p>
                  </div>

                  {!otpSent ? (
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <Button
                        type="primary"
                        icon={<Send size={16} />}
                        onClick={handleSendEmailOtp}
                        loading={sendingOtp}
                        style={{ width: '100%', height: 44, fontWeight: 600, marginBottom: 14 }}
                      >
                        Send Code to Email
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <Input.OTP
                          length={6}
                          value={emailOtp}
                          onChange={(val) => {
                            setEmailOtp(val);
                            if (val.length === 6) {
                              onVerifyEmailOtpSubmit(val);
                            }
                          }}
                          size="large"
                          autoFocus
                        />
                      </div>

                      <Button
                        type="primary"
                        size="large"
                        onClick={() => onVerifyEmailOtpSubmit()}
                        loading={verifyLoading}
                        disabled={emailOtp.length !== 6}
                        style={{ width: '100%', marginBottom: 12, height: 44, fontWeight: 600 }}
                      >
                        Verify & Continue
                      </Button>

                      <div style={{ textAlign: 'center', marginBottom: 14 }}>
                        <Button
                          type="link"
                          size="small"
                          icon={<RotateCw size={13} />}
                          disabled={countdown > 0 || sendingOtp}
                          onClick={handleSendEmailOtp}
                          style={{ color: countdown > 0 ? '#94a3b8' : '#D4AF37', fontWeight: 600, padding: 0 }}
                        >
                          {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code via email'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Option 3: Backup Code View */}
              {authMethod === 'BACKUP_CODE' && (
                <div>
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
                        margin: '0 auto 12px',
                        color: '#d97706',
                      }}
                    >
                      <KeyRound size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Recovery Code</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                      Enter one of your <strong>8-character emergency backup recovery codes</strong>.
                    </p>
                  </div>

                  <div style={{ marginBottom: 20 }}>
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

                  <Button
                    type="primary"
                    size="large"
                    onClick={() => onVerifyTOTPSubmit()}
                    loading={verifyLoading}
                    disabled={!backupCode.trim()}
                    style={{ width: '100%', marginBottom: 14, height: 44, fontWeight: 600 }}
                  >
                    Verify & Continue
                  </Button>
                </div>
              )}

              {/* Clean Footer Actions: "Try another way" & "Back to Sign In" */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <Button
                  type="link"
                  onClick={openTryAnotherWay}
                  style={{ color: '#D4AF37', fontWeight: 600, fontSize: 13, padding: 0 }}
                >
                  Try another way
                </Button>

                <Button
                  type="link"
                  icon={<ArrowLeft size={13} />}
                  onClick={() => setStep('CREDENTIALS')}
                  style={{ color: '#64748b', fontSize: 12, padding: 0, marginTop: 4 }}
                >
                  Back to Sign In
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
