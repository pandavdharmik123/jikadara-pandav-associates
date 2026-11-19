import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Tag, Table, Space, Avatar, Modal, message, Grid } from 'antd';
import { ArrowLeft, Plus, Phone, User as UserIcon, Calendar, NotebookText, Eye, Edit, Trash2 } from 'lucide-react';
import { useClient } from '../../hooks/useClients';
import { useDeleteTask } from '../../hooks/useTasks';
import dayjs from 'dayjs';
import { DetailSkeleton } from '../../components/skeletons';
import EmptyState from '../../components/EmptyState';
import AddTaskModal from '../Tasks/AddTaskModal';
import EditTaskModal from '../Tasks/EditTaskModal';
import { formatCurrency } from '../../utils/currency';
import useAuthStore from '../../store/authStore';

const { Title, Text } = Typography;

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const { user, activeFinancialYear } = useAuthStore();
  const { data: client, isLoading } = useClient(id, activeFinancialYear?.startDate, activeFinancialYear?.endDate);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          bg: '#eff6ff',
          color: '#2563eb',
          border: '#dbeafe',
        };
      case 'DONE':
        return {
          label: 'Done',
          bg: '#f0fdf4',
          color: '#16a34a',
          border: '#dcfce7',
        };
      case 'ACTIVE':
      default:
        return {
          label: 'Active',
          bg: '#fff7ed',
          color: '#ea580c',
          border: '#ffedd5',
        };
    }
  };

  const deleteTaskMutation = useDeleteTask();

  const handleDeleteTask = (taskId) => {
    Modal.confirm({
      title: 'Delete Task?',
      content: 'Are you sure you want to delete this task? All financial transactions will also be moved to the Recycle Bin.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteTaskMutation.mutateAsync(taskId);
          message.success('Task moved to Recycle Bin');
        } catch (error) {
          message.error('Failed to delete task');
        }
      },
    });
  };

  if (isLoading) {
    return <DetailSkeleton />;
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
      title: 'Place',
      dataIndex: 'place',
      key: 'place',
      render: (text) => text || '-',
    },
    {
      title: 'Reference',
      dataIndex: 'referenceName',
      key: 'referenceName',
      render: (text) => text || '-',
    },
    {
      title: 'RR No.',
      dataIndex: 'rrNumber',
      key: 'rrNumber',
      align: 'center',
      render: (val) => (val != null ? <span style={{ fontWeight: 600, color: '#0f172a' }}>{val}</span> : '-'),
    },
    {
      title: 'RR Date',
      dataIndex: 'rrDate',
      key: 'rrDate',
      align: 'center',
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Appt. Date & Time',
      dataIndex: 'appointmentDate',
      key: 'appointmentDate',
      align: 'center',
      width: 165,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY hh:mm A') : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => {
        if (status === 'IN_PROGRESS') {
          return (
            <Tag style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }}>
              In Progress
            </Tag>
          );
        }
        if (status === 'DONE') {
          return (
            <Tag style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }}>
              Done
            </Tag>
          );
        }
        return (
          <Tag style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }}>
            Active
          </Tag>
        );
      },
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
      width: 140,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<Eye size={16} />}
            onClick={() => navigate(`/app/tasks/${record.id}`)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<Edit size={16} />}
            onClick={() => setEditingTask({ ...record, client: { name: client.name, id: client.id } })}
            title="Edit Task"
          />
          <Button
            type="text"
            danger
            icon={<Trash2 size={16} />}
            onClick={() => handleDeleteTask(record.id)}
            title="Delete Task"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="advocate-module">
      <div className="office-header" style={{ marginBottom: 18 }}>
        <div className="office-header-main" style={{ alignItems: 'center' }}>
          <button
            type="button"
            className="office-back-button"
            onClick={() => navigate('/app/clients')}
            aria-label="Back to Clients"
          >
            <ArrowLeft size={19} strokeWidth={2.2} />
          </button>
          <Avatar
            size={isMobile ? 42 : 48}
            style={{
              backgroundColor: '#e0e7ff',
              color: '#4f46e5',
              fontWeight: 700,
              fontSize: isMobile ? 16 : 18,
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.15)',
            }}
          >
            {initials}
          </Avatar>
          <div className="office-header-copy" style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}
            >
              {client.name}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              Client Details &bull; {client.tasks?.length || 0} Task{client.tasks?.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="office-header-actions" style={{ marginTop: isMobile ? 4 : 0 }}>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsAddModalVisible(true)}
            style={{
              borderRadius: 10,
              height: 38,
              fontWeight: 600,
              boxShadow: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            Add New Task
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <Card
          bordered={false}
          style={{ borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}
          styles={{ body: { padding: '12px 14px' } }}
        >
          <Space align="center" size="small">
            <div
              style={{
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: '9px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <Phone size={16} />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>
                Mobile
              </Text>
              {client.mobileNumber ? (
                <a
                  href={`tel:${client.mobileNumber}`}
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#2563eb',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {client.mobileNumber}
                </a>
              ) : (
                <Text strong style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  N/A
                </Text>
              )}
            </div>
          </Space>
        </Card>

        <Card
          bordered={false}
          style={{ borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}
          styles={{ body: { padding: '12px 14px' } }}
        >
          <Space align="center" size="small">
            <div
              style={{
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: '9px',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <Calendar size={16} />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>
                Created
              </Text>
              <Text strong style={{ fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', display: 'block' }}>
                {dayjs(client.createdAt).format('DD MMM YYYY')}
              </Text>
            </div>
          </Space>
        </Card>

        <Card
          bordered={false}
          style={{
            borderRadius: 12,
            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
            gridColumn: isMobile ? '1 / -1' : 'auto',
          }}
          styles={{ body: { padding: '12px 14px' } }}
        >
          <Space align="center" size="small">
            <div
              style={{
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: '9px',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <UserIcon size={16} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>
                Reference
              </Text>
              <Text strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>
                {client.referenceName || 'Self / Direct'}
              </Text>
            </div>
          </Space>
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Space align="center" size="small">
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: 16 }}>
            Tasks
          </Title>
          <Tag style={{ borderRadius: 10, fontWeight: 600, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontSize: 11 }}>
            {client.tasks?.length || 0}
          </Tag>
        </Space>
      </div>

      {isMobile ? (
        client.tasks && client.tasks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {client.tasks.map((task) => {
              const status = getStatusConfig(task.status);
              const net = Number(task.netAmount) || 0;
              return (
                <div
                  key={task.id}
                  className="adv-mobile-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/app/tasks/${task.id}`)}
                  style={{ cursor: 'pointer', margin: 0 }}
                >
                  <div className="adv-mobile-card-main">
                    <span className="adv-mobile-avatar">
                      <NotebookText size={18} />
                    </span>
                    <div className="adv-mobile-copy" style={{ minWidth: 0, flex: 1 }}>
                      <div className="adv-mobile-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span className="adv-mobile-title" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.documentType}
                        </span>
                        <Tag
                          style={{
                            margin: 0,
                            borderRadius: 12,
                            padding: '0 8px',
                            fontWeight: 600,
                            fontSize: 11,
                            backgroundColor: status.bg,
                            color: status.color,
                            border: `1px solid ${status.border}`,
                            flexShrink: 0,
                          }}
                        >
                          {status.label}
                        </Tag>
                      </div>

                      <div className="adv-mobile-meta" style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                        <span>{dayjs(task.startDate).format('DD/MM/YYYY')}</span>
                        {task.place && (
                          <span style={{ marginLeft: 6 }}>
                            • {task.place}
                          </span>
                        )}
                        {task.referenceName && (
                          <span style={{ marginLeft: 6 }}>
                            • Ref: {task.referenceName}
                          </span>
                        )}
                      </div>

                      {(task.rrNumber != null || task.appointmentDate) && (
                        <div className="adv-mobile-meta" style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>
                          {task.rrNumber != null && <span>RR: #{task.rrNumber}</span>}
                          {task.rrNumber != null && task.appointmentDate && <span> • </span>}
                          {task.appointmentDate && (
                            <span>Appt: {dayjs(task.appointmentDate).format('DD/MM/YYYY hh:mm A')}</span>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: net >= 0 ? '#16a34a' : '#dc2626' }}>
                          {formatCurrency(net)}
                        </span>
                        <Space size="small" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="text"
                            size="small"
                            icon={<Eye size={15} />}
                            onClick={() => navigate(`/app/tasks/${task.id}`)}
                            title="View"
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<Edit size={15} />}
                            onClick={() => setEditingTask({ ...task, client: { name: client.name, id: client.id } })}
                            title="Edit"
                          />
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<Trash2 size={15} />}
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete"
                          />
                        </Space>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={NotebookText}
            title="No tasks yet"
            description="Add a task for this client to get started."
          />
        )
      ) : (
        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
          <Table
            className="modern-dashboard-table"
            columns={columns}
            dataSource={client.tasks || []}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1060 }}
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
      )}

      <AddTaskModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        initialClientId={client.id}
      />

      <EditTaskModal
        visible={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
      />
    </div>
  );
}
