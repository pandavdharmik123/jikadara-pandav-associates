import React, { useState } from 'react';
import { Typography, Input, Button, Table, Space, Card, Modal, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useClients, useDeleteClient } from '../../hooks/useClients';
import useAuthStore from '../../store/authStore';
import AddClientModal from './AddClientModal';
import EditClientModal from './EditClientModal';

const { Title, Text } = Typography;

export default function ClientList() {
  const [searchText, setSearchText] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const { data: clients, isLoading } = useClients(searchText);
  const deleteClientMutation = useDeleteClient();

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Client?',
      content: 'Are you sure you want to delete this client? All related tasks and transactions will also be deleted.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteClientMutation.mutateAsync(id);
          message.success('Client deleted');
        } catch (error) {
          message.error('Failed to delete client');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/app/clients/${record.id}`)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Mobile',
      dataIndex: 'mobileNumber',
      key: 'mobileNumber',
    },
    {
      title: 'Reference',
      dataIndex: 'referenceName',
      key: 'referenceName',
    },
    {
      title: 'Tasks',
      key: 'tasks',
      render: (_, record) => (
        <Text>{record._count?.tasks || 0}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<FolderOpenOutlined />} 
            onClick={() => navigate(`/app/clients/${record.id}`)}
            title="View Tasks"
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => setEditingClient(record)}
            title="Edit"
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  // Admin sees who created the client
  if (user?.role === 'ADMIN') {
    columns.splice(3, 0, {
      title: 'User',
      dataIndex: ['user', 'name'],
      key: 'user',
      render: (text) => <Text type="secondary">{text}</Text>
    });
  }

  return (
    <div className="advocate-module">
      <div className="page-header">
        <div>
          <Title level={2}>Clients</Title>
          <Text type="secondary">Manage all your clients and their tasks</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => setIsAddModalVisible(true)}
        >
          Add New Client
        </Button>
      </div>

      <Card className="glass-panel" bordered={false} style={{ marginBottom: 24 }}>
        <Input
          placeholder="Search by name, mobile, or reference"
          prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
          size="large"
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 500 }}
        />
      </Card>

      <Card className="glass-panel" bordered={false} styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={clients}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>

      <AddClientModal 
        visible={isAddModalVisible} 
        onClose={() => setIsAddModalVisible(false)} 
      />
      
      {editingClient && (
        <EditClientModal 
          visible={!!editingClient} 
          client={editingClient}
          onClose={() => setEditingClient(null)} 
        />
      )}
    </div>
  );
}
