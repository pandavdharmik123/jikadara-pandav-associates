import React, { useState } from 'react';
import { Typography, Input, Button, Table, Space, Card, Modal, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useClients, useDeleteClient } from '../../hooks/useClients';
import useAuthStore from '../../store/authStore';
import AddClientModal from './AddClientModal';
import EditClientModal from './EditClientModal';
import useDebounce from '../../hooks/useDebounce';
import Loader from '../../components/Loader';

const { Title, Text } = Typography;

export default function ClientList() {
  const [searchText, setSearchText] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuthStore();

  const debouncedSearchText = useDebounce(searchText, 500);
  const { data: clients, isLoading } = useClients(debouncedSearchText);
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
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Clients</Title>
          {/* <Text type="secondary" style={{ fontSize: '13px' }}>Manage all your clients and their tasks</Text> */}
        </div>
        <Space>
          <Input
            placeholder="Search by name, mobile, or reference"
            prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
            size="middle"
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            variant="filled"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="middle"
            onClick={() => setIsAddModalVisible(true)}
          >
            Add New Client
          </Button>
        </Space>
      </div>

      <Card className="glass-panel" bordered={false} styles={{ body: { padding: 0 } }}>
        <Table
          className="full-height-table"
          columns={columns}
          dataSource={clients}
          rowKey="id"
          loading={{ spinning: isLoading, indicator: <Loader size={60} /> }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800, y: 'calc(100vh - 270px)' }}
          size="small"
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
