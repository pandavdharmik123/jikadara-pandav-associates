import React, { useState } from 'react';
import { Typography, Input, Button, Table, Space, Card, Modal, message, Avatar, Grid, Tag } from 'antd';
import { Plus, Search, Edit, Trash2, Eye, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClients, useDeleteClient } from '../../hooks/useClients';
import useAuthStore from '../../store/authStore';
import AddClientModal from './AddClientModal';
import EditClientModal from './EditClientModal';
import useDebounce from '../../hooks/useDebounce';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

const { Title, Text } = Typography;

export default function ClientList() {
  const [searchText, setSearchText] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const navigate = useNavigate();
  const { user, activeFinancialYear } = useAuthStore();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;

  const debouncedSearchText = useDebounce(searchText, 500);
  const { data: clients, isLoading } = useClients(debouncedSearchText, activeFinancialYear?.startDate, activeFinancialYear?.endDate);
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
      render: (text, record) => {
        const initials = text ? text.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'C';
        return (
          <Space gap={12}>
            <Avatar style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', fontWeight: 600 }}>
              {initials}
            </Avatar>
            <a onClick={() => navigate(`/app/clients/${record.id}`)} style={{ fontWeight: 600, color: '#4f46e5' }}>
              {text}
            </a>
          </Space>
        );
      },
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
      render: (_, record) => {
        const activeCount = record.tasks?.filter(t => t.status === 'ACTIVE').length || 0;
        const doneCount = record.tasks?.filter(t => t.status === 'DONE').length || 0;

        if (activeCount === 0 && doneCount === 0) {
          return (
            <Tag style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }}>
              No Tasks
            </Tag>
          );
        }

        return (
          <Space size="small" wrap style={{ gap: '8px' }}>
            {activeCount > 0 && (
              <Tag style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }}>
                {activeCount} Pending
              </Tag>
            )}
            {doneCount > 0 && (
              <Tag style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }}>
                {doneCount} Done
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<Eye size={16} />}
            onClick={() => navigate(`/app/clients/${record.id}`)}
            title="View Tasks"
          />
          <Button
            type="text"
            icon={<Edit size={16} />}
            onClick={() => setEditingClient(record)}
            title="Edit"
          />
          <Button
            type="text"
            danger
            icon={<Trash2 size={16} />}
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
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        marginBottom: 20, 
        gap: 16 
      }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>Clients</Title>
        </div>
        <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          <Input
            placeholder="Search by name, mobile..."
            prefix={<Search size={16} style={{ color: 'rgba(0,0,0,.25)' }} />}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 300, borderRadius: '8px', backgroundColor: '#f1f5f9', border: 'none', padding: '8px 16px' }}
          />
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsAddModalVisible(true)}
            style={{ borderRadius: '8px', height: 40, boxShadow: 'none' }}
            block={isMobile}
          >
            Add New Client
          </Button>
        </div>
      </div>

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
        <Table
          className="modern-dashboard-table"
          columns={columns}
          dataSource={clients}
          rowKey="id"
          loading={{ spinning: isLoading, indicator: <Loader size={60} /> }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800, y: 'calc(100vh - 296px)' }}
          size="small"
          locale={{
            emptyText: (
              <EmptyState 
                icon={FolderOpen} 
                title="No clients found" 
                description="Try adjusting your search or filter criteria." 
              />
            )
          }}
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
