import { useState } from 'react';
import { Alert, Button, Form, Input, message } from 'antd';
import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { getErrorMessage } from '../../lib/errors';
import { COMPANY_NAME, COMPANY_TAGLINE } from '../../lib/config';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);

  const [step, setStep] = useState('CREDENTIALS');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');

  const redirectTo = location.state?.from || '/';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleCredentials = async (values) => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', {
        email: values.email.trim(),
        password: values.password,
      });

      if (data.require2FA) {
        setTempToken(data.tempToken);
        setMaskedEmail(data.user?.maskedEmail || data.user?.email || values.email);
        setStep('2FA');
        setCode('');
        message.info('Two-factor authentication is required.');
        return;
      }

      login(data.user, data.token, data.refreshToken);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    if (!code.trim()) {
      setError('Enter your 6-digit authenticator code or a backup code.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const { data } = await api.post('/auth/2fa/verify-login', {
        tempToken,
        code: code.trim(),
      });

      login(data.user, data.token, data.refreshToken);
      message.success('Login verified.');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not verify that code.'));
    } finally {
      setVerifying(false);
    }
  };

  const backToCredentials = () => {
    setStep('CREDENTIALS');
    setTempToken('');
    setCode('');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-brand">
          <img className="login-logo" src="/logo-icon.png" alt={`${COMPANY_NAME} logo`} />
          <h1 className="login-title">{COMPANY_NAME}</h1>
          <p className="login-subtitle">{COMPANY_TAGLINE}</p>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 16, borderRadius: 12 }}
          />
        ) : null}

        {step === 'CREDENTIALS' ? (
          <Form layout="vertical" onFinish={handleCredentials} requiredMark={false} autoComplete="on">
            <Form.Item
              name="email"
              label="Email address"
              rules={[
                { required: true, message: 'Enter your email address' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input
                size="large"
                prefix={<Mail size={16} color="#94a3b8" />}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Enter your password' }]}
            >
              <Input.Password
                size="large"
                prefix={<Lock size={16} color="#94a3b8" />}
                placeholder="Your existing website password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<ShieldCheck size={18} />}
              style={{ height: 48, borderRadius: 14, fontWeight: 800, marginTop: 4 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Form>
        ) : (
          <form onSubmit={handleVerify}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: '#eef2ff',
                border: '1px solid #e0e7ff',
                marginBottom: 16,
              }}
            >
              <KeyRound size={20} color="#4f46e5" />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#312e81' }}>
                  Two-factor verification
                </div>
                <div style={{ fontSize: 11, color: '#4f46e5' }}>
                  Code for {maskedEmail || 'your account'}
                </div>
              </div>
            </div>

            <label
              htmlFor="two-factor-code"
              style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}
            >
              Authenticator or backup code
            </label>
            <Input
              id="two-factor-code"
              size="large"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="6-digit code"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={10}
              autoFocus
              style={{ marginBottom: 14 }}
            />

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={verifying}
              style={{ height: 48, borderRadius: 14, fontWeight: 800 }}
            >
              {verifying ? 'Verifying…' : 'Verify and continue'}
            </Button>

            <Button
              type="text"
              block
              icon={<ArrowLeft size={16} />}
              onClick={backToCredentials}
              style={{ marginTop: 8, fontWeight: 700 }}
            >
              Back to sign in
            </Button>
          </form>
        )}

        <p className="login-note">
          Use your existing Jikadara &amp; Pandav Associates credentials. There is no separate
          registration for this app.
        </p>
      </div>
    </div>
  );
}
