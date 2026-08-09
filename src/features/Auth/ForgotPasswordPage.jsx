import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './login.scss';

const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        email: values.email,
        newPassword: values.newPassword,
      });
      message.success(response.data.message || 'Password updated successfully!');
      navigate('/login');
    } catch (error) {
      console.error('Forgot password error:', error);
      message.error(error.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
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

      {/* Right Reset Password Panel (35%) */}
      <div className="login-panel">
        <div className="glass-login-card">
          <div className="login-header">
            <img src="/logo.png" alt="Logo" />
            <h2>Reset Password</h2>
            <p>Update password for your registered email</p>
          </div>

          <Form
            name="forgot_password"
            onFinish={onFinish}
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="email"
              label="Registered Email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email address!' },
              ]}
            >
              <Input prefix={<Mail size={16} style={{ color: '#bfbfbf' }} />} placeholder="Email Address" />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: 'Please input your new password!' },
                { min: 6, message: 'Password must be at least 6 characters long!' },
              ]}
              hasFeedback
            >
              <Input.Password prefix={<Lock size={16} style={{ color: '#bfbfbf' }} />} placeholder="New Password" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['newPassword']}
              hasFeedback
              rules={[
                { required: true, message: 'Please confirm your new password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<Lock size={16} style={{ color: '#bfbfbf' }} />} placeholder="Confirm New Password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 16 }}>
              <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading}>
                Update Password
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#D4AF37', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
