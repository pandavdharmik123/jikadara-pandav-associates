import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const { Title, Text } = Typography;

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
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f5f7fa',
      padding: '20px'
    }}>
      <Card
        className="glass-panel"
        style={{ width: 100, maxWidth: 400, width: '100%', borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 60, marginBottom: 16 }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
            JIKADARA & PANDAV ASSOCIATES
          </Title>
          <Text type="secondary">Advocate and Legal Consultants</Text>
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
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading}>
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
