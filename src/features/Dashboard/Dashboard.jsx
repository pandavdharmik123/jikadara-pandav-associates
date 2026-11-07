import React, { useState } from 'react';
import { Row, Col, Card, Typography, Table, Tag, Empty, Button, Tooltip, DatePicker, Dropdown, message } from 'antd';
import { Users, CheckSquare, CheckCircle, ArrowRight, ClipboardList, FolderOpen, Eye, EyeOff, Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
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
  const { user, activeFinancialYear } = useAuthStore();
  const { data: profile } = useCurrentProfile();
  const activeUser = profile || user;

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
    return <Loader />;
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

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>
          Dashboard
        </Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer' }} styles={{ body: { padding: '16px 20px' } }} onClick={() => navigate('/app/clients')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{stats?.totalClients || 0}</div>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>Total Clients</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer' }} styles={{ body: { padding: '16px 20px' } }} onClick={() => navigate('/app/tasks')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckSquare size={20} color="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{stats?.activeTasks || 0}</div>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>Active Tasks</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer' }} styles={{ body: { padding: '16px 20px' } }} onClick={() => navigate('/app/tasks')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={20} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{stats?.completedTasks || 0}</div>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>Completed Tasks</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Appointment Tasks Card */}
      <Card
        bordered={false}
        style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', marginBottom: 20 }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '16px' }}>
                  {isApptDateToday ? "Today's Tasks" : `Tasks for ${appointmentDate.format('DD MMM YYYY')}`}
                </span>
                <Tag color={isApptDateToday ? "blue" : "default"} style={{ borderRadius: 10, margin: 0, fontWeight: 600 }}>
                  {appointmentTasks.length} {appointmentTasks.length === 1 ? 'task' : 'tasks'}
                </Tag>
              </div>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
                {appointmentDate.format('dddd, DD MMMM YYYY')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {!isApptDateToday && (
              <Button
                size="middle"
                onClick={() => setAppointmentDate(dayjs())}
                style={{ borderRadius: 8, fontWeight: 500 }}
              >
                Today
              </Button>
            )}
            <Button
              size="middle"
              icon={<ChevronLeft size={16} />}
              onClick={() => setAppointmentDate(prev => prev.subtract(1, 'day'))}
              style={{ borderRadius: 8 }}
              title="Previous Day"
            />
            <DatePicker
              value={appointmentDate}
              onChange={(date) => setAppointmentDate(date || dayjs())}
              format="DD/MM/YYYY"
              allowClear={false}
              size="middle"
              style={{ width: 140, borderRadius: 8 }}
            />
            <Button
              size="middle"
              icon={<ChevronRight size={16} />}
              onClick={() => setAppointmentDate(prev => prev.add(1, 'day'))}
              style={{ borderRadius: 8 }}
              title="Next Day"
            />
          </div>
        </div>

        {appointmentTasks.length > 0 ? (
          <Table
            className="modern-dashboard-table"
            columns={appointmentTasksColumns}
            dataSource={appointmentTasks}
            rowKey="id"
            loading={apptTasksLoading}
            pagination={appointmentTasks.length > 5 ? { pageSize: 5, size: 'small' } : false}
            scroll={{ x: 750 }}
          />
        ) : (
          <div style={{ padding: '24px 0' }}>
            <EmptyState
              icon={Calendar}
              title={isApptDateToday ? "No tasks scheduled for today" : `No tasks scheduled for ${appointmentDate.format('DD/MM/YYYY')}`}
              description="Change the date from the picker above or set appointment dates in tasks."
            />
          </div>
        )}
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', height: '100%' }} styles={{ body: { padding: '20px' } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                {activeFinancialYear ? `FY ${activeFinancialYear.name} Completed Financials` : 'Yearly Completed Financials'}
              </Title>
              <Tooltip title={isRevealed ? "Hide amounts" : "Reveal amounts (PIN required)"}>
                <Button
                  type="text"
                  size="small"
                  onClick={handleToggleEye}
                  style={{
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                    backgroundColor: isRevealed ? '#f1f5f9' : '#eff6ff',
                    color: isRevealed ? '#64748b' : '#2563eb',
                    fontWeight: 600,
                    fontSize: '12px',
                    gap: 6,
                  }}
                >
                  {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>{isRevealed ? 'Hide' : 'View'}</span>
                </Button>
              </Tooltip>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Profit</Text>
                <Title level={4} style={{ margin: 0, color: '#10b981', fontWeight: 700 }}>
                  <PrivacyAmount amount={fyTaskNet} color="#10b981" />
                </Title>
              </div>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>General Expense</Text>
                <Title level={4} style={{ margin: 0, color: '#ef4444', fontWeight: 700 }}>
                  <PrivacyAmount amount={fyGeTotal} color="#ef4444" />
                </Title>
              </div>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Profit</Text>
                <Title level={4} style={{ margin: 0, color: '#3b82f6', fontWeight: 700 }}>
                  <PrivacyAmount amount={fyFinalNet} color="#3b82f6" />
                </Title>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', height: '100%' }} styles={{ body: { padding: '20px' } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                This Month's Completed Financials
              </Title>
              <Tooltip title={isRevealed ? "Hide amounts" : "Reveal amounts (PIN required)"}>
                <Button
                  type="text"
                  size="small"
                  onClick={handleToggleEye}
                  style={{
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                    backgroundColor: isRevealed ? '#f1f5f9' : '#eff6ff',
                    color: isRevealed ? '#64748b' : '#2563eb',
                    fontWeight: 600,
                    fontSize: '12px',
                    gap: 6,
                  }}
                >
                  {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>{isRevealed ? 'Hide' : 'View'}</span>
                </Button>
              </Tooltip>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Profit</Text>
                <Title level={4} style={{ margin: 0, color: '#10b981', fontWeight: 700 }}>
                  <PrivacyAmount amount={monthlyTaskNet} color="#10b981" />
                </Title>
              </div>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>General Expense</Text>
                <Title level={4} style={{ margin: 0, color: '#ef4444', fontWeight: 700 }}>
                  <PrivacyAmount amount={monthlyGeTotal} color="#ef4444" />
                </Title>
              </div>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Profit</Text>
                <Title level={4} style={{ margin: 0, color: '#3b82f6', fontWeight: 700 }}>
                  <PrivacyAmount amount={monthlyFinalNet} color="#3b82f6" />
                </Title>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

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

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            title={<span style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>Recent Tasks</span>}
            extra={<a onClick={() => navigate('/app/tasks')} style={{ color: '#2563eb', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View All <ArrowRight size={14} /></a>}
            style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)' }}
            styles={{ body: { padding: 0 } }}
          >
            {recent?.recentTasks?.length > 0 ? (
              <Table
                className="modern-dashboard-table"
                columns={recentTasksColumns}
                dataSource={recent.recentTasks}
                rowKey="id"
                pagination={false}
              />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No tasks found"
                description="There are no recent tasks to display."
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            title={<span style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>New Clients</span>}
            extra={<a onClick={() => navigate('/app/clients')} style={{ color: '#2563eb', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View All <ArrowRight size={14} /></a>}
            style={{ borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)' }}
            styles={{ body: { padding: 0 } }}
          >
            {recent?.recentClients?.length > 0 ? (
              <Table
                className="modern-dashboard-table"
                columns={recentClientsColumns}
                dataSource={recent.recentClients}
                rowKey="id"
                pagination={false}
              />
            ) : (
              <EmptyState
                icon={FolderOpen}
                title="No clients found"
                description="There are no recent clients to display."
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
