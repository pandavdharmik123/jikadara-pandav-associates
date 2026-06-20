import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { User, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import './login.scss'; // Importing specific scoped styles

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', values);
      login(response.data.user, response.data.token);
      message.success('Login successful');
      navigate('/app/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      message.error(error.response?.data?.error || 'Login failed');
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

      {/* Right Login Panel (35%) */}
      <div className="login-panel">
        <div className="glass-login-card">
          <div className="login-header">
            <img src="/logo.png" alt="Logo" />
            <h2>Welcome Back</h2>
            <p>Access Your Legal Dashboard</p>
          </div>

          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
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
              <a href="#" style={{ color: '#D4AF37', fontWeight: 500 }}>Forgot Password?</a>
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading}>
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
