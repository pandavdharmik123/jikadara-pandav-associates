import React from 'react';
import { Row, Col, Card, Typography, Table, Tag, Empty, Button } from 'antd';
import {
  UsergroupAddOutlined,
  CheckSquareOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import { useDashboardStats, useRecentData } from '../../hooks/useReports';
import useAuthStore from '../../store/authStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recent, isLoading: recentLoading } = useRecentData();

  const getGreeting = () => {
    const hour = dayjs().hour();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (statsLoading || recentLoading) {
    return <Loader />;
  }

  const recentTasksColumns = [
    {
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
    },
    {
      title: 'Document',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (text, record) => <a onClick={() => navigate(`/app/tasks/${record.id}`)}>{text}</a>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'processing' : 'success'}>
          {status === 'ACTIVE' ? 'Active' : 'Done'}
        </Tag>
      ),
    }
  ];

  const recentClientsColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <a onClick={() => navigate(`/app/clients/${record.id}`)}>{text}</a>
    },
    {
      title: 'Mobile',
      dataIndex: 'mobileNumber',
      key: 'mobileNumber',
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    }
  ];

  return (
    <div className="advocate-module">
      <div className="page-header">
        <div>
          <Title level={2}>{getGreeting()}, {user?.name || 'User'}!</Title>
          {/* <Text type="secondary">Summary of your tasks and clients</Text> */}
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="glass-panel stat-card" bordered={false} style={{ cursor: 'pointer' }} onClick={() => navigate('/app/clients')}>
            <div className="stat-icon" style={{ background: 'rgba(24, 144, 255, 0.1)', color: '#1890ff' }}>
              <UsergroupAddOutlined />
            </div>
            <div className="stat-content">
              <div className="stat-value" style={{ color: '#1890ff' }}>{stats?.totalClients || 0}</div>
              <div className="stat-label">Total Clients</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-panel stat-card" bordered={false} style={{ cursor: 'pointer' }} onClick={() => navigate('/app/tasks')}>
            <div className="stat-icon" style={{ background: 'rgba(250, 173, 20, 0.1)', color: '#faad14' }}>
              <CheckSquareOutlined />
            </div>
            <div className="stat-content">
              <div className="stat-value" style={{ color: '#faad14' }}>{stats?.activeTasks || 0}</div>
              <div className="stat-label">Active Tasks</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-panel stat-card" bordered={false} style={{ cursor: 'pointer' }} onClick={() => navigate('/app/tasks')}>
            <div className="stat-icon" style={{ background: 'rgba(82, 196, 26, 0.1)', color: '#52c41a' }}>
              <CheckCircleOutlined />
            </div>
            <div className="stat-content">
              <div className="stat-value" style={{ color: '#52c41a' }}>{stats?.completedTasks || 0}</div>
              <div className="stat-label">Completed Tasks</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card className="glass-panel" bordered={false}>
            <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>This Month's Completed Financials</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ padding: '16px', background: 'rgba(82, 196, 26, 0.05)', borderRadius: 8, borderLeft: '4px solid #52c41a' }}>
                  <Text type="secondary">Income</Text>
                  <Title level={3} style={{ margin: 0, color: '#52c41a' }}>₹{stats?.monthlyIncome?.toFixed(2) || '0.00'}</Title>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ padding: '16px', background: 'rgba(255, 77, 79, 0.05)', borderRadius: 8, borderLeft: '4px solid #ff4d4f' }}>
                  <Text type="secondary">Expense</Text>
                  <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>₹{stats?.monthlyExpense?.toFixed(2) || '0.00'}</Title>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ padding: '16px', background: 'rgba(24, 144, 255, 0.05)', borderRadius: 8, borderLeft: '4px solid #1890ff' }}>
                  <Text type="secondary">Net Profit</Text>
                  <Title level={3} style={{ margin: 0, color: '#1890ff' }}>₹{stats?.monthlyNet?.toFixed(2) || '0.00'}</Title>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            className="glass-panel"
            bordered={false}
            title="Recent Tasks"
            extra={<Button type="link" onClick={() => navigate('/app/tasks')}>View All <ArrowRightOutlined /></Button>}
            styles={{ body: { padding: 0 } }}
          >
            {recent?.recentTasks?.length > 0 ? (
              <Table
                columns={recentTasksColumns}
                dataSource={recent.recentTasks}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No tasks found" style={{ margin: '20px 0' }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            className="glass-panel"
            bordered={false}
            title="New Clients"
            extra={<Button type="link" onClick={() => navigate('/app/clients')}>View All <ArrowRightOutlined /></Button>}
            styles={{ body: { padding: 0 } }}
          >
            {recent?.recentClients?.length > 0 ? (
              <Table
                columns={recentClientsColumns}
                dataSource={recent.recentClients}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No clients found" style={{ margin: '20px 0' }} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
