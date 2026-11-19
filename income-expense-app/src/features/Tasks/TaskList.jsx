import { useState, useEffect, useMemo } from 'react';
import { Typography, Button, Table, Space, Card, Modal, message, Tag, Select, Grid, Avatar, Tooltip, Dropdown, Pagination } from 'antd';
import { Plus, Edit, Trash2, NotebookText, Eye, RotateCcw, ChevronDown, CalendarDays, MapPin, UserRound, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTasks, useDeleteTask, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useClients } from '../../hooks/useClients';
import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import useAuthStore from '../../store/authStore';
import AddTaskModal from './AddTaskModal';
import EditTaskModal from './EditTaskModal';
import { MobileListSkeleton, TableLoadingSkeleton } from '../../components/skeletons';
import EmptyState from '../../components/EmptyState';
import OfficePageHeader from '../../components/office/OfficePageHeader';
import OfficeToolbar from '../../components/office/OfficeToolbar';
import OfficeFilterSheet from '../../components/office/OfficeFilterSheet';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function TaskList() {
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [mobilePage, setMobilePage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setMobilePage(1);
  }, [statusFilter, clientFilter, docTypeFilter, monthFilter, searchText]);

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
    const query = searchText.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (clientFilter && t.clientId !== clientFilter) return false;
      if (docTypeFilter && t.documentType !== docTypeFilter) return false;
      if (monthFilter) {
        const taskMonth = dayjs(t.startDate).format('YYYY-MM');
        if (taskMonth !== monthFilter) return false;
      }
      if (query) {
        const haystack = [
          t.documentType,
          t.client?.name,
          t.clientName,
          t.referenceName,
          t.place,
          t.rrNumber,
        ]
          .filter((value) => value !== null && value !== undefined && value !== '')
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, clientFilter, docTypeFilter, monthFilter, searchText]);

  const hasActiveFilters = Boolean(statusFilter || clientFilter || docTypeFilter || monthFilter);

  const statusLabels = { ACTIVE: 'Active', IN_PROGRESS: 'In Progress', DONE: 'Done' };

  const activeFilters = [
    monthFilter && {
      key: 'month',
      label: monthOptions.find((option) => option.value === monthFilter)?.label || monthFilter,
    },
    clientFilter && {
      key: 'client',
      label: clientOptions.find((option) => option.value === clientFilter)?.label || 'Client',
    },
    docTypeFilter && { key: 'docType', label: docTypeFilter },
    statusFilter && { key: 'status', label: statusLabels[statusFilter] || statusFilter },
  ].filter(Boolean);

  const handleResetFilters = () => {
    setStatusFilter('');
    setClientFilter('');
    setDocTypeFilter('');
    setMonthFilter('');
  };

  const handleRemoveFilter = (key) => {
    if (key === 'month') setMonthFilter('');
    if (key === 'client') setClientFilter('');
    if (key === 'docType') setDocTypeFilter('');
    if (key === 'status') setStatusFilter('');
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
      title: 'Appt. Date & Time',
      dataIndex: 'appointmentDate',
      width: 165,
      key: 'appointmentDate',
      align: 'center',
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY hh:mm A') : '-'),
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

  const MOBILE_PAGE_SIZE = 10;
  const pagedTasks = (displayTasks || []).slice(
    (mobilePage - 1) * MOBILE_PAGE_SIZE,
    mobilePage * MOBILE_PAGE_SIZE
  );

  const taskMobileList = (
    <div className="adv-mobile-list">
      {isLoading ? (
        <MobileListSkeleton count={6} />
      ) : displayTasks.length === 0 ? (
        <EmptyState
          icon={NotebookText}
          title="No tasks found"
          description="Try adjusting your search or filter criteria."
        />
      ) : (
        <>
          {pagedTasks.map((record) => {
            const status = getStatusConfig(record.status);
            const clientName = record.client?.name || record.clientName || '-';
            const initials = clientName !== '-'
              ? clientName.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().substring(0, 2)
              : 'C';

            return (
              <div
                key={record.id}
                className="adv-mobile-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/app/tasks/${record.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/app/tasks/${record.id}`);
                  }
                }}
              >
                <div className="adv-mobile-card-main">
                  <span className="adv-mobile-avatar">
                    <NotebookText size={18} />
                  </span>
                  <div className="adv-mobile-copy">
                    <div className="adv-mobile-title-row">
                      <span className="adv-mobile-title">{record.documentType}</span>
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
                        }}
                      >
                        {status.label}
                      </Tag>
                    </div>

                    <div className="adv-mobile-meta adv-mobile-meta--icon">
                      <UserRound size={13} />
                      <span>
                        {record.client?.id ? (
                          <a
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/app/clients/${record.client.id}`);
                            }}
                          >
                            {clientName}
                          </a>
                        ) : (
                          clientName
                        )}
                      </span>
                    </div>

                    <div className="adv-mobile-meta adv-mobile-meta--icon">
                      <CalendarDays size={13} />
                      <span>
                        {dayjs(record.startDate).format('DD/MM/YYYY')}
                        {record.place ? (
                          <>
                            <MapPin size={12} style={{ margin: '0 3px 0 8px', verticalAlign: -2 }} />
                            {record.place}
                          </>
                        ) : null}
                      </span>
                    </div>

                    {record.appointmentDate ? (
                      <div className="adv-mobile-meta adv-mobile-meta--icon">
                        <CalendarDays size={13} />
                        <span>Appointment: {dayjs(record.appointmentDate).format('DD/MM/YYYY hh:mm A')}</span>
                      </div>
                    ) : null}

                    <div className="adv-mobile-tags">
                      {record.referenceName ? <Tag style={{ margin: 0 }}>Ref: {record.referenceName}</Tag> : null}
                      {record.rrNumber != null ? <Tag style={{ margin: 0 }}>RR No: {record.rrNumber}</Tag> : null}
                    </div>
                  </div>
                  <ChevronRight className="adv-mobile-chevron" size={18} />
                </div>

                <div className="adv-mobile-actions" onClick={(event) => event.stopPropagation()}>
                  <Button
                    size="small"
                    type="text"
                    icon={<Eye size={15} />}
                    onClick={() => navigate(`/app/tasks/${record.id}`)}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    icon={<Edit size={15} />}
                    onClick={() => setEditingTask(record)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<Trash2 size={15} />}
                    onClick={() => handleDelete(record.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
          {displayTasks.length > MOBILE_PAGE_SIZE ? (
            <Pagination
              size="small"
              align="center"
              current={mobilePage}
              pageSize={MOBILE_PAGE_SIZE}
              total={displayTasks.length}
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
        title="Tasks"
        subtitle={`${displayTasks.length} ${displayTasks.length === 1 ? 'task' : 'tasks'}${
          hasActiveFilters || searchText.trim() ? ' matching' : ' in this view'
        }`}
        icon={NotebookText}
        actions={
          <Button
            type="primary"
            icon={<Plus size={15} />}
            onClick={() => setIsAddModalVisible(true)}
          >
            Add task
          </Button>
        }
      />

      <OfficeToolbar
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search tasks, clients, reference…"
        filters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onOpenFilters={() => setFiltersOpen(true)}
        onClearFilters={hasActiveFilters ? handleResetFilters : undefined}
      />

      {isMobile ? (
        taskMobileList
      ) : (
        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
          <Table
            className="modern-dashboard-table"
            columns={columns}
            dataSource={isLoading ? [] : displayTasks}
            rowKey="id"
            tableLayout="fixed"
            loading={false}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1435, y: 'calc(100vh - 259px)' }}
            size="small"
            locale={{
              emptyText: isLoading ? (
                <TableLoadingSkeleton rows={8} columns={9} />
              ) : (
                <EmptyState
                  icon={NotebookText}
                  title="No tasks found"
                  description="Try adjusting your search or filter criteria."
                />
              )
            }}
          />
        </Card>
      )}

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

      <OfficeFilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onReset={handleResetFilters}
        title="Filter tasks"
      >
        <div className="office-sheet-field">
          <label>Month</label>
          <Select
            aria-label="Filter by month"
            placeholder="All months"
            allowClear
            value={monthFilter || undefined}
            onChange={(val) => setMonthFilter(val || '')}
            options={monthOptions}
          />
        </div>
        <div className="office-sheet-field">
          <label>Client</label>
          <Select
            aria-label="Filter by client"
            placeholder="All clients"
            allowClear
            showSearch
            optionFilterProp="label"
            value={clientFilter || undefined}
            onChange={(val) => setClientFilter(val || '')}
            options={clientOptions}
            loading={clientsLoading}
          />
        </div>
        <div className="office-sheet-field">
          <label>Document type</label>
          <Select
            aria-label="Filter by document type"
            placeholder="All document types"
            allowClear
            showSearch
            optionFilterProp="label"
            value={docTypeFilter || undefined}
            onChange={(val) => setDocTypeFilter(val || '')}
            options={docTypeOptions}
            loading={docTypesLoading}
          />
        </div>
        <div className="office-sheet-field">
          <label>Status</label>
          <Select
            aria-label="Filter by status"
            placeholder="All statuses"
            allowClear
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            options={[
              { label: 'Active', value: 'ACTIVE' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Done', value: 'DONE' },
            ]}
          />
        </div>
      </OfficeFilterSheet>
    </div>
  );
}
