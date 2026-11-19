import React, { useState } from 'react';
import { Typography, Input, Button, Table, Space, Card, Modal, message, Avatar, Grid, Tag, Pagination } from 'antd';
import { Plus, Search, Edit, Trash2, Eye, FolderOpen, ChevronRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClients, useDeleteClient } from '../../hooks/useClients';
import useAuthStore from '../../store/authStore';
import AddClientModal from './AddClientModal';
import EditClientModal from './EditClientModal';
import useDebounce from '../../hooks/useDebounce';
import { MobileListSkeleton, TableLoadingSkeleton } from '../../components/skeletons';
import EmptyState from '../../components/EmptyState';
import OfficePageHeader from '../../components/office/OfficePageHeader';
import OfficeToolbar from '../../components/office/OfficeToolbar';

const { Title, Text } = Typography;

export default function ClientList() {
  const [searchText, setSearchText] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [mobilePage, setMobilePage] = useState(1);

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

  const clientRows = clients || [];
  const MOBILE_PAGE_SIZE = 10;
  const pagedClients = clientRows.slice(
    (mobilePage - 1) * MOBILE_PAGE_SIZE,
    mobilePage * MOBILE_PAGE_SIZE
  );

  const getInitials = (name) =>
    name
      ? name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().substring(0, 2)
      : 'C';

  const clientMobileList = (
    <div className="adv-mobile-list">
      {isLoading ? (
        <MobileListSkeleton count={6} />
      ) : clientRows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No clients found"
          description="Try adjusting your search or filter criteria."
        />
      ) : (
        <>
          {pagedClients.map((client) => {
            const activeCount = client.tasks?.filter((t) => t.status === 'ACTIVE').length || 0;
            const totalCount = client.tasks?.length || 0;

            return (
              <div
                key={client.id}
                className="adv-mobile-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/app/clients/${client.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/app/clients/${client.id}`);
                  }
                }}
              >
                <div className="adv-mobile-card-main">
                  <span className="adv-mobile-avatar">{getInitials(client.name)}</span>
                  <div className="adv-mobile-copy">
                    <div className="adv-mobile-title">{client.name}</div>
                    <div className="adv-mobile-meta">
                      {client.mobileNumber || 'No mobile number'}
                    </div>
                    {client.referenceName ? (
                      <div className="adv-mobile-meta">Reference: {client.referenceName}</div>
                    ) : null}
                    <div className="adv-mobile-tags">
                      <Tag color="blue" style={{ margin: 0 }}>{activeCount} active</Tag>
                      <Tag style={{ margin: 0 }}>
                        {totalCount} {totalCount === 1 ? 'task' : 'tasks'}
                      </Tag>
                    </div>
                  </div>
                  <ChevronRight className="adv-mobile-chevron" size={18} />
                </div>
                <div className="adv-mobile-actions" onClick={(event) => event.stopPropagation()}>
                  <Button
                    size="small"
                    type="text"
                    icon={<Edit size={15} />}
                    onClick={() => setEditingClient(client)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<Trash2 size={15} />}
                    onClick={() => handleDelete(client.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
          {clientRows.length > MOBILE_PAGE_SIZE ? (
            <Pagination
              size="small"
              align="center"
              current={mobilePage}
              pageSize={MOBILE_PAGE_SIZE}
              total={clientRows.length}
              showSizeChanger={false}
              onChange={setMobilePage}
              style={{ marginTop: 14 }}
            />
          ) : null}
        </>
      )}
    </div>
  );

  return (
    <div className="advocate-module office-page">
      <OfficePageHeader
        title="Clients"
        subtitle={`${clientRows.length} ${clientRows.length === 1 ? 'client' : 'clients'}${searchText.trim() ? ' matching your search' : ' in the office'}`}
        icon={Users}
        actions={
          <Button
            type="primary"
            icon={<Plus size={15} />}
            onClick={() => setIsAddModalVisible(true)}
          >
            Add client
          </Button>
        }
      />

      <OfficeToolbar
        searchValue={searchText}
        onSearchChange={(value) => {
          setSearchText(value);
          setMobilePage(1);
        }}
        searchPlaceholder="Search by name or mobile…"
      />

      {isMobile ? (
        clientMobileList
      ) : (
        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
          <Table
            className="modern-dashboard-table"
            columns={columns}
            dataSource={isLoading ? [] : clients}
            rowKey="id"
            loading={false}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800, y: 'calc(100vh - 296px)' }}
            size="small"
            locale={{
              emptyText: isLoading ? (
                <TableLoadingSkeleton rows={8} columns={6} />
              ) : (
                <EmptyState
                  icon={FolderOpen}
                  title="No clients found"
                  description="Try adjusting your search or filter criteria."
                />
              )
            }}
          />
        </Card>
      )}

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
