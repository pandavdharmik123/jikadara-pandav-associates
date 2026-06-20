import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Spin, Tag, Descriptions, Table, Space } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useClient } from '../../hooks/useClients';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  if (!client) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Client not found</div>;
  }

  const columns = [
    {
      title: 'Document Type',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
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
    },
    {
      title: 'Transactions',
      key: 'transactions',
      render: (_, record) => record._count?.transactions || 0,
    },
    {
      title: 'Net Amount',
      dataIndex: 'netAmount',
      key: 'netAmount',
      render: (amount, record) => {
        const color = amount >= 0 ? 'success' : 'danger';
        return <Text type={color}>₹{Number(amount).toFixed(2)}</Text>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => navigate(`/app/tasks/${record.id}`)}>
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="advocate-module">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Space align="center" size="middle">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/app/clients')}
            style={{ fontSize: 16 }}
          />
          <Title level={3} style={{ margin: 0 }}>{client.name}</Title>
        </Space>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => navigate(`/app/tasks?addClient=${client.id}`)}
        >
          Add New Task
        </Button>
      </div>

      <Card className="glass-panel" bordered={false} style={{ marginBottom: 24 }}>
        <Descriptions column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
          <Descriptions.Item label="Mobile">{client.mobileNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Reference">{client.referenceName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Created">{dayjs(client.createdAt).format('DD/MM/YYYY')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Tasks</Title>
      </div>

      <Card className="glass-panel" bordered={false} styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={client.tasks || []}
          rowKey="id"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}
