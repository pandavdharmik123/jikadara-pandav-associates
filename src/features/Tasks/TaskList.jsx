import React, { useState, useEffect } from 'react';
import { Typography, Button, Table, Space, Card, Modal, message, Tag, Select, Grid, Avatar } from 'antd';
import { Plus, Edit, Trash2, NotebookText, Eye } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTasks, useDeleteTask } from '../../hooks/useTasks';
import useAuthStore from '../../store/authStore';
import AddTaskModal from './AddTaskModal';
import EditTaskModal from './EditTaskModal';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function TaskList() {
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeFinancialYear } = useAuthStore();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;

  // Check if we came here from ClientDetail with a pre-selected client
  const searchParams = new URLSearchParams(location.search);
  const initialAddClient = searchParams.get('addClient');

  useEffect(() => {
    if (initialAddClient) {
      setIsAddModalVisible(true);
      // Clean up URL without reloading page
      navigate('/app/tasks', { replace: true });
    }
  }, [initialAddClient, navigate]);

  const { data: tasks, isLoading } = useTasks(
    '',
    statusFilter,
    activeFinancialYear?.startDate,
    activeFinancialYear?.endDate
  );
  const deleteTaskMutation = useDeleteTask();

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Task?',
      content: 'Are you sure you want to delete this task? All financial transactions will also be deleted.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteTaskMutation.mutateAsync(id);
          message.success('Task deleted');
        } catch (error) {
          message.error('Failed to delete task');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Date',
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
      )
    },
    {
      title: 'Place',
      dataIndex: 'place',
      key: 'place',
      align: 'center',
      render: (text) => text || '-',
    },
    {
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
      width: 280,
      render: (text, record) => {
        const clientName = record.client?.name || '';
        const initials = clientName ? clientName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'C';
        return (
          <Space gap={12}>
            <Avatar style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', fontWeight: 600 }}>
              {initials}
            </Avatar>
            <a onClick={() => navigate(`/app/clients/${record.client?.id}`)} style={{ fontWeight: 600, color: '#4f46e5' }}>
              {clientName}
            </a>
          </Space>
        );
      },
    },
    {
      title: 'Reference',
      dataIndex: 'referenceName',
      key: 'referenceName',
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
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<Eye size={16} />}
            onClick={() => navigate(`/app/tasks/${record.id}`)}
            title="View Details"
          />
          {record.status === 'ACTIVE' && (
            <Button
              type="text"
              icon={<Edit size={16} />}
              onClick={() => setEditingTask(record)}
              title="Edit"
            />
          )}
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

  return (
    <div className="advocate-module">
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        marginBottom: 16,
        gap: 16
      }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>Tasks</Title>
        </div>
        <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: isMobile ? '100%' : 150 }}
            onChange={(value) => setStatusFilter(value || '')}
            className="modern-select"
          >
            <Option value="ACTIVE">Active</Option>
            <Option value="DONE">Done</Option>
          </Select>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsAddModalVisible(true)}
            style={{ borderRadius: '8px', height: 40, boxShadow: 'none' }}
            block={isMobile}
          >
            Add New Task
          </Button>
        </div>
      </div>

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
        <Table
          className="modern-dashboard-table"
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={{ spinning: isLoading, indicator: <Loader size={60} /> }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800, y: 'calc(100vh - 296px)' }}
          size="small"
          locale={{
            emptyText: (
              <EmptyState
                icon={NotebookText}
                title="No tasks found"
                description="Try adjusting your search or filter criteria."
              />
            )
          }}
        />
      </Card>

      <AddTaskModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        initialClientId={initialAddClient}
      />

      {editingTask && (
        <EditTaskModal
          visible={!!editingTask}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
