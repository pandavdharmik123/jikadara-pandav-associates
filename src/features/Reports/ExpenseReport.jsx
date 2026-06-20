import React, { useState } from 'react';
import { Typography, Card, Table, Select, DatePicker, Row, Col, Space, Button, Empty } from 'antd';
import { BarChartOutlined, PrinterOutlined } from '@ant-design/icons';
import { useMonthlyReport, useYearlyReport } from '../../hooks/useReports';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';
import dayjs from 'dayjs';

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

  const handlePrint = () => {
    window.print();
  };

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
      title: 'Income',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right',
      render: (val) => <Text type="success">₹{Number(val).toFixed(2)}</Text>,
    },
    {
      title: 'Expense',
      dataIndex: 'totalExpense',
      key: 'totalExpense',
      align: 'right',
      render: (val) => <Text type="danger">₹{Number(val).toFixed(2)}</Text>,
    },
    {
      title: 'Net Profit',
      dataIndex: 'netAmount',
      key: 'netAmount',
      align: 'right',
      render: (val) => (
        <Text type={Number(val) >= 0 ? 'success' : 'danger'} strong>
          ₹{Number(val).toFixed(2)}
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
      render: (val) => <Text type="success">₹{Number(val).toFixed(2)}</Text>,
    },
    {
      title: 'Expense',
      dataIndex: 'totalExpense',
      key: 'totalExpense',
      align: 'right',
      render: (val) => <Text type="danger">₹{Number(val).toFixed(2)}</Text>,
    },
    {
      title: 'Net Profit',
      dataIndex: 'netAmount',
      key: 'netAmount',
      align: 'right',
      render: (val) => (
        <Text type={Number(val) >= 0 ? 'success' : 'danger'} strong>
          ₹{Number(val).toFixed(2)}
        </Text>
      ),
    },
  ];

  const isLoading = reportType === 'MONTHLY' ? monthlyLoading : yearlyLoading;
  const hasData = reportType === 'MONTHLY' ? monthlyData?.tasks?.length > 0 : yearlyData?.yearlyTotals?.taskCount > 0;

  return (
    <div className="advocate-module">
      <div className="page-header print-hide" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Financial Reports</Title>
          {/* <Text type="secondary" style={{ fontSize: '13px' }}>View financials based on completed tasks</Text> */}
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
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
        </Space>
      </div>



      <div className="print-only" style={{ display: 'none', marginBottom: 20 }}>
        <h2>JIKADARA & PANDAV ASSOCIATES - Financial Report</h2>
        <p>Type: {reportType === 'MONTHLY' ? `Monthly (${dayjs().month(selectedMonth - 1).format('MMMM')})` : 'Yearly'} | Year: {selectedYear}</p>
      </div>

      {isLoading ? (
        <Loader />
      ) : hasData ? (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Card className="glass-panel stat-card" bordered={false} size="small">
                <div className="stat-icon" style={{ background: 'rgba(82, 196, 26, 0.1)', color: '#52c41a' }}>₹</div>
                <div className="stat-content">
                  <div className="stat-value" style={{ color: '#52c41a' }}>
                    ₹{(reportType === 'MONTHLY' ? monthlyData?.totals?.totalIncome : yearlyData?.yearlyTotals?.totalIncome)?.toFixed(2) || '0.00'}
                  </div>
                  <div className="stat-label">Total Income</div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="glass-panel stat-card" bordered={false} size="small">
                <div className="stat-icon" style={{ background: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f' }}>₹</div>
                <div className="stat-content">
                  <div className="stat-value" style={{ color: '#ff4d4f' }}>
                    ₹{(reportType === 'MONTHLY' ? monthlyData?.totals?.totalExpense : yearlyData?.yearlyTotals?.totalExpense)?.toFixed(2) || '0.00'}
                  </div>
                  <div className="stat-label">Total Expense</div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="glass-panel stat-card" bordered={false} size="small">
                <div className="stat-icon" style={{ background: 'rgba(24, 144, 255, 0.1)', color: '#1890ff' }}>₹</div>
                <div className="stat-content">
                  <div className="stat-value" style={{ color: '#1890ff' }}>
                    ₹{(reportType === 'MONTHLY' ? monthlyData?.totals?.netAmount : yearlyData?.yearlyTotals?.netAmount)?.toFixed(2) || '0.00'}
                  </div>
                  <div className="stat-label">Net Profit</div>
                </div>
              </Card>
            </Col>
          </Row>

          <Card className="glass-panel" bordered={false} styles={{ body: { padding: 0 } }}>
            {reportType === 'MONTHLY' ? (
              <Table
                columns={monthlyColumns}
                dataSource={monthlyData.tasks}
                rowKey="id"
                pagination={false}
                scroll={{ x: 600 }}
                size="small"
              />
            ) : (
              <Table
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
          <Empty description="No data available for selected period" />
        </Card>
      )}

      {/* Basic print styles */}
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          .print-only { display: block !important; }
          .ant-layout { background: #fff !important; }
          .ant-card { box-shadow: none !important; border: none !important; }
          .advocate-module { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
