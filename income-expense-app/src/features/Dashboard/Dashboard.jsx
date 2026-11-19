import React, { useState } from 'react';
import { Row, Col, Card, Typography, Table, Tag, Empty, Button, Tooltip, DatePicker, Dropdown, message, Grid, Segmented } from 'antd';
import { Users, CheckSquare, CheckCircle, ArrowRight, ClipboardList, FolderOpen, Eye, EyeOff, Calendar, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, NotebookText, UserRound, Wallet, TrendingUp, TrendingDown, LayoutDashboard } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useNavigate } from 'react-router-dom';
import { DashboardSkeleton } from '../../components/skeletons';
import EmptyState from '../../components/EmptyState';
import OfficePageHeader from '../../components/office/OfficePageHeader';
import OfficeStatGrid from '../../components/office/OfficeStatGrid';
import { useDashboardStats, useRecentData } from '../../hooks/useReports';
import { useGeneralExpenses } from '../../hooks/useGeneralExpenses';
import { useAppointmentTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useCurrentProfile } from '../../hooks/useUsers';
import useAuthStore from '../../store/authStore';
import usePrivacyStore from '../../store/privacyStore';
import PrivacyAmount from '../../components/PrivacyAmount';
import PinVerificationModal from '../../components/PinVerificationModal';
import SetPinModal from '../../components/SetPinModal';
import dayjs from 'dayjs';
import { toISTDateString } from '../../utils/istDate';

const { Title, Text } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const { user, activeFinancialYear } = useAuthStore();
  const { data: profile } = useCurrentProfile();
  const activeUser = profile || user;
  const [financeMode, setFinanceMode] = useState('FY');

  const { isRevealed, hide } = usePrivacyStore();
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [setPinModalVisible, setSetPinModalVisible] = useState(false);
  const [isResetPinMode, setIsResetPinMode] = useState(false);

  const [appointmentDate, setAppointmentDate] = useState(() => dayjs());
  const appointmentDateStr = appointmentDate ? appointmentDate.format('YYYY-MM-DD') : '';
  const isApptDateToday = appointmentDate ? appointmentDate.isSame(dayjs(), 'day') : false;
  const { data: appointmentTasks = [], isLoading: apptTasksLoading } = useAppointmentTasks(appointmentDateStr);
  const updateStatusMutation = useUpdateTaskStatus();

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: taskId, status: newStatus });
      const label = newStatus === 'IN_PROGRESS' ? 'In Progress' : newStatus === 'DONE' ? 'Done' : 'Active';
      message.success(`Task status updated to ${label}`);
    } catch (err) {
      console.error('Failed to update status:', err);
      message.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          color: '#2563eb',
          bg: '#eff6ff',
          border: '#dbeafe',
        };
      case 'DONE':
        return {
          label: 'Done',
          color: '#16a34a',
          bg: '#f0fdf4',
          border: '#dcfce7',
        };
      case 'ACTIVE':
      default:
        return {
          label: 'Active',
          color: '#ea580c',
          bg: '#fff7ed',
          border: '#ffedd5',
        };
    }
  };

  const fyStartDateStr = toISTDateString(activeFinancialYear?.startDate);
  const fyEndDateStr = toISTDateString(activeFinancialYear?.endDate);

  const { data: stats, isLoading: statsLoading } = useDashboardStats(fyStartDateStr, fyEndDateStr);
  const { data: recent, isLoading: recentLoading } = useRecentData(fyStartDateStr, fyEndDateStr);

  const { data: fyGeneralExpenses, isLoading: fyGeLoading } = useGeneralExpenses(
    fyStartDateStr,
    fyEndDateStr
  );

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month();
  let mStart = dayjs().year(currentYear).month(currentMonth).startOf('month');
  let mEnd = dayjs().year(currentYear).month(currentMonth).endOf('month');

  if (fyStartDateStr) {
    const fyS = dayjs(fyStartDateStr);
    if (fyS.isAfter(mStart)) mStart = fyS;
  }
  if (fyEndDateStr) {
    const fyE = dayjs(fyEndDateStr);
    if (fyE.isBefore(mEnd)) mEnd = fyE;
  }

  const isCurrentMonthInFy = !mStart.isAfter(mEnd);
  const monthlyStart = isCurrentMonthInFy ? mStart.format('YYYY-MM-DD') : '1970-01-01';
  const monthlyEnd = isCurrentMonthInFy ? mEnd.format('YYYY-MM-DD') : '1970-01-01';
  const { data: monthlyGeneralExpenses, isLoading: monthlyGeLoading } = useGeneralExpenses(monthlyStart, monthlyEnd);

  const handleToggleEye = () => {
    if (isRevealed) {
      hide();
    } else {
      if (!activeUser?.hasSecurityPin) {
        setIsResetPinMode(false);
        setSetPinModalVisible(true);
      } else {
        setVerifyModalVisible(true);
      }
    }
  };

  const handleForgotPin = () => {
    setIsResetPinMode(true);
    setSetPinModalVisible(true);
  };

  if (statsLoading || recentLoading || fyGeLoading || monthlyGeLoading) {
    return <DashboardSkeleton stats={4} />;
  }

  const fyGeTotal = (fyGeneralExpenses || []).reduce((sum, item) => sum + Number(item.amount), 0);
  const monthlyGeTotal = (monthlyGeneralExpenses || []).reduce((sum, item) => sum + Number(item.amount), 0);

  const fyTaskNet = stats?.fyNet || 0;
  const fyFinalNet = Number(fyTaskNet) - fyGeTotal;

  const monthlyTaskNet = stats?.monthlyNet || 0;
  const monthlyFinalNet = Number(monthlyTaskNet) - monthlyGeTotal;

  const recentTasksColumns = [
    {
      title: 'CLIENT',
      key: 'client',
      render: (_, record) => <Text style={{ fontWeight: 600, color: '#1f2937', fontSize: '13px' }}>{record.client?.name || record.clientName || '-'}</Text>
    },
    {
      title: 'DOCUMENT',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (text, record) => (
        <a style={{ color: '#2563eb', fontSize: '13px' }} onClick={() => navigate(`/app/tasks/${record.id}`)}>{text}</a>
      )
    },
    {
      title: 'REFERENCE',
      dataIndex: 'referenceName',
      key: 'referenceName',
      render: (text) => <Text style={{ color: '#4b5563', fontSize: '13px' }}>{text || '-'}</Text>
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      align: 'right',
      render: (status) => {
        const config = getStatusConfig(status);
        return (
          <Tag style={{
            backgroundColor: config.bg,
            color: config.color,
            border: `1px solid ${config.border}`,
            borderRadius: '12px',
            padding: '2px 10px',
            margin: 0,
            fontWeight: 600,
            fontSize: '12px',
          }}>
            {config.label}
          </Tag>
        );
      },
    }
  ];

  const recentClientsColumns = [
    {
      title: 'NAME',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a style={{ color: '#2563eb', fontWeight: 500, fontSize: '13px' }} onClick={() => navigate(`/app/clients/${record.id}`)}>{text}</a>
      )
    },
    {
      title: 'MOBILE',
      dataIndex: 'mobileNumber',
      key: 'mobileNumber',
      align: 'right',
      render: (text) => <Text style={{ color: '#4b5563', fontSize: '13px' }}>{text}</Text>
    },
  ];

  const appointmentTasksColumns = [
    {
      title: 'CLIENT',
      key: 'client',
      width: 180,
      render: (_, record) => {
        const clientName = record.client?.name || record.clientName || '-';
        return (
          <Text style={{ fontWeight: 600, color: '#1f2937', fontSize: '13px' }} title={clientName}>
            {clientName}
          </Text>
        );
      },
    },
    {
      title: 'DOCUMENT',
      dataIndex: 'documentType',
      key: 'documentType',
      width: 170,
      render: (text, record) => (
        <a
          style={{ color: '#2563eb', fontWeight: 600, fontSize: '13px' }}
          onClick={() => navigate(`/app/tasks/${record.id}`)}
          title={text}
        >
          {text}
        </a>
      ),
    },
    {
      title: 'PLACE',
      dataIndex: 'place',
      key: 'place',
      width: 130,
      render: (text) => <Text style={{ color: '#4b5563', fontSize: '13px' }}>{text || '-'}</Text>,
    },
    {
      title: 'REFERENCE',
      dataIndex: 'referenceName',
      key: 'referenceName',
      width: 140,
      render: (text) => <Text style={{ color: '#4b5563', fontSize: '13px' }}>{text || '-'}</Text>,
    },
    {
      title: 'RR NO.',
      dataIndex: 'rrNumber',
      key: 'rrNumber',
      width: 90,
      align: 'center',
      render: (val) => (val != null ? <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{val}</span> : '-'),
    },
    {
      title: 'APPOINTMENT',
      dataIndex: 'appointmentDate',
      key: 'appointmentDate',
      width: 155,
      align: 'center',
      render: (val) => (
        <Text style={{ color: '#334155', fontWeight: 500, fontSize: '12.5px', whiteSpace: 'nowrap' }}>
          {val ? dayjs(val).format('DD/MM/YYYY hh:mm A') : '-'}
        </Text>
      ),
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      width: 130,
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
      title: 'ACTION',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="View Task">
          <Button
            type="text"
            size="small"
            icon={<Eye size={15} color="#2563eb" />}
            onClick={() => navigate(`/app/tasks/${record.id}`)}
          />
        </Tooltip>
      ),
    },
  ];

  const activeFinance = financeMode === 'MONTH'
    ? { profit: monthlyTaskNet, expense: monthlyGeTotal, net: monthlyFinalNet }
    : { profit: fyTaskNet, expense: fyGeTotal, net: fyFinalNet };

  const recentTasks = recent?.recentTasks || [];
  const recentClients = recent?.recentClients || [];
  const getInitials = (name) =>
    name
      ? name.split(' ').filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2)
      : 'C';

  const apptStatusTag = (status) => {
    const statusConfig = getStatusConfig(status);
    return (
      <Tag
        style={{
          margin: 0,
          borderRadius: 10,
          padding: '0 8px',
          fontWeight: 700,
          fontSize: 10.5,
          backgroundColor: statusConfig.bg,
          color: statusConfig.color,
          border: `1px solid ${statusConfig.border}`,
        }}
      >
        {statusConfig.label}
      </Tag>
    );
  };

  return (
    <div className="advocate-module office-page">
      <OfficePageHeader
        title="Dashboard"
        subtitle={activeFinancialYear ? `Financial year ${activeFinancialYear.name}` : 'Office overview'}
        icon={LayoutDashboard}
        actions={
          <Button
            type="primary"
            icon={<CheckSquare size={15} />}
            onClick={() => navigate('/app/tasks')}
          >
            Tasks
          </Button>
        }
      />

      <OfficeStatGrid
        items={[
          {
            label: 'Clients',
            value: stats?.totalClients || 0,
            icon: Users,
            tone: 'brand',
            onClick: () => navigate('/app/clients'),
          },
          {
            label: 'Active tasks',
            value: stats?.activeTasks || 0,
            icon: CheckSquare,
            tone: 'warning',
            onClick: () => navigate('/app/tasks'),
          },
          {
            label: 'Completed',
            value: stats?.completedTasks || 0,
            icon: CheckCircle,
            tone: 'income',
            onClick: () => navigate('/app/tasks'),
          },
          {
            label: "Today's appts",
            value: appointmentTasks.length,
            icon: CalendarDays,
            tone: 'violet',
          },
        ]}
      />

      {/* Appointments for the selected day */}
      <div className="office-card">
        <div className="office-card-head office-appt-head">
          <div className="office-card-copy">
            <h3 className="office-card-title">
              {isApptDateToday ? "Today's appointments" : appointmentDate.format('DD MMM YYYY')}
            </h3>
            <span className="office-card-sub">
              {appointmentDate.format('dddd')} · {appointmentTasks.length}{' '}
              {appointmentTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <div className="office-date-nav">
            <Button
              type="text"
              size="small"
              aria-label="Previous day"
              icon={<ChevronLeft size={16} />}
              onClick={() => setAppointmentDate((prev) => prev.subtract(1, 'day'))}
            />
            <DatePicker
              size="small"
              value={appointmentDate}
              onChange={(date) => setAppointmentDate(date || dayjs())}
              format="DD MMM"
              allowClear={false}
              suffixIcon={<Calendar size={13} />}
              style={{ width: 104 }}
            />
            <Button
              type="text"
              size="small"
              aria-label="Next day"
              icon={<ChevronRight size={16} />}
              onClick={() => setAppointmentDate((prev) => prev.add(1, 'day'))}
            />
            {!isApptDateToday ? (
              <button
                type="button"
                className="office-date-today"
                onClick={() => setAppointmentDate(dayjs())}
              >
                Today
              </button>
            ) : null}
          </div>
        </div>

        {apptTasksLoading ? (
          <div className="office-empty">Loading appointments…</div>
        ) : appointmentTasks.length === 0 ? (
          <div className="office-empty">
            {isApptDateToday
              ? 'No appointments today. Enjoy the quiet desk.'
              : `No appointments on ${appointmentDate.format('DD/MM/YYYY')}.`}
          </div>
        ) : isMobile ? (
          <div className="office-list">
            {appointmentTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="office-list-row"
                onClick={() => navigate(`/app/tasks/${task.id}`)}
              >
                <span className="office-list-avatar">
                  <NotebookText size={16} />
                </span>
                <span className="office-list-copy">
                  <span className="office-list-title">{task.documentType || 'Task'}</span>
                  <span className="office-list-meta">
                    <UserRound size={12} />
                    <span>{task.client?.name || task.clientName || '-'}</span>
                    {task.appointmentDate ? (
                      <>
                        <span className="office-dot">·</span>
                        <span>{dayjs(task.appointmentDate).format('hh:mm A')}</span>
                      </>
                    ) : null}
                  </span>
                </span>
                <span className="office-list-side">{apptStatusTag(task.status)}</span>
              </button>
            ))}
          </div>
        ) : (
          <Table
            className="modern-dashboard-table"
            columns={appointmentTasksColumns}
            dataSource={appointmentTasks}
            rowKey="id"
            loading={apptTasksLoading}
            pagination={appointmentTasks.length > 5 ? { pageSize: 5, size: 'small' } : false}
            scroll={{ x: 750 }}
          />
        )}
      </div>

      {/* Financial summary */}
      <div className="office-card">
        <div className="office-card-head office-finance-head">
          <h3 className="office-card-title">Financial summary</h3>
          <div className="office-head-tools">
            <Segmented
              size="small"
              className="office-segmented"
              value={financeMode}
              onChange={setFinanceMode}
              options={[
                {
                  label: activeFinancialYear ? `FY ${activeFinancialYear.name}` : 'This FY',
                  value: 'FY',
                },
                { label: 'This month', value: 'MONTH' },
              ]}
            />
            <Tooltip title={isRevealed ? 'Hide amounts' : 'Reveal amounts (PIN required)'}>
              <Button type="text" size="small" className="office-eye-btn" onClick={handleToggleEye}>
                {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{isRevealed ? 'Hide' : 'View'}</span>
              </Button>
            </Tooltip>
          </div>
        </div>
        <div className="office-card-body">
          <div className="office-finance-rows">
            <div className="office-finance-row office-finance-row--income">
              <span className="office-finance-row-label">
                <TrendingUp size={13} /> Total profit
              </span>
              <span className="office-finance-row-value" style={{ color: '#059669' }}>
                <PrivacyAmount amount={activeFinance.profit} color="#059669" />
              </span>
            </div>
            <div className="office-finance-row office-finance-row--expense">
              <span className="office-finance-row-label">
                <TrendingDown size={13} /> General expense
              </span>
              <span className="office-finance-row-value" style={{ color: '#dc2626' }}>
                <PrivacyAmount amount={activeFinance.expense} color="#dc2626" />
              </span>
            </div>
            <div className="office-finance-row office-finance-row--net">
              <span className="office-finance-row-label">
                <Wallet size={13} /> Net profit
              </span>
              <span className="office-finance-row-value" style={{ color: '#2563eb' }}>
                <PrivacyAmount amount={activeFinance.net} color="#2563eb" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="office-card">
        <div className="office-card-head">
          <h3 className="office-card-title">Recent tasks</h3>
          <button type="button" className="office-card-action" onClick={() => navigate('/app/tasks')}>
            View all <ArrowRight size={13} />
          </button>
        </div>
        {recentTasks.length === 0 ? (
          <div className="office-empty">No recent tasks yet.</div>
        ) : isMobile ? (
          <div className="office-list">
            {recentTasks.slice(0, 5).map((task) => (
              <button
                key={task.id}
                type="button"
                className="office-list-row"
                onClick={() => navigate(`/app/tasks/${task.id}`)}
              >
                <span className="office-list-copy">
                  <span className="office-list-title">{task.documentType}</span>
                  <span className="office-list-meta">
                    <UserRound size={12} />
                    <span>{task.client?.name || task.clientName || '-'}</span>
                  </span>
                </span>
                <span className="office-list-side">{apptStatusTag(task.status)}</span>
              </button>
            ))}
          </div>
        ) : (
          <Table
            className="modern-dashboard-table"
            columns={recentTasksColumns}
            dataSource={recentTasks}
            rowKey="id"
            pagination={false}
          />
        )}
      </div>

      {/* Recent clients */}
      <div className="office-card">
        <div className="office-card-head">
          <h3 className="office-card-title">New clients</h3>
          <button type="button" className="office-card-action" onClick={() => navigate('/app/clients')}>
            View all <ArrowRight size={13} />
          </button>
        </div>
        {recentClients.length === 0 ? (
          <div className="office-empty">No clients added yet.</div>
        ) : isMobile ? (
          <div className="office-list">
            {recentClients.slice(0, 5).map((client) => (
              <button
                key={client.id}
                type="button"
                className="office-list-row"
                onClick={() => navigate(`/app/clients/${client.id}`)}
              >
                <span className="office-list-avatar">{getInitials(client.name)}</span>
                <span className="office-list-copy">
                  <span className="office-list-title">{client.name}</span>
                  <span className="office-list-meta">
                    <span>{client.mobileNumber || 'No mobile number'}</span>
                  </span>
                </span>
                <ChevronRight size={16} className="office-list-chevron" />
              </button>
            ))}
          </div>
        ) : (
          <Table
            className="modern-dashboard-table"
            columns={recentClientsColumns}
            dataSource={recentClients}
            rowKey="id"
            pagination={false}
          />
        )}
      </div>

      {/* PIN Verification Modal */}
      <PinVerificationModal
        visible={verifyModalVisible}
        onClose={() => setVerifyModalVisible(false)}
        onForgotPin={handleForgotPin}
      />

      {/* Set / Change PIN Modal */}
      <SetPinModal
        visible={setPinModalVisible}
        onClose={() => setSetPinModalVisible(false)}
        hasExistingPin={Boolean(activeUser?.hasSecurityPin)}
        isResetMode={isResetPinMode}
        onSuccess={() => {
          setSetPinModalVisible(false);
          setVerifyModalVisible(true);
        }}
      />
    </div>
  );
}
