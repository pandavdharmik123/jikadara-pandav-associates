import { useState, useEffect, useMemo } from 'react';
import { Typography, Button, Table, Space, Card, Modal, message, Tag, Select, Grid, Avatar, Tooltip, Dropdown } from 'antd';
import { Plus, Edit, Trash2, NotebookText, Eye, RotateCcw, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTasks, useDeleteTask, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useClients } from '../../hooks/useClients';
import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import useAuthStore from '../../store/authStore';
import AddTaskModal from './AddTaskModal';
import EditTaskModal from './EditTaskModal';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function TaskList() {
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { activeFinancialYear } = useAuthStore();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;

  // Check if we came here from ClientDetail with a pre-selected client
  const searchParams = new URLSearchParams(location.search);
  const initialAddClient = searchParams.get('addClient');

  const [isAddModalVisible, setIsAddModalVisible] = useState(Boolean(initialAddClient));
  const [editingTask, setEditingTask] = useState(null);

  const updateStatusMutation = useUpdateTaskStatus();

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: taskId, status: newStatus });
      const label = newStatus === 'IN_PROGRESS' ? 'In Progress' : newStatus === 'DONE' ? 'Done' : 'Active';
      message.success(`Status updated to ${label}`);
    } catch (err) {
      console.error('Failed to update status:', err);
      message.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { label: 'In Progress', color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' };
      case 'DONE':
        return { label: 'Done', color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7' };
      case 'ACTIVE':
      default:
        return { label: 'Active', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' };
    }
  };

  useEffect(() => {
    if (initialAddClient) {
      // Clean up URL without reloading page
      navigate('/app/tasks', { replace: true });
    }
  }, [initialAddClient, navigate]);

  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: documentTypes, isLoading: docTypesLoading } = useDocumentTypes();

  // Determine effective date range for query based on month filter or FY
  const { effectiveStartDate, effectiveEndDate } = useMemo(() => {
    if (monthFilter) {
      const m = dayjs(`${monthFilter}-01`);
      return {
        effectiveStartDate: m.startOf('month').format('YYYY-MM-DD'),
        effectiveEndDate: m.endOf('month').format('YYYY-MM-DD'),
      };
    }
    return {
      effectiveStartDate: activeFinancialYear?.startDate || '',
      effectiveEndDate: activeFinancialYear?.endDate || '',
    };
  }, [monthFilter, activeFinancialYear]);

  const { data: tasks, isLoading } = useTasks(
    clientFilter,
    statusFilter,
    effectiveStartDate,
    effectiveEndDate,
    docTypeFilter
  );
  const deleteTaskMutation = useDeleteTask();

  // Generate month options from active financial year or current year
  const monthOptions = useMemo(() => {
    if (activeFinancialYear?.startDate && activeFinancialYear?.endDate) {
      const start = dayjs(activeFinancialYear.startDate);
      const end = dayjs(activeFinancialYear.endDate);
      const list = [];
      let cur = start.startOf('month');
      while (cur.isBefore(end) || cur.isSame(end, 'month')) {
        list.push({
          label: cur.format('MMMM YYYY'),
          value: cur.format('YYYY-MM'),
        });
        cur = cur.add(1, 'month');
      }
      return list;
    }
    const currentYear = dayjs().year();
    return Array.from({ length: 12 }, (_, i) => {
      const d = dayjs().year(currentYear).month(i);
      return {
        label: d.format('MMMM YYYY'),
        value: d.format('YYYY-MM'),
      };
    });
  }, [activeFinancialYear]);

  // Client dropdown options
  const clientOptions = useMemo(() => {
    return (clients || []).map((c) => ({
      label: `${c.name}${c.mobileNumber ? ` (${c.mobileNumber})` : ''}`,
      value: c.id,
    }));
  }, [clients]);

  // Document type options
  const docTypeOptions = useMemo(() => {
    const set = new Set();
    const list = [];
    (documentTypes || []).forEach((dt) => {
      if (dt.name && !set.has(dt.name)) {
        set.add(dt.name);
        list.push({ label: dt.name, value: dt.name });
      }
    });
    (tasks || []).forEach((t) => {
      if (t.documentType && !set.has(t.documentType)) {
        set.add(t.documentType);
        list.push({ label: t.documentType, value: t.documentType });
      }
    });
    return list;
  }, [documentTypes, tasks]);

  // Client-side filter fallback for instant response
  const displayTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (clientFilter && t.clientId !== clientFilter) return false;
      if (docTypeFilter && t.documentType !== docTypeFilter) return false;
      if (monthFilter) {
        const taskMonth = dayjs(t.startDate).format('YYYY-MM');
        if (taskMonth !== monthFilter) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, clientFilter, docTypeFilter, monthFilter]);

  const hasActiveFilters = Boolean(statusFilter || clientFilter || docTypeFilter || monthFilter);

  const handleResetFilters = () => {
    setStatusFilter('');
    setClientFilter('');
    setDocTypeFilter('');
    setMonthFilter('');
  };

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
        } catch {
          message.error('Failed to delete task');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Date',
      width: 110,
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Document Type',
      width: 180,
      dataIndex: 'documentType',
      key: 'documentType',
      render: (text, record) => (
        <Space size="small" style={{ maxWidth: '100%', overflow: 'hidden' }}>
          <NotebookText size={16} style={{ color: '#64748b', flexShrink: 0 }} />
          <a
            onClick={() => navigate(`/app/tasks/${record.id}`)}
            style={{
              fontWeight: 600,
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              maxWidth: 140,
            }}
            title={text}
          >
            {text}
          </a>
        </Space>
      ),
    },
    {
      title: 'Place',
      dataIndex: 'place',
      key: 'place',
      width: 130,
      align: 'center',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: 'Client',
      key: 'client',
      width: 240,
      render: (text, record) => {
        const clientName = record.client?.name || record.clientName || '-';
        const initials = clientName && clientName !== '-' ? clientName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'C';
        return (
          <Space size={10} style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <Avatar style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', fontWeight: 600, flexShrink: 0 }}>
              {initials}
            </Avatar>
            {record.client?.id ? (
              <a
                onClick={() => navigate(`/app/clients/${record.client.id}`)}
                style={{
                  fontWeight: 600,
                  color: '#4f46e5',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  // display: 'inline-block',
                  maxWidth: 180,
                }}
                title={clientName}
              >
                {clientName}
              </a>
            ) : (
              <span
                style={{
                  fontWeight: 600,
                  color: '#0f172a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  maxWidth: 180,
                }}
                title={clientName}
              >
                {clientName}
              </span>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Reference',
      width: 160,
      dataIndex: 'referenceName',
      key: 'referenceName',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: 'RR No.',
      dataIndex: 'rrNumber',
      key: 'rrNumber',
      width: 100,
      align: 'center',
      render: (val) => (val != null ? <span style={{ fontWeight: 600, color: '#0f172a' }}>{val}</span> : '-'),
    },
    {
      title: 'RR Date',
      dataIndex: 'rrDate',
      width: 110,
      key: 'rrDate',
      align: 'center',
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Appt. Date',
      dataIndex: 'appointmentDate',
      width: 110,
      key: 'appointmentDate',
      align: 'center',
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 125,
      align: 'center',
      render: (status, record) => {
        const config = getStatusConfig(status);
        const menuItems = [
          {
            key: 'ACTIVE',
            label: (
              <span style={{ color: '#ea580c', fontWeight: status === 'ACTIVE' ? 700 : 500 }}>
                ● Active
              </span>
            ),
          },
          {
            key: 'IN_PROGRESS',
            label: (
              <span style={{ color: '#2563eb', fontWeight: status === 'IN_PROGRESS' ? 700 : 500 }}>
                ● In Progress
              </span>
            ),
          },
          {
            key: 'DONE',
            label: (
              <span style={{ color: '#16a34a', fontWeight: status === 'DONE' ? 700 : 500 }}>
                ● Done
              </span>
            ),
          },
        ];

        return (
          <Dropdown
            menu={{
              items: menuItems,
              selectedKeys: [status || 'ACTIVE'],
              onClick: ({ key }) => {
                if (key !== status) {
                  handleStatusChange(record.id, key);
                }
              },
            }}
            trigger={['click']}
          >
            <Tag
              style={{
                cursor: 'pointer',
                backgroundColor: config.bg,
                color: config.color,
                border: `1px solid ${config.border}`,
                borderRadius: '12px',
                padding: '2px 8px',
                fontWeight: 600,
                fontSize: '12px',
                margin: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                userSelect: 'none',
              }}
              title="Click to change status"
            >
              {config.label}
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </Tag>
          </Dropdown>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center',
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
            onClick={() => setEditingTask(record)}
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

  return (
    <div className="advocate-module">
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        marginBottom: 16,
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>Tasks</Title>
        </div>
        <div style={{
          display: 'flex',
          gap: 10,
          flexDirection: isMobile ? 'column' : 'row',
          flexWrap: 'wrap',
          alignItems: isMobile ? 'stretch' : 'center'
        }}>
          <Select
            placeholder="Filter by Month"
            allowClear
            value={monthFilter || undefined}
            onChange={(val) => setMonthFilter(val || '')}
            options={monthOptions}
            style={{ width: isMobile ? '100%' : 160 }}
            className="modern-select"
          />
          <Select
            placeholder="Filter by Client"
            allowClear
            showSearch
            optionFilterProp="label"
            value={clientFilter || undefined}
            onChange={(val) => setClientFilter(val || '')}
            options={clientOptions}
            loading={clientsLoading}
            style={{ width: isMobile ? '100%' : 200 }}
            className="modern-select"
          />
          <Select
            placeholder="Filter by Document Type"
            allowClear
            showSearch
            optionFilterProp="label"
            value={docTypeFilter || undefined}
            onChange={(val) => setDocTypeFilter(val || '')}
            options={docTypeOptions}
            loading={docTypesLoading}
            style={{ width: isMobile ? '100%' : 190 }}
            className="modern-select"
          />
          <Select
            placeholder="Filter by Status"
            allowClear
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            options={[
              { label: 'Active', value: 'ACTIVE' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Done', value: 'DONE' },
            ]}
            style={{ width: isMobile ? '100%' : 140 }}
            className="modern-select"
          />
          {hasActiveFilters && (
            <Tooltip title="Reset Filters">
              <Button
                icon={<RotateCcw size={15} />}
                onClick={handleResetFilters}
                style={{ borderRadius: 8, height: 40 }}
              />
            </Tooltip>
          )}
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
          dataSource={displayTasks}
          rowKey="id"
          tableLayout="fixed"
          loading={{ spinning: isLoading, indicator: <Loader size={60} /> }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1380, y: 'calc(100vh - 259px)' }}
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
