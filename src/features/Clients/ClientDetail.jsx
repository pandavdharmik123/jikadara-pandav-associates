import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Tag, Table, Space, Avatar, Grid } from 'antd';
import { ArrowLeft, Plus, Phone, User as UserIcon, Calendar, NotebookText, Eye } from 'lucide-react';
import { useClient } from '../../hooks/useClients';
import dayjs from 'dayjs';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import AddTaskModal from '../Tasks/AddTaskModal';
import { formatCurrency } from '../../utils/currency';
import useAuthStore from '../../store/authStore';

const { Title, Text } = Typography;

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeFinancialYear } = useAuthStore();
  const { data: client, isLoading } = useClient(id, activeFinancialYear?.startDate, activeFinancialYear?.endDate);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  if (isLoading) {
    return <Loader />;
  }

  if (!client) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Client not found</div>;
  }

  const initials = client.name ? client.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'C';

  const columns = [
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Document Type',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (text, record) => (
        <Space size="small">
          <NotebookText size={16} style={{ color: '#64748b' }} />
          <a onClick={() => navigate(`/app/tasks/${record.id}`)} style={{ fontWeight: 600, color: '#0f172a' }}>{text}</a>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag style={
          status === 'ACTIVE'
            ? { backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }
            : { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }
        }>
          {status === 'ACTIVE' ? 'Active' : 'Done'}
        </Tag>
      ),
    },
    {
      title: 'Net Amount',
      dataIndex: 'netAmount',
      key: 'netAmount',
      render: (amount) => {
        const num = Number(amount);
        const color = num >= 0 ? '#16a34a' : '#dc2626';
        return <Text style={{ color, fontWeight: 600 }}>{formatCurrency(num)}</Text>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="text"
          icon={<Eye size={16} />}
          onClick={() => navigate(`/app/tasks/${record.id}`)}
          title="View Details"
        />
      ),
    },
  ];

  return (
    <div className="advocate-module">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <Space align="center" size="middle">
          <Button
            type="text"
            icon={<ArrowLeft size={20} />}
            onClick={() => navigate('/app/clients')}
          />
          <Avatar size={56} style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', fontWeight: 600, fontSize: 20 }}>
            {initials}
          </Avatar>
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>{client.name}</Title>
        </Space>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setIsAddModalVisible(true)}
          style={{ borderRadius: '8px', height: 40, boxShadow: 'none' }}
        >
          Add New Task
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="middle">
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Phone size={16} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>Mobile</Text>
              <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{client.mobileNumber || 'N/A'}</Text>
            </div>
          </Space>
        </Card>

        <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="middle">
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <UserIcon size={16} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>Reference</Text>
              <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{client.referenceName || 'N/A'}</Text>
            </div>
          </Space>
        </Card>

        <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="middle">
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Calendar size={16} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>Created</Text>
              <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{dayjs(client.createdAt).format('DD MMM YYYY')}</Text>
            </div>
          </Space>
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Tasks</Title>
      </div>

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
        <Table
          className="modern-dashboard-table"
          columns={columns}
          dataSource={client.tasks || []}
          rowKey="id"
          pagination={false}
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <EmptyState
                icon={NotebookText}
                title="No tasks yet"
                description="Add a task for this client to get started."
              />
            )
          }}
        />
      </Card>

      <AddTaskModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        initialClientId={client.id}
      />
    </div>
  );
}
