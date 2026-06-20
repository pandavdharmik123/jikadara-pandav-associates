import React from 'react';
import { Row, Col, Card, Typography, Table, Tag, Empty, Button } from 'antd';
import { Users, CheckSquare, CheckCircle, ArrowRight, ClipboardList, FolderOpen } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import { useDashboardStats, useRecentData } from '../../hooks/useReports';
import useAuthStore from '../../store/authStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recent, isLoading: recentLoading } = useRecentData();

  if (statsLoading || recentLoading) {
    return <Loader />;
  }

  const recentTasksColumns = [
    {
      title: 'CLIENT',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text) => <Text style={{ fontWeight: 600, color: '#1f2937', fontSize: '13px' }}>{text}</Text>
    },
    {
      title: 'DOCUMENT',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (text, record) => (
        <a style={{ color: '#2563eb', fontSize: '13px' }} onClick={() => navigate(`/app/tasks/${record.id}`)}>{text}</a>
      )
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      align: 'right',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'processing' : '#d1fae5'} style={{ color: status === 'ACTIVE' ? undefined : '#047857', border: 'none', borderRadius: '12px', padding: '0 10px', fontWeight: 600, fontSize: '12px' }}>
          {status === 'ACTIVE' ? 'Active' : 'Done'}
        </Tag>
      ),
    }
  ];

  const recentClientsColumns = [
    {
      title: 'NAME',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a style={{ color: '#2563eb', fontWeight: 500, fontSize: '13px' }} onClick={() => navigate(`/app/clients/${record.id}`)}>{text}</a>
      )
    },
    {
      title: 'MOBILE',
      dataIndex: 'mobileNumber',
      key: 'mobileNumber',
      render: (text) => <Text style={{ color: '#4b5563', fontSize: '13px' }}>{text}</Text>
    },
    {
      title: 'DATE',
      dataIndex: 'createdAt',
      key: 'createdAt',
      align: 'right',
      render: (date) => <Text style={{ color: '#6b7280', fontSize: '13px' }}>{dayjs(date).format('DD/MM/YYYY')}</Text>,
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>
          Dashboard
        </Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer' }} styles={{ body: { padding: '16px 20px' } }} onClick={() => navigate('/app/clients')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{stats?.totalClients || 0}</div>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>Total Clients</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer' }} styles={{ body: { padding: '16px 20px' } }} onClick={() => navigate('/app/tasks')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckSquare size={20} color="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{stats?.activeTasks || 0}</div>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>Active Tasks</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer' }} styles={{ body: { padding: '16px 20px' } }} onClick={() => navigate('/app/tasks')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={20} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{stats?.completedTasks || 0}</div>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>Completed Tasks</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={24}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '20px' } }}>
            <Title level={5} style={{ marginTop: 0, marginBottom: 16, fontWeight: 700, color: '#1e293b' }}>This Month's Completed Financials</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #10b981' }}>
                  <Text style={{ color: '#64748b', fontWeight: 500, fontSize: '12px' }}>Income</Text>
                  <Title level={3} style={{ margin: 0, color: '#10b981', fontWeight: 700 }}>{formatCurrency(stats?.monthlyIncome || 0)}</Title>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #ef4444' }}>
                  <Text style={{ color: '#64748b', fontWeight: 500, fontSize: '12px' }}>Expense</Text>
                  <Title level={3} style={{ margin: 0, color: '#ef4444', fontWeight: 700 }}>{formatCurrency(stats?.monthlyExpense || 0)}</Title>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #3b82f6' }}>
                  <Text style={{ color: '#64748b', fontWeight: 500, fontSize: '12px' }}>Net Profit</Text>
                  <Title level={3} style={{ margin: 0, color: '#3b82f6', fontWeight: 700 }}>{formatCurrency(stats?.monthlyNet || 0)}</Title>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            title={<span style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>Recent Tasks</span>}
            extra={<a onClick={() => navigate('/app/tasks')} style={{ color: '#2563eb', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View All <ArrowRight size={14} /></a>}
            style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)' }}
            styles={{ body: { padding: 0 } }}
          >
            {recent?.recentTasks?.length > 0 ? (
              <Table
                className="modern-dashboard-table"
                columns={recentTasksColumns}
                dataSource={recent.recentTasks}
                rowKey="id"
                pagination={false}
              />
            ) : (
              <EmptyState 
                icon={ClipboardList} 
                title="No tasks found" 
                description="There are no recent tasks to display."
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            title={<span style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>New Clients</span>}
            extra={<a onClick={() => navigate('/app/clients')} style={{ color: '#2563eb', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View All <ArrowRight size={14} /></a>}
            style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)' }}
            styles={{ body: { padding: 0 } }}
          >
            {recent?.recentClients?.length > 0 ? (
              <Table
                className="modern-dashboard-table"
                columns={recentClientsColumns}
                dataSource={recent.recentClients}
                rowKey="id"
                pagination={false}
              />
            ) : (
              <EmptyState 
                icon={FolderOpen} 
                title="No clients found" 
                description="There are no recent clients to display."
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
