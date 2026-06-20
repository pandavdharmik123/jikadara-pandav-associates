import React, { useState, useEffect } from 'react';
import { Typography, Button, Table, Space, Card, Modal, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTasks, useDeleteTask } from '../../hooks/useTasks';
import useAuthStore from '../../store/authStore';
import AddTaskModal from './AddTaskModal';
import EditTaskModal from './EditTaskModal';
import Loader from '../../components/Loader';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function TaskList() {
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

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

  const { data: tasks, isLoading } = useTasks('', statusFilter);
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
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text, record) => (
        <a onClick={() => navigate(`/app/clients/${record.client?.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Document',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (text, record) => (
        <a onClick={() => navigate(`/app/tasks/${record.id}`)} style={{ fontWeight: 600 }}>{text}</a>
      )
    },
    {
      title: 'Reference',
      dataIndex: 'referenceName',
      key: 'referenceName',
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
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<FileTextOutlined />}
            onClick={() => navigate(`/app/tasks/${record.id}`)}
            title="View Details"
          />
          {record.status === 'ACTIVE' && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => setEditingTask(record)}
              title="Edit"
            />
          )}
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

  return (
    <div className="advocate-module">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Tasks</Title>
          {/* <Text type="secondary" style={{ fontSize: '13px' }}>Manage all tasks for your clients</Text> */}
        </div>
        <Space>
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => setStatusFilter(value || '')}
            size="middle"
            variant="filled"
          >
            <Option value="ACTIVE">Active</Option>
            <Option value="DONE">Done</Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="middle"
            onClick={() => setIsAddModalVisible(true)}
          >
            Add New Task
          </Button>
        </Space>
      </div>

      <Card className="glass-panel" bordered={false} styles={{ body: { padding: 0 } }}>
        <Table
          className="full-height-table"
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={{ spinning: isLoading, indicator: <Loader size={60} /> }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800, y: 'calc(100vh - 270px)' }}
          size="small"
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
