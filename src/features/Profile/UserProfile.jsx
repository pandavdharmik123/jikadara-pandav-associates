import React from 'react';
import { Card, Typography, Avatar, Descriptions, Tag, Row, Col, Space } from 'antd';
import { User, Mail, ShieldCheck, Calendar } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function UserProfile() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="advocate-module">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2}>My Profile</Title>
          {/* <Text type="secondary">View your personal account details</Text> */}
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel" bordered={false} style={{ textAlign: 'center' }}>
            <Avatar
              size={120}
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.name || 'User'}&backgroundColor=e6f4ff`}
              style={{ marginBottom: 16 }}
            />
            <Title level={4} style={{ margin: 0 }}>{user?.name}</Title>
            <Text type="secondary" style={{ textTransform: 'capitalize', display: 'block', marginBottom: 16 }}>
              {user?.role?.toLowerCase() || 'Member'}
            </Text>
            <Tag color={user?.isActive ? 'success' : 'error'} style={{ padding: '4px 16px', fontSize: 14 }}>
              {user?.isActive ? 'Active Account' : 'Inactive'}
            </Tag>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card className="glass-panel" bordered={false} title="Account Information">
            <Descriptions column={{ xxl: 2, xl: 2, lg: 1, md: 1, sm: 1, xs: 1 }} layout="vertical" bordered>
              <Descriptions.Item label={<Space><User size={16} />Full Name</Space>}>
                <Text strong>{user?.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Space><Mail size={16} />Email Address</Space>}>
                <Text>{user?.email}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Space><ShieldCheck size={16} />Role / Permissions</Space>}>
                <Tag color={user?.role === 'ADMIN' ? 'red' : user?.role === 'SENIOR' ? 'blue' : 'default'}>
                  {user?.role}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={<Space><Calendar size={16} />Member Since</Space>}>
                <Text>{user?.createdAt ? dayjs(user.createdAt).format('MMMM D, YYYY') : 'N/A'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
