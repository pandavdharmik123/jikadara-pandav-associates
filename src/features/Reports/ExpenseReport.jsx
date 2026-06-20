import React, { useState } from 'react';
import { Typography, Card, Table, Select, DatePicker, Row, Col, Space, Button, Empty } from 'antd';
import { BarChart2, FileLineChart } from 'lucide-react';
import { useMonthlyReport, useYearlyReport } from '../../hooks/useReports';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/currency';

const { Title, Text } = Typography;
const { Option } = Select;

export default function ExpenseReport() {
  const { user } = useAuthStore();

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1; // 1-12

  const [reportType, setReportType] = useState('MONTHLY'); // MONTHLY or YEARLY
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // If user is junior, they shouldn't see this page ideally, but API will protect data.
  // Actually, per requirements: Expense reports are Senior/Admin only. 
  // The ProtectedRoute handles this if setup, but let's show an access denied if Junior reaches here.
  if (user?.role === 'JUNIOR') {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={4}>Access Denied</Title>
        <Text>Only Senior or Admin can view reports.</Text>
      </div>
    );
  }

  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyReport(
    reportType === 'MONTHLY' ? selectedYear : null,
    reportType === 'MONTHLY' ? selectedMonth : null
  );

  const { data: yearlyData, isLoading: yearlyLoading } = useYearlyReport(
    reportType === 'YEARLY' ? selectedYear : null
  );


  const monthlyColumns = [
    {
      title: 'Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (text) => dayjs(text).format('DD/MM/YYYY'),
    },
    {
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
    },
    {
      title: 'Document Type',
      dataIndex: 'documentType',
      key: 'documentType',
    },
    {
      title: 'Reference',
      dataIndex: 'referenceName',
      key: 'referenceName',
      render: (text) => text || '-',
    },
    {
      title: 'Income',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right',
      render: (val) => <Text type="success">{formatCurrency(val)}</Text>,
    },
    {
      title: 'Expense',
      dataIndex: 'totalExpense',
      key: 'totalExpense',
      align: 'right',
      render: (val) => <Text type="danger">{formatCurrency(val)}</Text>,
    },
    {
      title: 'Net Profit',
      dataIndex: 'netAmount',
      key: 'netAmount',
      align: 'right',
      render: (val) => (
        <Text type={Number(val) >= 0 ? 'success' : 'danger'} strong>
          {formatCurrency(val)}
        </Text>
      ),
    },
  ];

  const yearlyColumns = [
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
      render: (val) => dayjs().month(val - 1).format('MMMM'),
    },
    {
      title: 'Completed Tasks',
      dataIndex: 'taskCount',
      key: 'taskCount',
      align: 'center',
    },
    {
      title: 'Income',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right',
      render: (val) => <Text type="success">{formatCurrency(val)}</Text>,
    },
    {
      title: 'Expense',
      dataIndex: 'totalExpense',
      key: 'totalExpense',
      align: 'right',
      render: (val) => <Text type="danger">{formatCurrency(val)}</Text>,
    },
    {
      title: 'Net Profit',
      dataIndex: 'netAmount',
      key: 'netAmount',
      align: 'right',
      render: (val) => (
        <Text type={Number(val) >= 0 ? 'success' : 'danger'} strong>
          {formatCurrency(val)}
        </Text>
      ),
    },
  ];

  const isLoading = reportType === 'MONTHLY' ? monthlyLoading : yearlyLoading;
  const hasData = reportType === 'MONTHLY' ? monthlyData?.tasks?.length > 0 : yearlyData?.yearlyTotals?.taskCount > 0;

  return (
    <div className="advocate-module">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Financial Reports</Title>
        </div>
        <Space>
          <Select
            value={reportType}
            onChange={setReportType}
            size="middle"
            style={{ width: 120 }}
            variant="filled"
          >
            <Option value="MONTHLY">Monthly</Option>
            <Option value="YEARLY">Yearly</Option>
          </Select>

          {reportType === 'MONTHLY' && (
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              size="middle"
              style={{ width: 120 }}
              variant="filled"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <Option key={i + 1} value={i + 1}>{dayjs().month(i).format('MMMM')}</Option>
              ))}
            </Select>
          )}

          <DatePicker
            picker="year"
            value={dayjs().year(selectedYear)}
            onChange={(date) => setSelectedYear(date ? date.year() : currentYear)}
            size="middle"
            style={{ width: 100 }}
            allowClear={false}
            variant="filled"
          />
        </Space>
      </div>

      {isLoading ? (
        <Loader />
      ) : hasData ? (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
              <Space align="center" size="small">
                <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: 16, fontWeight: 600 }}>₹</div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Income</Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>
                    {formatCurrency(reportType === 'MONTHLY' ? monthlyData?.totals?.totalIncome : yearlyData?.yearlyTotals?.totalIncome)}
                  </div>
                </div>
              </Space>
            </Card>

            <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
              <Space align="center" size="small">
                <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 16, fontWeight: 600 }}>₹</div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Expense</Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
                    {formatCurrency(reportType === 'MONTHLY' ? monthlyData?.totals?.totalExpense : yearlyData?.yearlyTotals?.totalExpense)}
                  </div>
                </div>
              </Space>
            </Card>

            <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
              <Space align="center" size="small">
                <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: 16, fontWeight: 600 }}>₹</div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Profit</Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb' }}>
                    {formatCurrency(reportType === 'MONTHLY' ? monthlyData?.totals?.netAmount : yearlyData?.yearlyTotals?.netAmount)}
                  </div>
                </div>
              </Space>
            </Card>
          </div>

          <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
            {reportType === 'MONTHLY' ? (
              <Table
                className="modern-dashboard-table"
                columns={monthlyColumns}
                dataSource={monthlyData.tasks}
                rowKey="id"
                pagination={false}
                scroll={{ x: 600 }}
                size="small"
              />
            ) : (
              <Table
                className="modern-dashboard-table"
                columns={yearlyColumns}
                dataSource={yearlyData.months.filter(m => m.taskCount > 0)}
                rowKey="month"
                pagination={false}
                scroll={{ x: 600 }}
                size="small"
              />
            )}
          </Card>
        </>
      ) : (
        <Card className="glass-panel" bordered={false}>
          <EmptyState 
            icon={FileLineChart} 
            title="No data available" 
            description="There are no completed tasks for the selected period."
          />
        </Card>
      )}


    </div>
  );
}
