import React, { useState } from 'react';
import { Row, Col, Card, Typography, Table, Tag, Empty, Button, Tooltip } from 'antd';
import { Users, CheckSquare, CheckCircle, ArrowRight, ClipboardList, FolderOpen, Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import { useDashboardStats, useRecentData } from '../../hooks/useReports';
import { useGeneralExpenses } from '../../hooks/useGeneralExpenses';
import { useCurrentProfile } from '../../hooks/useUsers';
import useAuthStore from '../../store/authStore';
import usePrivacyStore from '../../store/privacyStore';
import PrivacyAmount from '../../components/PrivacyAmount';
import PinVerificationModal from '../../components/PinVerificationModal';
import SetPinModal from '../../components/SetPinModal';
import dayjs from 'dayjs';

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

  const { data: stats, isLoading: statsLoading } = useDashboardStats(activeFinancialYear?.startDate, activeFinancialYear?.endDate);
  const { data: recent, isLoading: recentLoading } = useRecentData(activeFinancialYear?.startDate, activeFinancialYear?.endDate);

  const { data: fyGeneralExpenses, isLoading: fyGeLoading } = useGeneralExpenses(
    activeFinancialYear?.startDate,
    activeFinancialYear?.endDate
  );

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month();
  let mStart = dayjs().year(currentYear).month(currentMonth).startOf('month');
  let mEnd = dayjs().year(currentYear).month(currentMonth).endOf('month');

  if (activeFinancialYear?.startDate) {
    const fyS = dayjs(activeFinancialYear.startDate);
    if (fyS.isAfter(mStart)) mStart = fyS;
  }
  if (activeFinancialYear?.endDate) {
    const fyE = dayjs(activeFinancialYear.endDate);
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
      render: (status) => (
        <Tag style={
          status === 'ACTIVE'
            ? { backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }
            : { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600, fontSize: '12px' }
        }>
          {status === 'ACTIVE' ? 'Active' : 'Done'}
        </Tag>
      ),
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
