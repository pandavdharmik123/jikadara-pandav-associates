import React, { useState, useRef } from 'react';
import { Typography, Card, Table, Select, DatePicker, Row, Col, Space, Button, Modal, Form, Input, message, Tooltip, Grid } from 'antd';
import { BarChart2, FileLineChart, Plus, Edit, Trash2, Download, Eye, EyeOff, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useMonthlyReport, useYearlyReport } from '../../hooks/useReports';
import { useGeneralExpenses, useCreateGeneralExpense, useUpdateGeneralExpense, useDeleteGeneralExpense } from '../../hooks/useGeneralExpenses';
import { useDeleteTransaction } from '../../hooks/useTasks';
import { useCurrentProfile } from '../../hooks/useUsers';
import useAuthStore from '../../store/authStore';
import usePrivacyStore from '../../store/privacyStore';
import PrivacyAmount from '../../components/PrivacyAmount';
import PinVerificationModal from '../../components/PinVerificationModal';
import SetPinModal from '../../components/SetPinModal';
import { ReportSkeleton, StatsSkeleton, TableSkeleton } from '../../components/skeletons';
import EmptyState from '../../components/EmptyState';
import FinancialReportPrintLayout from './FinancialReportPrintLayout';
import AddIncomeModal from './AddIncomeModal';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/currency';
import { toISTDateString } from '../../utils/istDate';
import OfficePageHeader from '../../components/office/OfficePageHeader';
import OfficeStatGrid from '../../components/office/OfficeStatGrid';

const { Title, Text } = Typography;
const { Option } = Select;

export default function ExpenseReport() {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const { user, activeFinancialYear } = useAuthStore();
  const { data: profile } = useCurrentProfile();
  const activeUser = profile || user;

  const { isRevealed, hide } = usePrivacyStore();
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [setPinModalVisible, setSetPinModalVisible] = useState(false);
  const [isResetPinMode, setIsResetPinMode] = useState(false);

  const reportPrintRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1; // 1-12

  const [reportType, setReportType] = useState('MONTHLY'); // MONTHLY or YEARLY
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Income Modal State
  const [isIncomeModalVisible, setIsIncomeModalVisible] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);

  // General Expense Modal State
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm] = Form.useForm();

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

  if (user?.role === 'JUNIOR') {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={4}>Access Denied</Title>
        <Text>Only Senior or Admin can view reports.</Text>
      </div>
    );
  }

  const fyStartDateStr = toISTDateString(activeFinancialYear?.startDate);
  const fyEndDateStr = toISTDateString(activeFinancialYear?.endDate);

  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyReport(
    reportType === 'MONTHLY' ? fyStartDateStr : null,
    reportType === 'MONTHLY' ? fyEndDateStr : null,
    reportType === 'MONTHLY' ? selectedYear : null,
    reportType === 'MONTHLY' ? selectedMonth : null
  );

  const { data: yearlyData, isLoading: yearlyLoading } = useYearlyReport(
    reportType === 'YEARLY' ? fyStartDateStr : null,
    reportType === 'YEARLY' ? fyEndDateStr : null,
    reportType === 'YEARLY' ? selectedYear : null
  );

  let geStart, geEnd;
  if (reportType === 'MONTHLY') {
    let mStart = dayjs().year(selectedYear).month(selectedMonth - 1).startOf('month');
    let mEnd = dayjs().year(selectedYear).month(selectedMonth - 1).endOf('month');

    if (fyStartDateStr) {
      const fyS = dayjs(fyStartDateStr);
      if (fyS.isAfter(mStart)) mStart = fyS;
    }
    if (fyEndDateStr) {
      const fyE = dayjs(fyEndDateStr);
      if (fyE.isBefore(mEnd)) mEnd = fyE;
    }

    if (mStart.isAfter(mEnd)) {
      geStart = '1970-01-01';
      geEnd = '1970-01-01';
    } else {
      geStart = mStart.format('YYYY-MM-DD');
      geEnd = mEnd.format('YYYY-MM-DD');
    }
  } else {
    if (fyStartDateStr && fyEndDateStr) {
      geStart = fyStartDateStr;
      geEnd = fyEndDateStr;
    } else {
      geStart = dayjs().year(selectedYear).startOf('year').format('YYYY-MM-DD');
      geEnd = dayjs().year(selectedYear).endOf('year').format('YYYY-MM-DD');
    }
  }

  const { data: generalExpenses, isLoading: generalExpensesLoading } = useGeneralExpenses(geStart, geEnd);

  const createExpenseMutation = useCreateGeneralExpense();
  const updateExpenseMutation = useUpdateGeneralExpense();
  const deleteExpenseMutation = useDeleteGeneralExpense();
  const deleteTransactionMutation = useDeleteTransaction();

  const handleOpenExpenseModal = (expense = null) => {
    setEditingExpense(expense);
    if (expense) {
      expenseForm.setFieldsValue({
        date: dayjs(expense.date),
        description: expense.description,
        amount: expense.amount,
      });
    } else {
      expenseForm.resetFields();
      expenseForm.setFieldsValue({ date: dayjs() });
    }
    setIsExpenseModalVisible(true);
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseModalVisible(false);
    setEditingExpense(null);
    expenseForm.resetFields();
  };

  const handleExpenseSubmit = async () => {
    try {
      const values = await expenseForm.validateFields();
      const payload = {
        date: values.date.format('YYYY-MM-DD'),
        description: values.description,
        amount: values.amount,
      };

      if (editingExpense) {
        await updateExpenseMutation.mutateAsync({ id: editingExpense.id, ...payload });
        message.success('General expense updated successfully');
      } else {
        await createExpenseMutation.mutateAsync(payload);
        message.success('General expense added successfully');
      }
      handleCloseExpenseModal();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        message.error('Operation failed');
      }
    }
  };

  const handleDeleteExpense = (id) => {
    Modal.confirm({
      title: 'Delete Expense?',
      content: 'Are you sure you want to delete this general expense?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteExpenseMutation.mutateAsync(id);
          message.success('General expense deleted');
        } catch (error) {
          message.error('Operation failed');
        }
      },
    });
  };

  const handleDeleteDirectIncome = (record) => {
    Modal.confirm({
      title: 'Delete Income Entry?',
      content: (
        <div>
          <p>Are you sure you want to delete this manual income entry?</p>
          <div style={{ marginTop: 8, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 13, border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: 4 }}><strong>Client:</strong> {record.client?.name || record.clientName || '-'}</div>
            <div style={{ marginBottom: 4 }}><strong>Document Type:</strong> {record.documentType || '-'}</div>
            <div><strong>Amount:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>{formatCurrency(record.totalIncome || record.netAmount)}</span></div>
          </div>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteTransactionMutation.mutateAsync({ id: record.id });
          message.success('Income entry moved to Recycle Bin');
        } catch (error) {
          message.error(error.response?.data?.error || 'Failed to delete income entry');
        }
      },
    });
  };

  const monthlyColumns = [
    {
      title: 'Sr.',
      key: 'srNo',
      width: 55,
      align: 'center',
      render: (_, __, index) => <Text style={{ color: '#64748b', fontSize: '13px' }}>{index + 1}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'completedDate',
      key: 'completedDate',
      render: (_, record) => dayjs(record.completedDate || record.startDate).format('DD/MM/YYYY'),
    },
    {
      title: 'Document Type',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (text, record) => (
        <span>
          {text || '-'}
          {record.isDirectIncome && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 4,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontWeight: 600,
              }}
            >
              Direct
            </span>
          )}
        </span>
      ),
    },
    {
      title: 'Place',
      dataIndex: 'place',
      key: 'place',
      render: (text) => text || '-',
    },
    {
      title: 'Client',
      key: 'client',
      render: (_, record) => record.client?.name || record.clientName || '-',
    },
    {
      title: 'Reference',
      dataIndex: 'referenceName',
      key: 'referenceName',
      render: (text) => text || '-',
    },
    {
      title: 'Net Profit',
      dataIndex: 'netAmount',
      key: 'netAmount',
      align: 'right',
      render: (val) => (
        <PrivacyAmount amount={val} color={Number(val) >= 0 ? '#16a34a' : '#dc2626'} style={{ fontWeight: 700 }} />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, record) => {
        if (record.isDirectIncome) {
          return (
            <Space size="small">
              <Tooltip title="Edit manual income entry">
                <Button
                  type="text"
                  size="small"
                  icon={<Edit size={16} />}
                  onClick={() => {
                    setEditingIncome(record);
                    setIsIncomeModalVisible(true);
                  }}
                />
              </Tooltip>
              <Tooltip title="Delete manual income entry">
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<Trash2 size={16} />}
                  onClick={() => handleDeleteDirectIncome(record)}
                />
              </Tooltip>
            </Space>
          );
        }
        return null;
      },
    },
  ];

  const yearlyColumns = [
    {
      title: 'Sr.',
      key: 'srNo',
      width: 55,
      align: 'center',
      render: (_, __, index) => <Text style={{ color: '#64748b', fontSize: '13px' }}>{index + 1}</Text>,
    },
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
      render: (val, record) => dayjs().month(val - 1).year(record.year || dayjs().year()).format('MMM YYYY'),
    },
    {
      title: 'Completed Tasks',
      dataIndex: 'taskCount',
      key: 'taskCount',
      align: 'center',
    },
    {
      title: 'Net Profit',
      dataIndex: 'netAmount',
      key: 'netAmount',
      align: 'right',
      render: (val) => (
        <PrivacyAmount amount={val} color={Number(val) >= 0 ? '#16a34a' : '#dc2626'} style={{ fontWeight: 700 }} />
      ),
    },
  ];

  const generalExpenseColumns = [
    {
      title: 'Sr.',
      key: 'srNo',
      width: 55,
      align: 'center',
      render: (_, __, index) => <Text style={{ color: '#64748b', fontSize: '13px' }}>{index + 1}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val) => <PrivacyAmount amount={val} color="#dc2626" style={{ fontWeight: 600 }} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<Edit size={16} />} onClick={() => handleOpenExpenseModal(record)} />
          <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => handleDeleteExpense(record.id)} />
        </Space>
      ),
    }
  ];

  const isLoading = reportType === 'MONTHLY' ? monthlyLoading : yearlyLoading;
  const hasData = reportType === 'MONTHLY' ? monthlyData?.tasks?.length > 0 : yearlyData?.yearlyTotals?.taskCount > 0;

  const tasksNetProfit = reportType === 'MONTHLY' ? (monthlyData?.totals?.netAmount || 0) : (yearlyData?.yearlyTotals?.netAmount || 0);

  const totalGeneralExpense = (generalExpenses || []).reduce((sum, item) => sum + Number(item.amount), 0);
  const finalNetProfit = Number(tasksNetProfit) - totalGeneralExpense;

  const handleGeneratePDF = async () => {
    const element = reportPrintRef.current;
    if (!element) return;

    setIsGeneratingPDF(true);
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    try {
      const clone = element.cloneNode(true);
      clone.classList.add('pdf-mode');

      const container = document.createElement('div');
      container.className = 'pdf-export-container';
      Object.assign(container.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: '794px',
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: '-1',
      });

      Object.assign(clone.style, {
        overflow: 'visible',
        height: 'auto',
        maxHeight: 'none',
      });

      container.appendChild(clone);
      document.body.appendChild(container);

      document.body.style.overflow = 'visible';
      document.documentElement.style.overflow = 'visible';

      await new Promise((r) => setTimeout(r, 300));

      const captureWidth = 794;
      const captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1120);

      const periodName =
        reportType === 'MONTHLY'
          ? `${dayjs().month(selectedMonth - 1).format('MMMM')}_${selectedYear}`
          : (activeFinancialYear?.name?.replace(/[^a-zA-Z0-9]/g, '_') || `FY_${selectedYear}`);

      const filename = `Financial_Report_${periodName}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: captureWidth,
          height: captureHeight,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(clone).save();
      document.body.removeChild(container);
      message.success('Financial report PDF exported successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      message.error('Failed to generate PDF');
    } finally {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="advocate-module">
      <OfficePageHeader
        title="Reports"
        subtitle={
          reportType === 'MONTHLY'
            ? `${dayjs().month(selectedMonth - 1).format('MMMM')} ${selectedYear}`
            : `Year ${selectedYear}`
        }
        icon={BarChart2}
        actions={
          <>
            <Tooltip title={isRevealed ? 'Hide amounts' : 'Reveal amounts (PIN required)'}>
              <Button
                className="office-icon-btn"
                icon={isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                onClick={handleToggleEye}
                aria-label={isRevealed ? 'Hide amounts' : 'Reveal amounts'}
              />
            </Tooltip>
            <Button
              icon={<Download size={15} />}
              onClick={handleGeneratePDF}
              loading={isGeneratingPDF}
              disabled={isLoading}
            >
              Export
            </Button>
          </>
        }
      />

      <div className="office-toolbar">
        <Select
          aria-label="Report type"
          value={reportType}
          onChange={setReportType}
          style={{ flex: 1, minWidth: 0 }}
          variant="filled"
        >
          <Option value="MONTHLY">Monthly</Option>
          <Option value="YEARLY">Yearly</Option>
        </Select>

        {reportType === 'MONTHLY' ? (
          <Select
            aria-label="Report month"
            value={selectedMonth}
            onChange={setSelectedMonth}
            style={{ flex: 1, minWidth: 0 }}
            variant="filled"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <Option key={i + 1} value={i + 1}>{dayjs().month(i).format('MMM')}</Option>
            ))}
          </Select>
        ) : null}

        {(reportType === 'MONTHLY' || !activeFinancialYear) ? (
          <DatePicker
            aria-label="Report year"
            picker="year"
            value={dayjs().year(selectedYear)}
            onChange={(date) => setSelectedYear(date ? date.year() : currentYear)}
            style={{ width: 92, flex: 'none' }}
            allowClear={false}
            variant="filled"
          />
        ) : null}
      </div>

      {isLoading ? (
        <ReportSkeleton stats={3} tableRows={6} tableColumns={5} />
      ) : (
        <>
          <OfficeStatGrid
            columns={3}
            items={[
              {
                label: 'Profit',
                value: <PrivacyAmount amount={tasksNetProfit} color="#059669" />,
                icon: TrendingUp,
                tone: 'income',
              },
              {
                label: 'Expenses',
                value: <PrivacyAmount amount={totalGeneralExpense} color="#dc2626" />,
                icon: TrendingDown,
                tone: 'expense',
              },
              {
                label: 'Net',
                value: <PrivacyAmount amount={finalNetProfit} color="#2563eb" />,
                icon: Wallet,
                tone: 'brand',
              },
            ]}
          />

          <div className="office-list-head">
            <h3>Income list</h3>
            <Button
              size="small"
              type="primary"
              icon={<Plus size={14} />}
              onClick={() => {
                setEditingIncome(null);
                setIsIncomeModalVisible(true);
              }}
            >
              Add income
            </Button>
          </div>
          {hasData ? (
            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: 24 }} styles={{ body: { padding: 0 } }}>
              {reportType === 'MONTHLY' ? (
                <Table
                  className="modern-dashboard-table"
                  columns={monthlyColumns}
                  dataSource={monthlyData.tasks}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 'max-content', y: 'calc(100vh - 600px)' }}
                  size="small"
                  summary={() => (
                    <Table.Summary fixed={true}>
                      <Table.Summary.Row style={{ backgroundColor: '#f9fafb' }}>
                        <Table.Summary.Cell index={0} colSpan={6}>
                          <Text strong>Total</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <PrivacyAmount amount={tasksNetProfit} color={Number(tasksNetProfit) >= 0 ? '#16a34a' : '#dc2626'} style={{ fontWeight: 700 }} />
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2}></Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              ) : (
                <Table
                  className="modern-dashboard-table"
                  columns={yearlyColumns}
                  dataSource={yearlyData.months.filter(m => m.taskCount > 0)}
                  rowKey="key"
                  pagination={false}
                  scroll={{ x: 'max-content', y: 'calc(100vh - 600px)', scroll: 'auto' }}
                  size="small"
                  summary={() => (
                    <Table.Summary>
                      <Table.Summary.Row style={{ backgroundColor: '#f9fafb' }}>
                        <Table.Summary.Cell index={0} colSpan={2}>
                          <Text strong>Total</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="center">
                          <Text strong>{yearlyData?.yearlyTotals?.taskCount || 0}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          <PrivacyAmount amount={tasksNetProfit} color={Number(tasksNetProfit) >= 0 ? '#16a34a' : '#dc2626'} style={{ fontWeight: 700 }} />
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              )}
            </Card>
          ) : (
            <Card className="glass-panel" bordered={false} style={{ marginBottom: 24 }}>
              <EmptyState
                icon={FileLineChart}
                title="No tasks found"
                description="There are no completed tasks for the selected period."
              />
            </Card>
          )}

          <div className="office-list-head">
            <h3>General expenses</h3>
            <Button size="small" type="primary" icon={<Plus size={14} />} onClick={() => handleOpenExpenseModal()}>
              Add expense
            </Button>
          </div>

          <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
            <Table
              className="modern-dashboard-table"
              columns={generalExpenseColumns}
              dataSource={generalExpenses || []}
              rowKey="id"
              pagination={false}
              loading={generalExpensesLoading}
              scroll={{ x: 'max-content' }}
              size="small"
              locale={{ emptyText: <div className="office-empty">No general expenses for this period.</div> }}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row style={{ backgroundColor: '#f9fafb' }}>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <PrivacyAmount amount={totalGeneralExpense} color="#dc2626" style={{ fontWeight: 700 }} />
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}></Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </>
      )}

      {/* Add / Edit Income Modal */}
      <AddIncomeModal
        visible={isIncomeModalVisible}
        editingIncome={editingIncome}
        onClose={() => {
          setIsIncomeModalVisible(false);
          setEditingIncome(null);
        }}
      />

      {/* General Expense Modal */}
      <Modal
        title={editingExpense ? "Edit General Expense" : "Add General Expense"}
        open={isExpenseModalVisible}
        onCancel={handleCloseExpenseModal}
        onOk={handleExpenseSubmit}
        confirmLoading={createExpenseMutation.isPending || updateExpenseMutation.isPending}
        okText="Save"
      >
        <Form form={expenseForm} layout="vertical">
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input placeholder="e.g., Office Rent, Internet Bill" />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter the amount' }]}
          >
            <Input type="number" prefix="₹" placeholder="0.00" />
          </Form.Item>
        </Form>
      </Modal>

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

      {/* Hidden Printable Component for PDF Generation */}
      <div style={{ position: 'absolute', left: '-10000px', top: 0, overflow: 'hidden' }}>
        <div ref={reportPrintRef}>
          <FinancialReportPrintLayout
            reportType={reportType}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            activeFinancialYear={activeFinancialYear}
            monthlyData={monthlyData}
            yearlyData={yearlyData}
            generalExpenses={generalExpenses}
            tasksNetProfit={tasksNetProfit}
            totalGeneralExpense={totalGeneralExpense}
            finalNetProfit={finalNetProfit}
          />
        </div>
      </div>
    </div>
  );
}
